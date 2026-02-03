import React, {
	createContext,
	useState,
	useCallback,
	useContext,
	useEffect,
} from "react";
import { accountAPI } from "../services/api";

export const PlanContext = createContext();

export const PlanProvider = ({ children, user }) => {
	// Plan information
	const [planInfo, setPlanInfo] = useState(null);
	// Limit status information
	const [limitStatus, setLimitStatus] = useState(null);
	// Loading state
	const [loading, setLoading] = useState(true);
	// Error state
	const [error, setError] = useState(null);

	// Fetch plan info
	const fetchPlanInfo = useCallback(async () => {
		const maxAttempts = 3;
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				if (attempt > 1) {
					console.log(`[Plan] Retrying fetchPlanInfo (attempt ${attempt}/${maxAttempts})`);
					await new Promise((r) => setTimeout(r, 1000 * attempt));
				}
				const response = await accountAPI.getCurrentPlan();
				setPlanInfo(response.data);
				return response.data;
			} catch (err) {
				console.error(`Failed to fetch plan info (attempt ${attempt}):`, err?.message || err);
				setError(err);
				if (attempt === maxAttempts) return null;
			}
		}
	}, []);

	// Fetch limit status
	const fetchLimitStatus = useCallback(async () => {
		const maxAttempts = 3;
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				if (attempt > 1) {
					console.log(`[Plan] Retrying fetchLimitStatus (attempt ${attempt}/${maxAttempts})`);
					await new Promise((r) => setTimeout(r, 1000 * attempt));
				}
				const response = await accountAPI.getLimitStatus();
				setLimitStatus(response.data);
				return response.data;
			} catch (err) {
				console.error(`Failed to fetch limit status (attempt ${attempt}):`, err?.message || err);
				setError(err);
				if (attempt === maxAttempts) return null;
			}
		}
	}, []);

	// Refresh all plan data
	const refreshPlanData = useCallback(async () => {
		setLoading(true);
		try {
			await Promise.all([fetchPlanInfo(), fetchLimitStatus()]);
		} finally {
			setLoading(false);
		}
	}, [fetchPlanInfo, fetchLimitStatus]);

	// Fetch plan data when user is available
	useEffect(() => {
		if (user) {
			refreshPlanData();
		} else {
			setPlanInfo(null);
			setLimitStatus(null);
			setLoading(false);
		}
	}, [user, refreshPlanData]);

	// Computed properties
	const canPlay = limitStatus?.canPlay ?? true;
	const canCreateDeck = limitStatus?.canCreateDeck ?? true;
	const canCreateFlashcard = limitStatus?.canCreateFlashcard ?? true;
	const hasAds = limitStatus?.hasAds ?? false;
	const advancedStats = limitStatus?.advancedStats ?? false;
	const planCode = limitStatus?.planCode ?? "free";

	// Current usage
	const currentDecks = limitStatus?.currentDecks ?? 0;
	const currentFlashcards = limitStatus?.currentFlashcards ?? 0;
	const maxDecks = limitStatus?.maxDecks;
	const maxFlashcards = limitStatus?.maxFlashcards;
	const deckOverage = limitStatus?.deckOverage ?? 0;
	const flashcardOverage = limitStatus?.flashcardOverage ?? 0;

	// Check if user is over limit
	const isOverLimit = deckOverage > 0 || flashcardOverage > 0;

	// Generate detailed limit message
	const getLimitMessage = useCallback(
		(t) => {
			if (!isOverLimit) return null;

			let message = "";
			if (deckOverage > 0) {
				message +=
					(t?.("deck_limit_exceeded") ||
						`Deck limit is ${maxDecks}, you have ${currentDecks}. Delete ${deckOverage} deck(s).`) +
					"\n";
			}
			if (flashcardOverage > 0) {
				message +=
					(t?.("flashcard_limit_exceeded") ||
						`Flashcard limit is ${maxFlashcards}, you have ${currentFlashcards}. Delete ${flashcardOverage} flashcard(s).`) +
					"\n";
			}
			message += t?.("or_upgrade_plan") || "Or upgrade your plan.";
			return message;
		},
		[
			isOverLimit,
			deckOverage,
			flashcardOverage,
			maxDecks,
			currentDecks,
			maxFlashcards,
			currentFlashcards,
		],
	);

	// Check if deck creation limit reached
	const getDeckLimitMessage = useCallback(
		(t) => {
			if (canCreateDeck) return null;
			return (
				t?.("deck_limit_reached") ||
				`You have reached your deck limit (${currentDecks}/${maxDecks}). Upgrade your plan to create more decks.`
			);
		},
		[canCreateDeck, currentDecks, maxDecks],
	);

	// Check if flashcard creation limit reached
	const getFlashcardLimitMessage = useCallback(
		(t) => {
			if (canCreateFlashcard) return null;
			return (
				t?.("flashcard_limit_reached") ||
				`You have reached your flashcard limit (${currentFlashcards}/${maxFlashcards}). Upgrade your plan to create more flashcards.`
			);
		},
		[canCreateFlashcard, currentFlashcards, maxFlashcards],
	);

	return (
		<PlanContext.Provider
			value={{
				// Plan info
				planInfo,
				planCode,
				// Limit status
				limitStatus,
				currentDecks,
				currentFlashcards,
				maxDecks,
				maxFlashcards,
				deckOverage,
				flashcardOverage,
				// Computed flags
				canPlay,
				canCreateDeck,
				canCreateFlashcard,
				hasAds,
				advancedStats,
				isOverLimit,
				// Utilities
				getLimitMessage,
				getDeckLimitMessage,
				getFlashcardLimitMessage,
				refreshPlanData,
				fetchLimitStatus,
				// State
				loading,
				error,
			}}
		>
			{children}
		</PlanContext.Provider>
	);
};

// Custom hook for using plan context
export const usePlan = () => {
	const context = useContext(PlanContext);
	if (!context) {
		throw new Error("usePlan must be used within a PlanProvider");
	}
	return context;
};

export default PlanContext;
