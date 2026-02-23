import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
	useRef,
} from "react";
import { Platform } from "react-native";
import VideoAdModal from "../components/ads/VideoAdModal.js";
import { usePlan } from "./PlanContext";

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
	const { hasAds } = usePlan();
	const [isAdLoaded, setIsAdLoaded] = useState(false);
	const [isAdLoading, setIsAdLoading] = useState(false);

	// Mock implementation - Expo Go'da çalışır, development build'de gerçek reklam eklenecek
	const loadInterstitial = useCallback(async () => {
		if (!hasAds) {
			console.log("[AdContext] Premium/Pro kullanıcı - reklam yüklenmeyecek");
			return;
		}
		console.log(
			"[AdContext] Reklam yükleme simüle ediliyor (Expo Go - native modül yok)",
		);
		setIsAdLoading(true);
		setTimeout(() => {
			setIsAdLoaded(true);
			setIsAdLoading(false);
			console.log("[AdContext] Reklam yüklendi (simüle)");
		}, 1000);
	}, [hasAds]);

	const showInterstitial = useCallback(async () => {
		if (!hasAds) {
			console.log("[AdContext] Premium/Pro kullanıcı - reklam gösterilmeyecek");
			return false;
		}
		console.log("[AdContext] Reklam gösterimi simüle ediliyor");
		setIsAdLoaded(false);
		// Yeni reklam yükle
		setTimeout(() => loadInterstitial(), 500);
		return true;
	}, [hasAds, loadInterstitial]);

	useEffect(() => {
		if (hasAds) {
			loadInterstitial();
		}
	}, [hasAds, loadInterstitial]);

	// Video ad modal state and controller
	const [videoAdVisible, setVideoAdVisible] = useState(false);
	const [videoAdSource, setVideoAdSource] = useState(null);
	const videoAdResolveRef = useRef(null);

	const showVideoAd = useCallback(() => {
		if (!hasAds) {
			console.log(
				"[AdContext] Premium/Pro kullanıcı - video reklam gösterilmeyecek",
			);
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			try {
				const ads = [
					require("../../assets/videos/ads/apple.mp4"),
					require("../../assets/videos/ads/thy.mp4"),
				];
				const src = ads[Math.floor(Math.random() * ads.length)];
				console.log("[AdContext] showVideoAd called, selected src:", src);
				videoAdResolveRef.current = resolve;
				setVideoAdSource(src);
				setVideoAdVisible(true);
			} catch (e) {
				console.error("Error loading video ad source:", e);
				resolve();
			}
		});
	}, [hasAds]);

	const handleVideoAdClose = () => {
		console.log("[AdContext] handleVideoAdClose called");
		setVideoAdVisible(false);
		setVideoAdSource(null);
		if (videoAdResolveRef.current) {
			videoAdResolveRef.current();
			videoAdResolveRef.current = null;
		}
	};

	const value = {
		isAdLoaded,
		isAdLoading,
		showInterstitial,
		showVideoAd,
		hasAds,
	};

	return (
		<AdContext.Provider value={value}>
			{children}
			<VideoAdModal
				visible={videoAdVisible}
				source={videoAdSource}
				onClose={handleVideoAdClose}
			/>
		</AdContext.Provider>
	);
};

export default AdContext;
