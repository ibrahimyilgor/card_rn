import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import { getIdToken, signOut as firebaseSignOut } from "./firebase";

// Fallback to Render.com if env not loaded
const BASE_URL = API_URL || "https://card-p33o.onrender.com";

// Debug: Log the API URL being used
console.log("[API] Using BASE_URL:", BASE_URL);
console.log("[API] API_URL from env:", API_URL);

// Create axios instance
const api = axios.create({
	baseURL: BASE_URL,
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

// Request interceptor to add Firebase auth token
api.interceptors.request.use(
	async (config) => {
		try {
			const token = await getIdToken();
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		} catch (error) {
			console.error("Error getting Firebase token:", error);
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Response interceptor to handle errors
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		// Handle 401 Unauthorized - Firebase token expired or invalid
		if (error.response?.status === 401) {
			// Clear local storage and let the app redirect to login
			await AsyncStorage.multiRemove(["accountId"]);
		}

		// Handle 403 Forbidden - Email not verified
		if (
			error.response?.status === 403 &&
			error.response?.data?.code === "EMAIL_NOT_VERIFIED"
		) {
			// The app should show email verification screen
			console.log("Email not verified");
		}

		return Promise.reject(error);
	},
);

// Auth API - now using Firebase
export const authAPI = {
	// Sync Firebase user with backend
	sync: (displayName) => api.post("/auth/sync", { displayName }),

	// Get current user info from backend
	me: () => api.get("/auth/me"),

	// Delete account
	deleteAccount: () => api.delete("/auth/account"),
};

// Account API
export const accountAPI = {
	getMe: () => api.get("/account/me"),

	getProfile: () => api.get("/account/profile"),

	changePassword: (oldPassword, newPassword, newPasswordRepeat) =>
		api.post("/account/change-password", {
			oldPassword,
			newPassword,
			newPasswordRepeat,
		}),

	getPreferences: () => api.get("/account/profile"),

	updateLanguage: (language) =>
		api.put("/account/profile/language", { language }),

	updateTheme: (theme_preference) =>
		api.put("/account/profile/theme", { theme_preference }),

	updateSoundEffects: (sound_effects_enabled) =>
		api.put("/account/profile/sound", { sound_effects_enabled }),

	updateKeyboardShortcuts: (keyboard_shortcuts_enabled) =>
		api.put("/account/profile/keyboard", { keyboard_shortcuts_enabled }),

	getPlans: () => api.get("/account/plans"),

	getCurrentPlan: () => api.get("/account/my-plan"),

	getLimitStatus: () => api.get("/account/limit-status"),

	deleteAccount: () => api.delete("/account/delete"),

	resetStatistics: () => api.delete("/stats/reset"),
};

// Decks API
export const decksAPI = {
	getAll: (accountId) => api.get(`/decks/${accountId}`),

	create: (accountId, title, description) =>
		api.post("/decks/create", { title, description }),

	update: (deckId, title, description) =>
		api.put(`/decks/${deckId}`, { title, description }),

	delete: (deckId) => api.delete(`/decks/${deckId}`),

	getSettings: (deckId) => api.get(`/decks/settings/${deckId}`),

	updateSettings: (deckId, settings) =>
		api.put(`/decks/settings/${deckId}`, settings),

	getFlashcards: (deckId) => api.get(`/decks/flashcards/${deckId}`),
};

// Flashcards API
export const flashcardsAPI = {
	getByDeck: (deckId) => api.get(`/flashcards/${deckId}`),

	create: (deckId, frontText, backText) =>
		api.post("/flashcards/create", { deckId, frontText, backText }),

	update: (flashcardId, frontText, backText) =>
		api.put(`/flashcards/${flashcardId}`, { frontText, backText }),

	delete: (flashcardId) => api.delete(`/flashcards/${flashcardId}`),

	// Import deck with flashcards (creates deck and cards in one call)
	importDeck: (title, description, flashcards) =>
		api.post("/flashcards/import-deck", { title, description, flashcards }),
};

// Games API
export const gamesAPI = {
	getCards: (deckId) => api.get(`/games/${deckId}`),

	getHardCards: (deckId) => api.get(`/games/${deckId}/hard`),

	getMultipleChoice: (deckId) => api.get(`/games/${deckId}/options`),

	validateAnswer: (flashcardId, userAnswer, correctAnswer) =>
		api.post("/games/validate-answer", {
			flashcardId,
			userAnswer,
			correctAnswer,
		}),

	updateCardStats: (flashcardId, isCorrect) =>
		api.post("/games/update-stats", { flashcardId, isCorrect }),
};

// Stats API
export const statsAPI = {
	getOverview: () => api.get("/stats/overview"),

	getDailyActivity: (days = 30) => api.get(`/stats/daily?days=${days}`),

	getAllDecks: () => api.get("/stats/decks"),

	getDeckStats: (deckId) => api.get(`/stats/deck/${deckId}`),

	getCardStats: (deckId, sortBy = "error_rate") =>
		api.get(`/stats/cards/${deckId}?sort=${sortBy}`),

	recordSession: (sessionData) => api.post("/stats/session", sessionData),

	getHeatmap: () => api.get("/stats/heatmap"),

	getInsights: () => api.get("/stats/insights"),

	// New endpoints matching web version
	getFilteredStats: (deckId, startDate, endDate) => {
		const params = new URLSearchParams();
		if (deckId && deckId !== "all") params.append("deckId", deckId);
		if (startDate) params.append("startDate", startDate);
		if (endDate) params.append("endDate", endDate);
		return api.get(`/stats/filtered?${params.toString()}`);
	},

	getChartData: (deckId, startDate, endDate) => {
		const params = new URLSearchParams();
		if (deckId && deckId !== "all") params.append("deckId", deckId);
		if (startDate) params.append("startDate", startDate);
		if (endDate) params.append("endDate", endDate);
		return api.get(`/stats/chart-data?${params.toString()}`);
	},

	getCardsTable: (deckId, sortBy = "times_played", sortOrder = "desc") => {
		const params = new URLSearchParams();
		if (deckId && deckId !== "all") params.append("deckId", deckId);
		params.append("sort", sortBy);
		params.append("order", sortOrder);
		return api.get(`/stats/cards-table?${params.toString()}`);
	},
};

// Achievements API
export const achievementsAPI = {
	getAll: () => api.get("/achievements"),

	checkAndAward: (gameData) => api.post("/achievements/check", gameData),
};

// Helper functions for auth state
export const authHelpers = {
	getAccountId: () => AsyncStorage.getItem("accountId"),

	setAccountId: async (accountId) => {
		await AsyncStorage.setItem("accountId", accountId.toString());
	},

	clearAuth: async () => {
		await AsyncStorage.multiRemove(["accountId"]);
	},

	// Sync Firebase user with backend and store accountId
	syncWithBackend: async (displayName) => {
		try {
			const response = await authAPI.sync(displayName);
			const { accountId } = response.data;
			if (accountId) {
				await AsyncStorage.setItem("accountId", accountId.toString());
			}
			return response.data;
		} catch (error) {
			console.error("Failed to sync with backend:", error);
			throw error;
		}
	},
};

export default api;
