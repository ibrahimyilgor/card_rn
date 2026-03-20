import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import { getIdToken, signOut as firebaseSignOut } from "./firebase";

// Fallback to Render.com if env not loaded
const BASE_URL = API_URL || "https://card-p33o.onrender.com";
// const BASE_URL = API_URL || "http://10.0.2.2:5000";

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
			config.headers = config.headers || {};
			const timeZone =
				typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function"
					? Intl.DateTimeFormat().resolvedOptions().timeZone
					: null;
			if (timeZone) {
				config.headers["X-Client-Timezone"] = timeZone;
			}
			config.headers["X-Client-Timezone-Offset-Minutes"] = String(
				-new Date().getTimezoneOffset(),
			);

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

	verifySubscription: (payload) =>
		api.post("/account/subscriptions/verify", payload),

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

	update: async (flashcardId, dataOrFront, backText) => {
		console.log("Updating flashcard", flashcardId, dataOrFront, backText);
		// Desteklenen 2 format:
		// 1. flashcardsAPI.update(id, { frontText, backText, enabled })
		// 2. flashcardsAPI.update(id, frontText, backText)
		const payload =
			typeof dataOrFront === "object" && dataOrFront !== null
				? dataOrFront
				: { frontText: dataOrFront, backText };
		console.log("Payload for update:", payload);
		return await api.put(`/flashcards/${flashcardId}`, payload);
	},

	delete: (flashcardId) => api.delete(`/flashcards/${flashcardId}`),

	// Import deck with flashcards (creates deck and cards in one call)
	importDeck: (title, description, flashcards) =>
		api.post("/flashcards/import-deck", { title, description, flashcards }),
};

// Games API
export const gamesAPI = {
	getCards: (deckId) => api.get(`/games/${deckId}`),

	getHardCards: (deckId) => api.get(`/games/${deckId}/hard`),

	getMultipleChoice: (deckId, direction = "normal") =>
		api.get(`/games/${deckId}/options`, { params: { direction } }),

	validateAnswer: (flashcardId, userAnswer, cardDirection = "normal") =>
		api.post("/games/validate-answer", {
			flashcardId,
			userAnswer,
			cardDirection,
		}),

	updateCardStats: (flashcardId, isCorrect) =>
		api.post("/games/update-stats", { flashcardId, isCorrect }),
};

// Stats API
const getClientTimezone = () => {
	try {
		if (
			typeof Intl !== "undefined" &&
			typeof Intl.DateTimeFormat === "function"
		) {
			return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
		}
		return "UTC";
	} catch {
		return "UTC";
	}
};

const appendClientTimeContext = (params) => {
	params.append("timezone", getClientTimezone());
	params.append(
		"timezoneOffsetMinutes",
		String(-new Date().getTimezoneOffset()),
	);
};

export const statsAPI = {
	getOverview: () => {
		const params = new URLSearchParams();
		appendClientTimeContext(params);
		return api.get(`/stats/overview?${params.toString()}`);
	},

	getCurrentStreak: () => {
		const params = new URLSearchParams();
		appendClientTimeContext(params);
		return api.get(`/stats/streak?${params.toString()}`);
	},

	getDailyActivity: (days = 30) => {
		const params = new URLSearchParams();
		params.append("days", days);
		appendClientTimeContext(params);
		return api.get(`/stats/daily?${params.toString()}`);
	},

	getAllDecks: () => api.get("/stats/decks"),

	getDeckStats: (deckId) => api.get(`/stats/deck/${deckId}`),

	getCardStats: (deckId, sortBy = "error_rate") =>
		api.get(`/stats/cards/${deckId}?sort=${sortBy}`),

	recordSession: (sessionData) => {
		const params = new URLSearchParams();
		appendClientTimeContext(params);
		return api.post(`/stats/session?${params.toString()}`, sessionData);
	},

	getHeatmap: () => {
		const params = new URLSearchParams();
		appendClientTimeContext(params);
		return api.get(`/stats/heatmap?${params.toString()}`);
	},

	getInsights: () => {
		const params = new URLSearchParams();
		appendClientTimeContext(params);
		return api.get(`/stats/insights?${params.toString()}`);
	},

	// New endpoints matching web version
	getFilteredStats: (deckId, startDate, endDate) => {
		const params = new URLSearchParams();
		if (deckId && deckId !== "all") params.append("deckId", deckId);
		if (startDate) params.append("startDate", startDate);
		if (endDate) params.append("endDate", endDate);
		appendClientTimeContext(params);
		return api.get(`/stats/filtered?${params.toString()}`);
	},

	getChartData: (deckId, startDate, endDate) => {
		const params = new URLSearchParams();
		if (deckId && deckId !== "all") params.append("deckId", deckId);
		if (startDate) params.append("startDate", startDate);
		if (endDate) params.append("endDate", endDate);
		appendClientTimeContext(params);
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
