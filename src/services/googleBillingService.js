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
	if (Platform.OS !== "android") {
		console.log("[GoogleBilling] Not Android, returning empty products");
		return [];
	}
	try {
		const products = await getSubscriptions({ skus: SUBSCRIPTION_SKUS });
		console.log("[GoogleBilling] getSubscriptions returned:", products);
		return products || [];
	} catch (error) {
		console.error("[GoogleBilling] getSubscriptions error:", error);
		return [];
	}
};

export const getFormattedPriceForProduct = (product) => {
	if (!product) return "$0";

	// Try to use localizedPrice first (e.g., "$9.99", "€9,99", etc.)
	if (product.localizedPrice) {
		console.log(
			"[GoogleBilling] Found localizedPrice:",
			product.localizedPrice,
		);
		return product.localizedPrice;
	}

	// Try price field
	if (product.price) {
		// If price is already formatted with currency symbol, return as-is
		if (product.price.match(/^[$€¥£]/)) {
			console.log(
				"[GoogleBilling] Found price with currency symbol:",
				product.price,
			);
			return product.price;
		}
		// Otherwise, prepend $ (default for most currencies)
		console.log("[GoogleBilling] Found price, formatting:", product.price);
		return `$${product.price}`;
	}

	// For Google Play subscriptions, check subscriptionOfferDetails
	// This is where the actual pricing information is stored
	if (product.subscriptionOfferDetails) {
		console.log(
			"[GoogleBilling] Checking subscriptionOfferDetails for",
			product.productId,
		);

		// Handle if it's an array or object structure
		const offerDetailsArray = Array.isArray(product.subscriptionOfferDetails)
			? product.subscriptionOfferDetails
			: [product.subscriptionOfferDetails];

		for (let i = 0; i < offerDetailsArray.length; i++) {
			const offerDetails = offerDetailsArray[i];
			console.log(
				`[GoogleBilling] Offer ${i}:`,
				JSON.stringify(offerDetails, null, 2),
			);

			if (!offerDetails) continue;

			// pricingPhases might be an array or an object
			let pricingPhasesArray = [];

			if (Array.isArray(offerDetails.pricingPhases)) {
				pricingPhasesArray = offerDetails.pricingPhases;
			} else if (
				typeof offerDetails.pricingPhases === "object" &&
				offerDetails.pricingPhases !== null
			) {
				console.log(
					"[GoogleBilling] pricingPhases is object, keys:",
					Object.keys(offerDetails.pricingPhases),
				);
				// If it's an object, check for common patterns
				if (offerDetails.pricingPhases.pricingPhaseList) {
					pricingPhasesArray = offerDetails.pricingPhases.pricingPhaseList;
				} else {
					// Try to get values as array
					pricingPhasesArray = Object.values(offerDetails.pricingPhases);
				}
			}

			console.log("[GoogleBilling] pricingPhasesArray:", pricingPhasesArray);

			if (pricingPhasesArray.length > 0) {
				const pricingPhase = pricingPhasesArray[0];
				console.log(
					"[GoogleBilling] First pricing phase:",
					JSON.stringify(pricingPhase, null, 2),
				);

				const formattedPrice = pricingPhase?.formattedPrice;
				if (formattedPrice) {
					console.log("[GoogleBilling] Found formattedPrice:", formattedPrice);
					return formattedPrice;
				}
			}
		}
	}

	// Default to free if no price found
	console.warn(
		"[GoogleBilling] No price found for product:",
		product?.productId,
	);
	return "$0";
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
