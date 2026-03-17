import React, { useState, useEffect, useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { View, ActivityIndicator, Platform, AppState } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { usePlan } from "../context/PlanContext";
import { accountAPI, authHelpers } from "../services/api";
import {
	onAuthStateChanged,
	signOut as firebaseSignOut,
} from "../services/firebase";
import {
	initBilling,
	syncAndroidEntitlements,
} from "../services/googleBillingService";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import { navigationRef } from "./navigationService";

const RootNavigator = () => {
	const {
		theme,
		isLoading: themeLoading,
		syncFromDatabase: syncTheme,
	} = useTheme();
	const { syncFromDatabase: syncLanguage } = useI18n();
	const { refreshPlan } = usePlan();
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [lastEntitlementSyncAt, setLastEntitlementSyncAt] = useState(0);

	const syncEntitlementsIfNeeded = useCallback(async () => {
		if (Platform.OS !== "android" || !user) return;

		const now = Date.now();
		if (now - lastEntitlementSyncAt < 15000) return;

		setLastEntitlementSyncAt(now);
		try {
			await initBilling();
			await syncAndroidEntitlements();
			await refreshPlan();
		} catch (error) {
			console.warn("[RootNavigator] Entitlement sync failed:", error?.message);
		}
	}, [lastEntitlementSyncAt, refreshPlan, user]);

	// Sync preferences from database
	const syncPreferencesFromDatabase = useCallback(async () => {
		try {
			const response = await accountAPI.getProfile();
			if (response.data?.profile) {
				const profile = response.data.profile;
				// Sync theme
				if (profile.theme_preference) {
					await syncTheme(profile.theme_preference);
				}
				// Sync language
				if (profile.language) {
					await syncLanguage(profile.language);
				}
				// Sync sound effects
				if (profile.sound_effects_enabled !== undefined) {
					await AsyncStorage.setItem(
						"soundEffects",
						profile.sound_effects_enabled.toString(),
					);
				}
			}
		} catch (error) {
			console.error("Error syncing preferences:", error);
		}
	}, [syncTheme, syncLanguage]);

	// Listen to Firebase auth state changes
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
			if (firebaseUser) {
				try {
					// Sync with backend (Google accounts are always verified)
					await authHelpers.syncWithBackend();
					// Sync preferences
					await syncPreferencesFromDatabase();
					// Refresh plan data (for ad gating, limits, etc.)
					await refreshPlan();
					if (Platform.OS === "android") {
						await syncEntitlementsIfNeeded();
					}
				} catch (error) {
					console.error("Error syncing with backend:", error);
				}
			} else {
				// User signed out
				await authHelpers.clearAuth();
			}
			setUser(firebaseUser);
			setIsLoading(false);
		});

		return () => unsubscribe();
	}, [syncPreferencesFromDatabase, syncEntitlementsIfNeeded, refreshPlan]);

	useEffect(() => {
		const appStateSub = AppState.addEventListener("change", (nextState) => {
			if (nextState === "active") {
				syncEntitlementsIfNeeded();
			}
		});

		return () => appStateSub.remove();
	}, [syncEntitlementsIfNeeded]);

	const handleLogin = useCallback(async () => {
		// Firebase auth state listener handles the state change
		await syncPreferencesFromDatabase();
	}, [syncPreferencesFromDatabase]);

	const handleLogout = useCallback(async () => {
		try {
			await firebaseSignOut();
		} catch (error) {
			console.error("Error during logout:", error);
		}
	}, []);

	// Check if user is authenticated (Google accounts are always verified)
	const isAuthenticated = !!user;

	if (isLoading || themeLoading) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: theme.background.default,
				}}
			>
				<ActivityIndicator size="large" color={theme.primary.main} />
			</View>
		);
	}

	const navigationTheme = {
		dark: theme.mode === "dark",
		colors: {
			primary: theme.primary.main,
			background: theme.background.default,
			card: theme.background.paper,
			text: theme.text.primary,
			border: theme.border.main,
			notification: theme.error.main,
		},
		fonts: {
			regular: {
				fontFamily: "System",
				fontWeight: "400",
			},
			medium: {
				fontFamily: "System",
				fontWeight: "500",
			},
			bold: {
				fontFamily: "System",
				fontWeight: "700",
			},
			heavy: {
				fontFamily: "System",
				fontWeight: "900",
			},
		},
	};

	return (
		<NavigationContainer ref={navigationRef} theme={navigationTheme}>
			<StatusBar
				style={theme.mode === "dark" ? "light" : "dark"}
				// hidden={Platform.OS === "android"}
				translucent
				backgroundColor="transparent"
				animated
			/>
			{isAuthenticated ? (
				<MainTabs onLogout={handleLogout} />
			) : (
				<AuthStack onLogin={handleLogin} />
			)}
		</NavigationContainer>
	);
};

export default RootNavigator;
