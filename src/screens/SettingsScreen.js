import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Text,
	Animated,
	Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { authHelpers, accountAPI } from "../services/api";
import { setSoundEnabled as setGlobalSoundEnabled } from "../utils/sounds";
import {
	ThemedView,
	ThemedText,
	Card,
	Button,
	ConfirmDialog,
} from "../components/ui";
import { spacing, borderRadius } from "../styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AppLogo from "../components/ui/AppLogo";
import Toggle from "../components/ui/Toggle";
import { TRFlag, GBFlag } from "../components/ui/FlagIcons";

// Animations will run on every focus (no module-level persistence)

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

	const scrollRef = useRef(null);
	const contentHeightRef = useRef(0);

	const [soundEnabled, setSoundEnabled] = useState(true);
	const [loading, setLoading] = useState(false);
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const [showInlineLogout, setShowInlineLogout] = useState(false);
	const inlineLogoutAnim = useRef(new Animated.Value(0)).current;
	const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

	// Section entrance animations (reset on each focus)
	const sectionAnims = useRef(
		Array.from({ length: 6 }, () => new Animated.Value(0)),
	).current;
	// Run and reset entrance animations on every focus so they always look the same
	useFocusEffect(
		React.useCallback(() => {
			// ensure scroll is at top on each focus and reset sections
			scrollRef.current?.scrollTo({ y: 0, animated: true });

			// reset sections
			sectionAnims.forEach((a) => a.setValue(0));

			// faster, snappy timings to match Account screen (header is static)
			sectionAnims.forEach((anim, index) => {
				Animated.spring(anim, {
					toValue: 1,
					delay: 80 + index * 60,
					useNativeDriver: true,
					speed: 20,
					bounciness: 4,
				}).start();
			});

			return () => {
				try {
					sectionAnims.forEach((a) => a.stopAnimation());
				} catch (e) {}
			};
		}, [sectionAnims]),
	);

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
		await setGlobalSoundEnabled(value);
		try {
			await accountAPI.updateSoundEffects(value);
		} catch (error) {
			console.error("Error updating sound:", error);
		}
	}, []);

	const handleLogout = React.useCallback(() => {
		// Toggle: if confirmation already visible, hide it; otherwise show it
		if (showInlineLogout) {
			Animated.timing(inlineLogoutAnim, {
				toValue: 0,
				duration: 180,
				useNativeDriver: true,
			}).start(() => setShowInlineLogout(false));
			return;
		}

		// show inline animated confirmation instead of modal
		setShowInlineLogout(true);
		inlineLogoutAnim.setValue(0);
		Animated.timing(inlineLogoutAnim, {
			toValue: 1,
			duration: 220,
			useNativeDriver: true,
		}).start(() => {
			// ensure it's visible by scrolling to bottom after animation (use measured height for smoother native scroll)
			scrollRef.current?.scrollTo({
				y: Math.max(0, contentHeightRef.current - 1),
				animated: true,
			});
		});
	}, [inlineLogoutAnim, showInlineLogout]);

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
				<ScrollView
					ref={scrollRef}
					contentContainerStyle={styles.scrollContent}
					onContentSizeChange={(w, h) => (contentHeightRef.current = h)}
				>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.headerTitle}>
							<Ionicons name="settings" size={26} color={theme.primary.main} />
							<ThemedText variant="h2" style={styles.headerTitleText}>
								{t("settings")}
							</ThemedText>
						</View>
						<ThemedText color="secondary">{t("settings_subtitle")}</ThemedText>
					</View>

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
								<Toggle
									value={mode === "dark"}
									onValueChange={handleThemeChange}
									activeColor={theme.primary.main}
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
								<View style={styles.flagWrap}>
									{language === "tr" ? (
										<TRFlag size={18} />
									) : (
										<GBFlag size={18} />
									)}
								</View>
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
									{
										backgroundColor: theme.background.elevated,
										borderColor: theme.border.main,
									},
								]}
							>
								{[
									{ code: "en", Flag: GBFlag, label: "English" },
									{ code: "tr", Flag: TRFlag, label: "Türkçe" },
								].map((lang, index, arr) => (
									<Pressable
										key={lang.code}
										style={({ pressed }) => [
											styles.dropdownItem,
											language === lang.code && {
												backgroundColor: theme.primary.main + "18",
											},
											pressed && { backgroundColor: theme.primary.main + "25" },
											index < arr.length - 1 && {
												borderBottomWidth: 1,
												borderBottomColor: theme.border.subtle,
											},
										]}
										onPress={() => {
											handleLanguageChange(lang.code);
											setShowLanguageDropdown(false);
										}}
									>
										<View style={styles.languageContent}>
											<View style={styles.flagWrap}>
												<lang.Flag size={18} />
											</View>
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
									</Pressable>
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
							<Toggle
								value={soundEnabled}
								onValueChange={handleSoundChange}
								activeColor={theme.primary.main}
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
							<View style={styles.aboutRow}>
								<AppLogo width={56} height={56} />
								<View style={styles.aboutInfo}>
									<ThemedText variant="h3" style={styles.aboutAppName}>
										MemoDeck v1.0.21
									</ThemedText>
									<ThemedText color="secondary" style={styles.aboutTagline}>
										{"memodeck26@gmail.com"}
									</ThemedText>
								</View>
							</View>
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
									borderColor: "#9f1239",
									backgroundColor: "#9f1239",
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

						{/* Inline animated logout confirmation */}
						{showInlineLogout && (
							<Animated.View
								style={[
									styles.inlineConfirm,
									{
										opacity: inlineLogoutAnim,
										transform: [
											{
												translateY: inlineLogoutAnim.interpolate({
													inputRange: [0, 1],
													outputRange: [-8, 0],
												}),
											},
										],
									},
								]}
							>
								<View style={styles.inlineRow}>
									<ThemedText style={styles.inlineText}>
										{t("logout_confirm")}
									</ThemedText>
									<View style={styles.inlineButtons}>
										<Pressable
											onPress={() => {
												Animated.timing(inlineLogoutAnim, {
													toValue: 0,
													duration: 180,
													useNativeDriver: true,
												}).start(() => setShowInlineLogout(false));
											}}
											style={({ pressed }) => [
												styles.inlineBtn,
												pressed && { opacity: 0.7 },
											]}
										>
											<Ionicons
												name="close"
												size={20}
												color={theme.error?.main ?? "#ef4444"}
											/>
										</Pressable>
										<Pressable
											onPress={async () => {
												Animated.timing(inlineLogoutAnim, {
													toValue: 0,
													duration: 160,
													useNativeDriver: true,
												}).start(async () => {
													setShowInlineLogout(false);
													await confirmLogout();
												});
											}}
											style={({ pressed }) => [
												styles.inlineBtn,
												pressed && { opacity: 0.7 },
											]}
										>
											<Ionicons
												name="checkmark"
												size={20}
												color={theme.success?.main ?? "#22c55e"}
											/>
										</Pressable>
									</View>
								</View>
							</Animated.View>
						)}
					</Animated.View>
				</ScrollView>
			</SafeAreaView>

			<ConfirmDialog
				visible={showLogoutDialog}
				title={
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							gap: 8,
							flex: 1,
						}}
					>
						<LinearGradient
							colors={["#6366f1", "#8b5cf6"]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={{
								width: 36,
								height: 36,
								borderRadius: 10,
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<MaterialCommunityIcons name="logout" size={20} color="#fff" />
						</LinearGradient>
						<Text
							style={{
								fontSize: 18,
								fontWeight: "600",
								color: theme.text.primary,
								flex: 1,
							}}
						>
							{t("logout")}
						</Text>
					</View>
				}
				message={t("logout_confirm")}
				confirmLabel={t("logout")}
				cancelLabel={t("cancel")}
				onConfirm={confirmLogout}
				onClose={() => setShowLogoutDialog(false)}
				confirmVariant="danger"
				verticalAlign="center"
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
	inlineConfirm: {
		marginTop: spacing.sm,
		marginBottom: spacing.md,
		padding: spacing.sm,
		borderRadius: borderRadius.md,
		backgroundColor: "transparent",
	},
	inlineRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: spacing.sm,
	},
	inlineText: {
		flex: 1,
		fontSize: 14,
	},
	inlineButtons: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	inlineBtn: {
		padding: 8,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	settingsItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: spacing.md,
		marginBottom: spacing.sm,
		height: 65,
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
		height: 65,
	},
	dropdownContainer: {
		borderWidth: 1,
		borderRadius: borderRadius.lg,
		marginTop: 6,
		marginBottom: spacing.sm,
		overflow: "hidden",
	},
	dropdownItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.md,
	},
	languageContent: {
		flexDirection: "row",
		alignItems: "center",
	},
	flagWrap: {
		marginRight: spacing.md,
		borderRadius: 3,
		overflow: "hidden",
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
		padding: spacing.lg,
	},
	aboutRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
	},
	aboutInfo: {
		flex: 1,
		gap: 2,
	},
	aboutAppName: {
		fontWeight: "700",
	},
	aboutTagline: {
		fontSize: 13,
	},
});

export default SettingsScreen;
