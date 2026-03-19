import { Platform } from "react-native";
import {
	initConnection,
	endConnection,
	getSubscriptions,
	requestSubscription,
	getAvailablePurchases,
	finishTransaction,
	flushFailedPurchasesCachedAsPendingAndroid,
} from "react-native-iap";
import { accountAPI } from "./api";

export const SUBSCRIPTION_PRODUCT_MAP = {
	pro: "pro_monthly",
	premium: "premium_monthly",
};

const SUBSCRIPTION_SKUS = Object.values(SUBSCRIPTION_PRODUCT_MAP);

const extractOfferToken = (product) => {
	if (!product) return null;

	const details =
		product.subscriptionOfferDetailsAndroid ||
		product.subscriptionOfferDetails ||
		[];

	if (!Array.isArray(details) || details.length === 0) {
		return null;
	}

	const preferredOffer =
		details.find((item) =>
			String(item?.basePlanId || "")
				.toLowerCase()
				.includes("monthly"),
		) || details[0];

	return preferredOffer?.offerToken || null;
};

const resolveProductId = (purchase) => {
	if (!purchase) return null;
	if (purchase.productId) return purchase.productId;
	if (Array.isArray(purchase.productIds) && purchase.productIds.length > 0) {
		return purchase.productIds[0];
	}
	return null;
};

const resolvePurchaseToken = (purchase) => {
	if (!purchase) return null;
	return (
		purchase.purchaseToken ||
		purchase.purchaseTokenAndroid ||
		purchase.transactionId ||
		null
	);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryWithBackoff = async (
	action,
	{
		retries = 3,
		initialDelayMs = 500,
		maxDelayMs = 3000,
		shouldRetry = () => true,
	} = {},
) => {
	let lastError;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await action(attempt);
		} catch (error) {
			lastError = error;
			const canRetry = attempt < retries && shouldRetry(error);
			if (!canRetry) break;

			const delay = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
			await sleep(delay);
		}
	}

	throw lastError;
};

export const initBilling = async () => {
	if (Platform.OS !== "android") return false;
	const connected = await initConnection();
	if (connected) {
		await flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});
	}
	return connected;
};

export const closeBilling = async () => {
	if (Platform.OS !== "android") return;
	try {
		await endConnection();
	} catch {
		// ignore teardown errors
	}
};

export const getSubscriptionProducts = async () => {
	if (Platform.OS !== "android") return [];
	return getSubscriptions({ skus: SUBSCRIPTION_SKUS });
};

export const purchasePlanOnAndroid = async (
	targetPlanCode,
	availableProducts = [],
) => {
	if (Platform.OS !== "android") {
		throw new Error("Subscriptions are only enabled on Android for now.");
	}

	const sku = SUBSCRIPTION_PRODUCT_MAP[targetPlanCode];
	if (!sku) {
		throw new Error("Invalid subscription plan selected.");
	}

	const productFromList = Array.isArray(availableProducts)
		? availableProducts.find((item) => item?.productId === sku)
		: null;
	const product =
		productFromList || (await getSubscriptions({ skus: [sku] }))?.[0];
	const offerToken = extractOfferToken(product);

	if (!offerToken) {
		throw new Error(
			"Google Play subscription offer bulunamadı (offerToken missing).",
		);
	}

	return requestSubscription({
		sku,
		subscriptionOffers: [{ sku, offerToken }],
		andDangerouslyFinishTransactionAutomaticallyIOS: false,
	});
};

export const verifyPurchaseWithBackend = async (purchase) => {
	const productId = resolveProductId(purchase);
	const purchaseToken = resolvePurchaseToken(purchase);

	if (!productId || !purchaseToken) {
		throw new Error("Purchase verification payload is incomplete.");
	}

	const payload = {
		platform: "google_play",
		productId,
		purchaseToken,
		subscriptionState: "active",
		autoRenewing: purchase.autoRenewingAndroid ?? true,
		currentPeriodEnd: null,
		rawPayload: {
			source: "react-native-iap",
			orderId: purchase.orderId,
			packageNameAndroid: purchase.packageNameAndroid,
			transactionDate: purchase.transactionDate,
		},
	};

	let response;
	try {
		response = await accountAPI.verifySubscription(payload);
	} catch (error) {
		const backendCode = error?.response?.data?.code;
		const backendMessage = error?.response?.data?.error;
		const err = new Error(
			backendMessage || error?.message || "subscription_verify_failed",
		);
		err.code = backendCode || error?.code || "SUBSCRIPTION_VERIFY_FAILED";
		err.backendCode = backendCode || null;
		throw err;
	}

	try {
		await finishTransaction({
			purchase,
			isConsumable: false,
		});
	} catch {
		// ignore finish errors, backend verification already succeeded
	}

	return response;
};

export const syncAndroidEntitlements = async ({
	maxRetries = 3,
	verifyRetries = 2,
	onFirstSuccess,
} = {}) => {
	if (Platform.OS !== "android") {
		return { hasSuccess: false, results: [] };
	}

	const fetchRelevantPurchases = async () => {
		const purchases = await getAvailablePurchases();
		const relevantPurchases = purchases.filter((purchase) => {
			const productId = resolveProductId(purchase);
			return productId && SUBSCRIPTION_SKUS.includes(productId);
		});

		if (relevantPurchases.length === 0) {
			const err = new Error("No subscription purchases available");
			err.code = "EMPTY_PURCHASES";
			throw err;
		}

		return relevantPurchases;
	};

	let relevantPurchases = [];
	let fetchErrorCode = null;
	try {
		relevantPurchases = await retryWithBackoff(fetchRelevantPurchases, {
			retries: Math.max(1, maxRetries),
			initialDelayMs: 600,
			maxDelayMs: 3500,
		});
	} catch (error) {
		fetchErrorCode = error?.code || "ENTITLEMENT_SYNC_FETCH_FAILED";
		return {
			hasSuccess: false,
			results: [
				{
					ok: false,
					error: error?.message || "sync_failed",
					code: fetchErrorCode,
					backendCode: null,
				},
			],
		};
	}

	const results = [];
	let hasSuccess = false;
	let firstSuccessHandled = false;

	for (const purchase of relevantPurchases) {
		try {
			const result = await retryWithBackoff(
				() => verifyPurchaseWithBackend(purchase),
				{
					retries: Math.max(1, verifyRetries),
					initialDelayMs: 500,
					maxDelayMs: 2500,
				},
			);

			hasSuccess = true;
			results.push({ ok: true, result, code: null, backendCode: null });

			if (!firstSuccessHandled && typeof onFirstSuccess === "function") {
				firstSuccessHandled = true;
				try {
					onFirstSuccess(result);
				} catch {
					// UI callback errors must not break sync flow
				}
			}
		} catch (error) {
			results.push({
				ok: false,
				error: error?.message || "sync_failed",
				code: error?.code || "ENTITLEMENT_VERIFY_FAILED",
				backendCode: error?.backendCode || null,
			});
		}
	}

	return {
		hasSuccess,
		results,
	};
};
