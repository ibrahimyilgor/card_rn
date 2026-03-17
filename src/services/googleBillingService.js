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

export const purchasePlanOnAndroid = async (targetPlanCode) => {
	if (Platform.OS !== "android") {
		throw new Error("Subscriptions are only enabled on Android for now.");
	}

	const sku = SUBSCRIPTION_PRODUCT_MAP[targetPlanCode];
	if (!sku) {
		throw new Error("Invalid subscription plan selected.");
	}

	return requestSubscription({
		sku,
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

	const response = await accountAPI.verifySubscription(payload);

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

export const syncAndroidEntitlements = async () => {
	if (Platform.OS !== "android") return [];

	const purchases = await getAvailablePurchases();
	const relevantPurchases = purchases.filter((purchase) => {
		const productId = resolveProductId(purchase);
		return productId && SUBSCRIPTION_SKUS.includes(productId);
	});

	const results = [];
	for (const purchase of relevantPurchases) {
		try {
			const result = await verifyPurchaseWithBackend(purchase);
			results.push({ ok: true, result });
		} catch (error) {
			results.push({ ok: false, error: error?.message || "sync_failed" });
		}
	}

	return results;
};
