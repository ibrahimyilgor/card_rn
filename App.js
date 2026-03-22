import React, { useEffect, useRef, useState } from "react";
import { Animated, AppState, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { NativeModulesProxy } from "expo-modules-core";
import { ThemeProvider } from "./src/context/ThemeContext";
import { I18nProvider } from "./src/context/I18nContext";
import { AchievementProvider } from "./src/context/AchievementContext";
import { AdProvider } from "./src/context/AdContext";
import { PlanProvider } from "./src/context/PlanContext";
import RootNavigator from "./src/navigation/RootNavigator";
import AppSplashScreen from "./src/components/ui/AppSplashScreen";

export default function App() {
	const [fontsLoaded] = useFonts({});
	const [minSplashElapsed, setMinSplashElapsed] = useState(false);
	const [showSplash, setShowSplash] = useState(true);
	const splashOpacity = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setMinSplashElapsed(true);
		}, 1400);

		return () => clearTimeout(timeoutId);
	}, []);

	useEffect(() => {
		if (!fontsLoaded || !minSplashElapsed || !showSplash) return;

		Animated.timing(splashOpacity, {
			toValue: 0,
			duration: 260,
			useNativeDriver: true,
		}).start(() => {
			setShowSplash(false);
		});
	}, [fontsLoaded, minSplashElapsed, showSplash, splashOpacity]);

	useEffect(() => {
		if (Platform.OS !== "android") return;
		if (!NativeModulesProxy?.ExpoNavigationBar) {
			console.log(
				"ExpoNavigationBar native module not available in this build.",
			);
			return;
		}

		let NavigationBar;
		try {
			NavigationBar = require("expo-navigation-bar");
		} catch (error) {
			console.log("expo-navigation-bar not available:", error?.message);
			return;
		}

		// Keep Android system navigation buttons (triangle/circle/square) always visible.
		// Our bottom tab bar already accounts for safe-area insets.
		const applyNavigationBarVisible = async () => {
			try {
				// 'inset-swipe' avoids overlaying app content and keeps the system bar visible.
				await NavigationBar.setBehaviorAsync("inset-swipe");
				await NavigationBar.setVisibilityAsync("visible");
			} catch (error) {
				console.log("Navigation bar visibility update failed:", error);
			}
		};

		applyNavigationBarVisible();

		const appStateSub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				applyNavigationBarVisible();
			}
		});

		return () => {
			appStateSub.remove();
		};
	}, []);

	if (showSplash || !fontsLoaded) {
		return <AppSplashScreen />;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<ThemeProvider>
					<I18nProvider>
						<PlanProvider>
							<AdProvider>
								<AchievementProvider>
									<RootNavigator />
								</AchievementProvider>
							</AdProvider>
						</PlanProvider>
					</I18nProvider>
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
