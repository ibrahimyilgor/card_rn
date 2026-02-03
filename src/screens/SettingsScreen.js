import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Switch,
	Text,
	Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { authHelpers, accountAPI } from "../services/api";
import {
	ThemedView,
	ThemedText,
	Card,
	Button,
	ConfirmDialog,
} from "../components/ui";
import { spacing, borderRadius } from "../styles/theme";
import { Ionicons } from "@expo/vector-icons";

const SettingsScreen = ({ navigation, onLogout }) => {
	const { theme, mode, setTheme, isDark } = useTheme();
	const { t, language, setLanguage } = useI18n();

	const [soundEnabled, setSoundEnabled] = useState(true);
	const [loading, setLoading] = useState(false);
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);

	// Load preferences on mount
	useEffect(() => {
		const loadPreferences = async () => {
			try {
				const response = await accountAPI.getPreferences();
				if (response.data?.profile) {
					setSoundEnabled(
						response.data.profile.sound_effects_enabled !== false,
					);
				}
			} catch (error) {
				console.error("Error loading preferences:", error);
			}
		};

		loadPreferences();
	}, []);

	// Handle theme change with backend sync
	const handleThemeChange = async (value) => {
		const newMode = value ? "dark" : "light";
		setTheme(newMode);

		try {
			await accountAPI.updateTheme(newMode);
		} catch (error) {
			console.error("Error updating theme:", error);
		}
	};

	// Handle language change with backend sync
	const handleLanguageChange = async (newLanguage) => {
		setLanguage(newLanguage);

		try {
			await accountAPI.updateLanguage(newLanguage);
		} catch (error) {
			console.error("Error updating language:", error);
		}
	};

	// Handle sound change with backend sync
	const handleSoundChange = async (value) => {
		setSoundEnabled(value);

		try {
			await accountAPI.updateSoundEffects(value);
		} catch (error) {
			console.error("Error updating sound:", error);
		}
	};

	const handleLogout = () => {
		setShowLogoutDialog(true);
	};

	const confirmLogout = async () => {
		await authHelpers.clearAuth();
		if (onLogout) {
			onLogout();
		}
	};

	const SettingsItem = ({
		icon,
		label,
		children,
		onPress,
		showArrow = false,
	}) => (
		<Card style={styles.settingsItem} onPress={onPress}>
			<View style={styles.settingsItemLeft}>
				<View
					style={[
						styles.iconContainer,
						{ backgroundColor: theme.primary.main + "20" },
					]}
				>
					<Ionicons name={icon} size={22} color={theme.primary.main} />
				</View>
				<ThemedText style={styles.settingsLabel}>{label}</ThemedText>
			</View>
			<View style={styles.settingsItemRight}>
				{children}
				{showArrow && (
					<Ionicons
						name="chevron-forward"
						size={20}
						color={theme.text.secondary}
						style={styles.arrowIcon}
					/>
				)}
			</View>
		</Card>
	);

	return (
		<ThemedView variant="gradient" style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					{/* Header */}
					<View style={styles.header}>
						<ThemedText variant="h2">{t("settings")}</ThemedText>
						<ThemedText color="secondary">{t("settings_subtitle")}</ThemedText>
					</View>

					{/* Appearance Section */}
					<View style={styles.section}>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("appearance")}
						</ThemedText>

						<SettingsItem icon="moon-outline" label={t("dark_mode")}>
							<Switch
								value={mode === "dark"}
								onValueChange={handleThemeChange}
								trackColor={{
									false: theme.background.elevated,
									true: theme.primary.main,
								}}
								thumbColor={mode === "dark" ? "#fff" : "#f4f3f4"}
							/>
						</SettingsItem>
					</View>

					{/* Language Section */}
					<View style={styles.section}>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("language")}
						</ThemedText>

						<Card
							style={[
								styles.languageOption,
								language === "en" && {
									borderColor: theme.primary.main,
									borderWidth: 2,
								},
							]}
							onPress={() => handleLanguageChange("en")}
						>
							<View style={styles.languageContent}>
								<Text style={styles.flag}>🇬🇧</Text>
								<ThemedText style={styles.languageLabel}>English</ThemedText>
							</View>
							{language === "en" && (
								<Ionicons
									name="checkmark-circle"
									size={24}
									color={theme.primary.main}
								/>
							)}
						</Card>

						<Card
							style={[
								styles.languageOption,
								language === "tr" && {
									borderColor: theme.primary.main,
									borderWidth: 2,
								},
							]}
							onPress={() => handleLanguageChange("tr")}
						>
							<View style={styles.languageContent}>
								<Text style={styles.flag}>🇹🇷</Text>
								<ThemedText style={styles.languageLabel}>Türkçe</ThemedText>
							</View>
							{language === "tr" && (
								<Ionicons
									name="checkmark-circle"
									size={24}
									color={theme.primary.main}
								/>
							)}
						</Card>
					</View>

					{/* Sound Section */}
					<View style={styles.section}>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("sound")}
						</ThemedText>

						<SettingsItem icon="volume-high-outline" label={t("sound_effects")}>
							<Switch
								value={soundEnabled}
								onValueChange={handleSoundChange}
								trackColor={{
									false: theme.background.elevated,
									true: theme.primary.main,
								}}
								thumbColor={soundEnabled ? "#fff" : "#f4f3f4"}
							/>
						</SettingsItem>
					</View>

					{/* Account Section */}
					<View style={styles.section}>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("account")}
						</ThemedText>

						<SettingsItem
							icon="person-outline"
							label={t("account_settings")}
							onPress={() => navigation.navigate("Account")}
							showArrow
						/>

						<SettingsItem
							icon="card-outline"
							label={t("subscription_plans")}
							onPress={() => navigation.navigate("Plans")}
							showArrow
						/>
					</View>

					{/* About Section */}
					<View style={styles.section}>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("about")}
						</ThemedText>

						<Card style={styles.aboutCard}>
							<Image
								source={require("../../assets/memodeck.png")}
								style={styles.aboutLogo}
								resizeMode="contain"
							/>
							<ThemedText variant="h3" style={styles.aboutAppName}>
								MemoDeck
							</ThemedText>
							<ThemedText color="secondary" style={styles.aboutVersion}>
								{t("version")} 1.0.0
							</ThemedText>
							<ThemedText color="secondary" style={styles.aboutTagline}>
								{t("tagline")}
							</ThemedText>
						</Card>
					</View>

					{/* Logout Button */}
					<Button
						variant="outlined"
						onPress={handleLogout}
						style={[
							styles.logoutButton,
							{
								borderColor: theme.border.main,
								backgroundColor: isDark ? "transparent" : "#ffffff",
							},
						]}
					>
						<View style={styles.logoutContent}>
							<Ionicons
								name="log-out-outline"
								size={20}
								color={theme.text.primary}
							/>
							<Text style={[styles.logoutText, { color: theme.text.primary }]}>
								{t("logout")}
							</Text>
						</View>
					</Button>
				</ScrollView>
			</SafeAreaView>

			<ConfirmDialog
				visible={showLogoutDialog}
				title={t("logout")}
				message={t("logout_confirm")}
				confirmLabel={t("logout")}
				cancelLabel={t("cancel")}
				onConfirm={confirmLogout}
				onClose={() => setShowLogoutDialog(false)}
				confirmVariant="danger"
			/>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	safeArea: {
		flex: 1,
	},
	scrollContent: {
		padding: spacing.lg,
		paddingBottom: spacing.xxl,
	},
	header: {
		marginBottom: spacing.lg,
	},
	section: {
		marginBottom: spacing.lg,
	},
	sectionTitle: {
		marginBottom: spacing.sm,
		marginLeft: spacing.xs,
	},
	settingsItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: spacing.md,
		marginBottom: spacing.sm,
	},
	settingsItemLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	settingsItemRight: {
		flexDirection: "row",
		alignItems: "center",
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: borderRadius.md,
		justifyContent: "center",
		alignItems: "center",
		marginRight: spacing.md,
	},
	settingsLabel: {
		fontSize: 16,
		fontWeight: "500",
	},
	arrowIcon: {
		marginLeft: spacing.sm,
	},
	languageOption: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: spacing.md,
		marginBottom: spacing.sm,
	},
	languageContent: {
		flexDirection: "row",
		alignItems: "center",
	},
	flag: {
		fontSize: 28,
		marginRight: spacing.md,
	},
	languageLabel: {
		fontSize: 16,
		fontWeight: "500",
	},
	logoutButton: {
		marginTop: spacing.md,
		borderColor: "transparent",
	},
	logoutContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
	},
	logoutText: {
		fontSize: 16,
		fontWeight: "600",
	},
	aboutCard: {
		alignItems: "center",
		padding: spacing.xl,
	},
	aboutLogo: {
		width: 80,
		height: 80,
		borderRadius: 16,
		marginBottom: spacing.md,
	},
	aboutAppName: {
		fontWeight: "700",
		marginBottom: spacing.xs,
	},
	aboutVersion: {
		fontSize: 14,
		marginBottom: spacing.sm,
	},
	aboutTagline: {
		fontSize: 13,
		textAlign: "center",
	},
});

export default SettingsScreen;
