import React from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { ThemeProvider } from "./src/context/ThemeContext";
import { I18nProvider } from "./src/context/I18nContext";
import { AchievementProvider } from "./src/context/AchievementContext";
import { AdProvider } from "./src/context/AdContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
	const [fontsLoaded] = useFonts({});

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
						<AdProvider>
							<AchievementProvider>
								<RootNavigator />
								<StatusBar style="auto" />
							</AchievementProvider>
						</AdProvider>
					</I18nProvider>
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
