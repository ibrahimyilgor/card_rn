import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { accountAPI } from "../services/api";

const PlanContext = createContext(null);

export const usePlan = () => {
	const context = useContext(PlanContext);
	if (!context) {
		throw new Error("usePlan must be used within a PlanProvider");
	}
	return context;
};

export const PlanProvider = ({ children }) => {
	const [planCode, setPlanCode] = useState("free");
	const [hasAds, setHasAds] = useState(true); // Default: show ads (safe fallback)
	const [advancedStats, setAdvancedStats] = useState(false);
	const [canCreateDeck, setCanCreateDeck] = useState(true);
	const [canCreateFlashcard, setCanCreateFlashcard] = useState(true);
	const [canPlay, setCanPlay] = useState(true);
	const [maxDecks, setMaxDecks] = useState(3);
	const [maxFlashcards, setMaxFlashcards] = useState(100);
	const [currentDecks, setCurrentDecks] = useState(0);
	const [currentFlashcards, setCurrentFlashcards] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const fetchedRef = useRef(false);

	const fetchLimitStatus = useCallback(async () => {
		try {
			const response = await accountAPI.getLimitStatus();
			const data = response.data;

			if (data) {
				setPlanCode(data.planCode || "free");
				setHasAds(data.hasAds !== undefined ? data.hasAds : true);
				setAdvancedStats(data.advancedStats || false);
				setCanCreateDeck(data.canCreateDeck !== undefined ? data.canCreateDeck : true);
				setCanCreateFlashcard(data.canCreateFlashcard !== undefined ? data.canCreateFlashcard : true);
				setCanPlay(data.canPlay !== undefined ? data.canPlay : true);
				setMaxDecks(data.maxDecks);
				setMaxFlashcards(data.maxFlashcards);
				setCurrentDecks(data.currentDecks || 0);
				setCurrentFlashcards(data.currentFlashcards || 0);

				console.log("[PlanContext] Plan loaded:", data.planCode, "| hasAds:", data.hasAds);
			}
		} catch (error) {
			console.warn("[PlanContext] Failed to fetch limit status, defaulting to free plan:", error.message);
			// Safe defaults: treat as free plan (show ads)
			setPlanCode("free");
			setHasAds(true);
			setAdvancedStats(false);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Initial fetch - triggered once the API is ready (auth token set)
	useEffect(() => {
		// Small delay to ensure auth token is available after login
		const timer = setTimeout(() => {
			if (!fetchedRef.current) {
				fetchedRef.current = true;
				fetchLimitStatus();
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [fetchLimitStatus]);

	// Public method to force refresh (e.g., after plan change, after login)
	const refreshPlan = useCallback(async () => {
		console.log("[PlanContext] Refreshing plan...");
		await fetchLimitStatus();
	}, [fetchLimitStatus]);

	const value = {
		planCode,
		hasAds,
		advancedStats,
		canCreateDeck,
		canCreateFlashcard,
		canPlay,
		maxDecks,
		maxFlashcards,
		currentDecks,
		currentFlashcards,
		isLoading,
		refreshPlan,
	};

	return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export default PlanContext;
