import React, { useEffect } from "react";
import { ActivityIndicator, AppState, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { ThemeProvider } from "./src/context/ThemeContext";
import { I18nProvider } from "./src/context/I18nContext";
import { AchievementProvider } from "./src/context/AchievementContext";
import { AdProvider } from "./src/context/AdContext";
import { PlanProvider } from "./src/context/PlanContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
	const [fontsLoaded] = useFonts({});

	useEffect(() => {
		if (Platform.OS !== "android") return;

		let NavigationBar;
		try {
			NavigationBar = require("expo-navigation-bar");
		} catch (error) {
			console.log("expo-navigation-bar not available:", error?.message);
			return;
		}

		const applyNavigationBarHidden = async () => {
			try {
				await NavigationBar.setBehaviorAsync("overlay-swipe");
				await NavigationBar.setVisibilityAsync("hidden");
			} catch (error) {
				console.log("Navigation bar hide failed:", error);
			}
		};

		applyNavigationBarHidden();

		const appStateSub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				applyNavigationBarHidden();
			}
		});

		return () => {
			appStateSub.remove();
		};
	}, []);

	if (!fontsLoaded) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: "#0a0e14",
				}}
			>
				<ActivityIndicator size="large" color="#3b82f6" />
			</View>
		);
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
