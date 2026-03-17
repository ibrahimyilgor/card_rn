import React, {
	createContext,
	useContext,
	useCallback,
	useRef,
	useState,
} from "react";
import PlansAdModal from "../components/ads/PlansAdModal";
import { navigateToPlans } from "../navigation/navigationService";

const AdContext = createContext(null);

export const useAds = () => {
	const context = useContext(AdContext);
	if (!context) {
		throw new Error("useAds must be used within an AdProvider");
	}
	return context;
};

export const AdProvider = ({ children }) => {
	const [isPlansAdVisible, setIsPlansAdVisible] = useState(false);
	const resolverRef = useRef(null);
	const upgradedFromAdRef = useRef(false);

	const closePlansAd = useCallback(() => {
		setIsPlansAdVisible(false);
		if (resolverRef.current) {
			resolverRef.current({ upgraded: upgradedFromAdRef.current });
			resolverRef.current = null;
		}
		upgradedFromAdRef.current = false;
	}, []);

	const handleUpgradeFromAd = useCallback(() => {
		upgradedFromAdRef.current = true;
		navigateToPlans();
	}, []);

	const showInterstitial = useCallback(async () => {
		if (isPlansAdVisible) return { upgraded: false };

		upgradedFromAdRef.current = false;

		return new Promise((resolve) => {
			resolverRef.current = resolve;
			setIsPlansAdVisible(true);
		});
	}, [isPlansAdVisible]);

	const showVideoAd = useCallback(() => {
		if (isPlansAdVisible) return Promise.resolve({ upgraded: false });

		upgradedFromAdRef.current = false;

		return new Promise((resolve) => {
			resolverRef.current = resolve;
			setIsPlansAdVisible(true);
		});
	}, [isPlansAdVisible]);

	const value = {
		isAdLoaded: true,
		isAdLoading: false,
		showInterstitial,
		showVideoAd,
		hasAds: true,
	};

	return (
		<AdContext.Provider value={value}>
			{children}
			<PlansAdModal
				visible={isPlansAdVisible}
				onClose={closePlansAd}
				onUpgrade={handleUpgradeFromAd}
			/>
		</AdContext.Provider>
	);
};

export default AdContext;
