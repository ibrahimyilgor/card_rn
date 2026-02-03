import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, shadows, chartColors } from "../styles/theme";

const ThemeContext = createContext();

const THEME_STORAGE_KEY = "theme";

export const ThemeProvider = ({ children }) => {
	const systemColorScheme = useColorScheme();
	const [mode, setMode] = useState("dark");
	const [isLoading, setIsLoading] = useState(true);

	// Load theme from storage on mount
	useEffect(() => {
		const loadTheme = async () => {
			try {
				const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
				if (savedTheme) {
					setMode(savedTheme);
				} else {
					// Use system preference if no saved theme
					setMode(systemColorScheme || "dark");
				}
			} catch (error) {
				console.error("Error loading theme:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadTheme();
	}, [systemColorScheme]);

	// Update theme and save to storage
	const setTheme = useCallback(async (newMode) => {
		try {
			setMode(newMode);
			await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
		} catch (error) {
			console.error("Error saving theme:", error);
		}
	}, []);

	// Sync theme from database (call after login)
	const syncFromDatabase = useCallback(async (themePreference) => {
		if (
			themePreference &&
			(themePreference === "dark" || themePreference === "light")
		) {
			setMode(themePreference);
			await AsyncStorage.setItem(THEME_STORAGE_KEY, themePreference);
		}
	}, []);

	// Toggle between light and dark
	const toggleTheme = useCallback(() => {
		const newMode = mode === "dark" ? "light" : "dark";
		setTheme(newMode);
	}, [mode, setTheme]);

	// Get current theme object
	const theme = mode === "dark" ? darkTheme : lightTheme;
	const isDark = mode === "dark";

	// Get shadow styles for current theme
	const themeShadows = isDark ? shadows.dark : shadows.light;

	// Get chart colors for current theme
	const themeChartColors = isDark ? chartColors.dark : chartColors.light;

	const value = {
		theme,
		mode,
		isDark,
		isLoading,
		setTheme,
		toggleTheme,
		syncFromDatabase,
		shadows: themeShadows,
		chartColors: themeChartColors,
	};

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};

export default ThemeContext;
