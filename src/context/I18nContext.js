import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

// Import locale files
import en from "../locales/en.json";
import tr from "../locales/tr.json";

const I18nContext = createContext();

const LANGUAGE_STORAGE_KEY = "language";

const locales = {
	en,
	tr,
};

const supportedLanguages = [
	{ code: "en", name: "English", nativeName: "English" },
	{ code: "tr", name: "Turkish", nativeName: "Türkçe" },
];

export const I18nProvider = ({ children }) => {
	const [language, setLanguageState] = useState("en");
	const [isLoading, setIsLoading] = useState(true);

	// Load language from storage on mount
	useEffect(() => {
		const loadLanguage = async () => {
			try {
				const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
				if (savedLanguage && locales[savedLanguage]) {
					setLanguageState(savedLanguage);
				} else {
					// Use device locale if no saved language
					// Use getLocales() for better cross-platform support
					const localesArray = Localization.getLocales?.() || [];
					const deviceLocale = localesArray[0]?.languageCode || "en";
					if (locales[deviceLocale]) {
						setLanguageState(deviceLocale);
					}
				}
			} catch (error) {
				console.error("Error loading language:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadLanguage();
	}, []);

	// Update language and save to storage
	const setLanguage = useCallback(async (newLanguage) => {
		if (locales[newLanguage]) {
			try {
				setLanguageState(newLanguage);
				await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
			} catch (error) {
				console.error("Error saving language:", error);
			}
		}
	}, []);

	// Sync language from database (call after login)
	const syncFromDatabase = useCallback(async (dbLanguage) => {
		if (dbLanguage && locales[dbLanguage]) {
			setLanguageState(dbLanguage);
			await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, dbLanguage);
		}
	}, []);

	// Translation function
	const t = useCallback(
		(key, params = {}) => {
			const keys = key.split(".");
			let translation = locales[language];

			for (const k of keys) {
				if (translation && translation[k] !== undefined) {
					translation = translation[k];
				} else {
					// Fallback to English
					translation = locales.en;
					for (const fallbackKey of keys) {
						if (translation && translation[fallbackKey] !== undefined) {
							translation = translation[fallbackKey];
						} else {
							return key; // Return key if translation not found
						}
					}
					break;
				}
			}

			// Replace parameters in translation string
			if (typeof translation === "string") {
				return Object.entries(params).reduce((str, [paramKey, value]) => {
					return str.replace(new RegExp(`{{${paramKey}}}`, "g"), value);
				}, translation);
			}

			return translation || key;
		},
		[language]
	);

	const value = {
		language,
		setLanguage,
		syncFromDatabase,
		t,
		isLoading,
		supportedLanguages,
	};

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
	const context = useContext(I18nContext);
	if (context === undefined) {
		throw new Error("useI18n must be used within an I18nProvider");
	}
	return context;
};

export default I18nContext;
