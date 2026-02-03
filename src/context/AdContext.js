import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import { Platform } from "react-native";

const AdContext = createContext(null);

// Test Ad Unit IDs - Development build hazır olunca gerçek implementasyona geçilecek
const INTERSTITIAL_AD_UNIT_ID = Platform.select({
	android: "ca-app-pub-3940256099942544/1033173712",
	ios: "ca-app-pub-3940256099942544/4411468910",
});

export const useAds = () => {
	const context = useContext(AdContext);
	if (!context) {
		throw new Error("useAds must be used within an AdProvider");
	}
	return context;
};

export const AdProvider = ({ children }) => {
	const [isAdLoaded, setIsAdLoaded] = useState(false);
	const [isAdLoading, setIsAdLoading] = useState(false);

	// Mock implementation - Expo Go'da çalışır, development build'de gerçek reklam eklenecek
	const loadInterstitial = useCallback(async () => {
		console.log(
			"[AdContext] Reklam yükleme simüle ediliyor (Expo Go - native modül yok)",
		);
		setIsAdLoading(true);
		setTimeout(() => {
			setIsAdLoaded(true);
			setIsAdLoading(false);
			console.log("[AdContext] Reklam yüklendi (simüle)");
		}, 1000);
	}, []);

	const showInterstitial = useCallback(async () => {
		console.log("[AdContext] Reklam gösterimi simüle ediliyor");
		setIsAdLoaded(false);
		// Yeni reklam yükle
		setTimeout(() => loadInterstitial(), 500);
		return true;
	}, [loadInterstitial]);

	useEffect(() => {
		loadInterstitial();
	}, [loadInterstitial]);

	const value = {
		isAdLoaded,
		isAdLoading,
		showInterstitial,
	};

	return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
};

export default AdContext;
