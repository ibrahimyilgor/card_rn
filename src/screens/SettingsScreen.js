import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Switch,
	Text,
	Image,
	Animated,
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

// Module-level flag — persists across context-triggered remounts within the same app session
let _settingsAnimated = false;

// Defined outside the component so React never sees it as a new component type on re-render
const SettingsItem = ({
	icon,
	label,
	children,
	onPress,
	showArrow = false,
	theme,
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

const SettingsScreen = ({ navigation, onLogout }) => {
	const { theme, mode, setTheme, isDark } = useTheme();
	const { t, language, setLanguage } = useI18n();

	const [soundEnabled, setSoundEnabled] = useState(true);
	const [loading, setLoading] = useState(false);
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

	// Section entrance animations
	const headerAnim = useRef(
		new Animated.Value(_settingsAnimated ? 1 : 0),
	).current;
	const sectionAnims = useRef(
		Array.from(
			{ length: 6 },
			() => new Animated.Value(_settingsAnimated ? 1 : 0),
		),
	).current;

	useEffect(() => {
		// Run entrance animations only once per app session
		if (_settingsAnimated) return;
		_settingsAnimated = true;

		Animated.timing(headerAnim, {
			toValue: 1,
			duration: 350,
			useNativeDriver: true,
		}).start();

		sectionAnims.forEach((anim, index) => {
			Animated.spring(anim, {
				toValue: 1,
				delay: 100 + index * 80,
				useNativeDriver: true,
				speed: 14,
				bounciness: 3,
			}).start();
		});
	}, []);

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
	const handleThemeChange = React.useCallback(
		async (value) => {
			const newMode = value ? "dark" : "light";
			setTheme(newMode);
			try {
				await accountAPI.updateTheme(newMode);
			} catch (error) {
				console.error("Error updating theme:", error);
			}
		},
		[setTheme],
	);

	// Handle language change with backend sync
	const handleLanguageChange = React.useCallback(
		async (newLanguage) => {
			setLanguage(newLanguage);
			try {
				await accountAPI.updateLanguage(newLanguage);
			} catch (error) {
				console.error("Error updating language:", error);
			}
		},
		[setLanguage],
	);

	// Handle sound change with backend sync
	const handleSoundChange = React.useCallback(async (value) => {
		setSoundEnabled(value);
		try {
			await accountAPI.updateSoundEffects(value);
		} catch (error) {
			console.error("Error updating sound:", error);
		}
	}, []);

	const handleLogout = React.useCallback(() => {
		setShowLogoutDialog(true);
	}, []);

	const confirmLogout = React.useCallback(async () => {
		await authHelpers.clearAuth();
		if (onLogout) {
			onLogout();
		}
	}, [onLogout]);

	// SettingsItem is defined at module level to avoid re-mounting on every render

	return (
		<ThemedView variant="gradient" style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					{/* Header */}
					<Animated.View
						style={[
							styles.header,
							{
								opacity: headerAnim,
								transform: [
									{
										translateY: headerAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [-15, 0],
										}),
									},
								],
							},
						]}
					>
						<View style={styles.headerTitle}>
							<Ionicons name="settings" size={26} color={theme.primary.main} />
							<ThemedText variant="h2" style={styles.headerTitleText}>
								{t("settings")}
							</ThemedText>
						</View>
						<ThemedText color="secondary">{t("settings_subtitle")}</ThemedText>
					</Animated.View>

					{/* Appearance Section */}
					<Animated.View
						style={[
							styles.section,
							{
								opacity: sectionAnims[0],
								transform: [
									{
										translateY: sectionAnims[0].interpolate({
											inputRange: [0, 1],
											outputRange: [20, 0],
										}),
									},
								],
							},
						]}
					>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("appearance")}
						</ThemedText>

						<SettingsItem
							theme={theme}
							icon="color-palette-outline"
							label={t("theme") || "Tema"}
						>
							<View style={styles.themeToggle}>
								<Ionicons
									name="sunny-outline"
									size={20}
									color={
										mode === "dark" ? theme.text.secondary : theme.primary.main
									}
								/>
								<Switch
									value={mode === "dark"}
									onValueChange={handleThemeChange}
									trackColor={{
										false: theme.background.elevated,
										true: theme.primary.main,
									}}
									thumbColor={mode === "dark" ? "#fff" : "#f4f3f4"}
									style={{ marginHorizontal: spacing.sm }}
								/>
								<Ionicons
									name="moon-outline"
									size={20}
									color={
										mode === "dark" ? theme.primary.main : theme.text.secondary
									}
								/>
							</View>
						</SettingsItem>
					</Animated.View>

					{/* Language Section */}
					<Animated.View
						style={[
							styles.section,
							{
								opacity: sectionAnims[1],
								transform: [
									{
										translateY: sectionAnims[1].interpolate({
											inputRange: [0, 1],
											outputRange: [20, 0],
										}),
									},
								],
							},
						]}
					>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("language")}
						</ThemedText>

						{/* Language Dropdown Trigger */}
						<Card
							style={styles.languageOption}
							onPress={() => setShowLanguageDropdown((v) => !v)}
						>
							<View style={styles.languageContent}>
								<Text style={styles.flag}>
									{language === "tr" ? "🇹🇷" : "🇬🇧"}
								</Text>
								<ThemedText style={styles.languageLabel}>
									{language === "tr" ? "Türkçe" : "English"}
								</ThemedText>
							</View>
							<Ionicons
								name={showLanguageDropdown ? "chevron-up" : "chevron-down"}
								size={20}
								color={theme.text.secondary}
							/>
						</Card>

						{/* Dropdown Options */}
						{showLanguageDropdown && (
							<View
								style={[
									styles.dropdownContainer,
									{ borderColor: theme.divider },
								]}
							>
								{[
									{ code: "en", flag: "🇬🇧", label: "English" },
									{ code: "tr", flag: "🇹🇷", label: "Türkçe" },
								].map((lang) => (
									<Card
										key={lang.code}
										style={[
											styles.dropdownItem,
											language === lang.code && {
												backgroundColor: theme.primary.main + "15",
											},
										]}
										onPress={() => {
											handleLanguageChange(lang.code);
											setShowLanguageDropdown(false);
										}}
									>
										<View style={styles.languageContent}>
											<Text style={styles.flag}>{lang.flag}</Text>
											<ThemedText style={styles.languageLabel}>
												{lang.label}
											</ThemedText>
										</View>
										{language === lang.code && (
											<Ionicons
												name="checkmark-circle"
												size={20}
												color={theme.primary.main}
											/>
										)}
									</Card>
								))}
							</View>
						)}
					</Animated.View>

					{/* Sound Section */}
					<Animated.View
						style={[
							styles.section,
							{
								opacity: sectionAnims[2],
								transform: [
									{
										translateY: sectionAnims[2].interpolate({
											inputRange: [0, 1],
											outputRange: [20, 0],
										}),
									},
								],
							},
						]}
					>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("sound")}
						</ThemedText>

						<SettingsItem
							theme={theme}
							icon="volume-high-outline"
							label={t("sound_effects")}
						>
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
					</Animated.View>

					{/* Account Section */}
					<Animated.View
						style={[
							styles.section,
							{
								opacity: sectionAnims[3],
								transform: [
									{
										translateY: sectionAnims[3].interpolate({
											inputRange: [0, 1],
											outputRange: [20, 0],
										}),
									},
								],
							},
						]}
					>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("account")}
						</ThemedText>

						<SettingsItem
							theme={theme}
							icon="person-outline"
							label={t("account_settings")}
							onPress={() => navigation.navigate("Account")}
							showArrow
						/>

						<SettingsItem
							theme={theme}
							icon="calendar-outline"
							label={t("plans_title")}
							onPress={() => navigation.navigate("Plans")}
							showArrow
						/>
					</Animated.View>

					{/* About Section */}
					<Animated.View
						style={[
							styles.section,
							{
								opacity: sectionAnims[4],
								transform: [
									{
										translateY: sectionAnims[4].interpolate({
											inputRange: [0, 1],
											outputRange: [20, 0],
										}),
									},
								],
							},
						]}
					>
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
								MemoDeck v1.0.0
							</ThemedText>
							{/* <ThemedText color="secondary" style={styles.aboutVersion}>
								{t("version")} 1.0.0
							</ThemedText> */}
							<ThemedText color="secondary" style={styles.aboutTagline}>
								{"memodeck26@gmail.com"}
							</ThemedText>
						</Card>
					</Animated.View>

					{/* Logout Button */}
					<Animated.View
						style={{
							opacity: sectionAnims[5],
							transform: [
								{
									translateY: sectionAnims[5].interpolate({
										inputRange: [0, 1],
										outputRange: [20, 0],
									}),
								},
							],
						}}
					>
						<Button
							variant="outlined"
							onPress={handleLogout}
							style={[
								styles.logoutButton,
								{
									borderColor: "#dc2626",
									backgroundColor: "#dc2626",
								},
							]}
						>
							<View style={styles.logoutContent}>
								<Ionicons name="log-out-outline" size={20} color="#fff" />
								<Text style={[styles.logoutText, { color: "#fff" }]}>
									{t("logout")}
								</Text>
							</View>
						</Button>
					</Animated.View>
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
	headerTitle: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		marginBottom: spacing.xs,
	},
	headerTitleText: {
		marginLeft: spacing.sm,
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
		marginBottom: 0,
	},
	dropdownContainer: {
		borderWidth: 1,
		borderRadius: borderRadius.md,
		marginTop: 4,
		marginBottom: spacing.sm,
		overflow: "hidden",
	},
	dropdownItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: spacing.md,
		borderRadius: 0,
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
	themeToggle: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
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
