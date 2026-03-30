import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Alert,
	Animated,
	Pressable,
	Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { accountAPI, authAPI, authHelpers } from "../services/api";
import {
	getCurrentUser,
	signOut as firebaseSignOut,
} from "../services/firebase";
import {
	ThemedView,
	ThemedText,
	Card,
	Button,
	Input,
	LoadingState,
	ConfirmDialog,
	AlertDialog,
} from "../components/ui";
import { spacing, borderRadius } from "../styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Memoized header to prevent re-renders of icon/title/description
const Header = React.memo(({ primaryColor, title, subtitle }) => {
	return (
		<View style={styles.header}>
			<View style={styles.headerTitle}>
				<Ionicons name="person" size={26} color={primaryColor} />
				<ThemedText variant="h2" style={styles.headerTitleText}>
					{title}
				</ThemedText>
			</View>
			<ThemedText color="secondary">{subtitle}</ThemedText>
		</View>
	);
});

// Animations will run on every focus (no module-level persistence)

const AccountScreen = ({ navigation, onLogout }) => {
	const { theme } = useTheme();
	const { t, language } = useI18n();

	// Stabilize header props so Header (React.memo) doesn't re-render
	const headerTitle = React.useMemo(() => t("account"), [t]);
	const headerSubtitle = React.useMemo(() => t("account_subtitle"), [t]);
	const headerPrimaryColor = React.useMemo(() => theme.primary.main, [
		theme.primary.main,
	]);

	const scrollRef = useRef(null);

	const locale = language === "tr" ? "tr-TR" : "en-US";
	const subscriptionDividerColor =
		theme.mode === "dark" ? theme.border.main : theme.border.subtle;

	const [loading, setLoading] = useState(true);
	const [account, setAccount] = useState(null);
	const [plan, setPlan] = useState("free");

	// Delete dialog
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleting, setDeleting] = useState(false);

	// Reset statistics dialog
	const [showResetDialog, setShowResetDialog] = useState(false);
	const [resetting, setResetting] = useState(false);

	// Alert dialog
	const [alertConfig, setAlertConfig] = useState({
		visible: false,
		title: "",
		message: "",
		variant: "primary",
		onClose: null,
	});

	// Entrance animations (reset on each focus so user sees them every time)
	const profileAnim = useRef(new Animated.Value(0)).current;
	const avatarScale = useRef(new Animated.Value(0.5)).current;
	const subscriptionAnim = useRef(new Animated.Value(0)).current;
	const sectionAnims = useRef([
		new Animated.Value(0),
		new Animated.Value(0),
	]).current;

	// Inline confirmation states for Reset / Delete (no modal)
	const [showResetInline, setShowResetInline] = useState(false);
	const resetInlineAnim = useRef(new Animated.Value(0)).current;
	const [showDeleteInline, setShowDeleteInline] = useState(false);
	const deleteInlineAnim = useRef(new Animated.Value(0)).current;

	// Simple skeleton component (pulse)
	const Skeleton = ({ width = "100%", height = 12, style }) => {
		const pulse = useRef(new Animated.Value(0.85)).current;
		useEffect(() => {
			const loop = Animated.loop(
				Animated.sequence([
					Animated.timing(pulse, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(pulse, {
						toValue: 0.85,
						duration: 600,
						useNativeDriver: true,
					}),
				]),
			);
			loop.start();
			return () => loop.stop();
		}, [pulse]);

		const bg = theme && theme.mode === "dark" ? "#3a3a3a" : "#e6e9ee";
		return (
			<Animated.View
				style={[
					{
						width,
						height,
						borderRadius: 8,
						backgroundColor: bg,
						opacity: pulse,
					},
					style,
				]}
			/>
		);
	};

	useEffect(() => {
		fetchAccount();
	}, []);

	// Run (and reset) the entrance animation every time the screen comes into focus.
	useFocusEffect(
		React.useCallback(() => {
			if (loading) return;

			// reset starting values so animation looks the same each time
			avatarScale.setValue(0.5);
			profileAnim.setValue(0);
			subscriptionAnim.setValue(0);
			sectionAnims.forEach((a) => a.setValue(0));

			// Faster durations for snappier feel (header is static)
			const seq = [
				Animated.timing(avatarScale, {
					toValue: 1,
					duration: 160,
					useNativeDriver: true,
				}),
				Animated.timing(profileAnim, {
					toValue: 1,
					duration: 140,
					useNativeDriver: true,
				}),
				Animated.timing(subscriptionAnim, {
					toValue: 1,
					duration: 120,
					useNativeDriver: true,
				}),
				...sectionAnims.map((anim) =>
					Animated.spring(anim, {
						toValue: 1,
						useNativeDriver: true,
						speed: 20,
						bounciness: 4,
					}),
				),
			];

			const animation = Animated.sequence(seq);
			animation.start();

			return () => {
				// stop animation when unfocusing
				try {
					animation.stop();
				} catch (e) {}
			};
		}, [loading, avatarScale, profileAnim, subscriptionAnim, sectionAnims]),
	);

	const fetchAccount = async () => {
		try {
			// Get Firebase user info
			const firebaseUser = getCurrentUser();

			const [profileResponse, planResponse] = await Promise.all([
				accountAPI.getProfile(),
				accountAPI.getCurrentPlan(),
			]);

			const userPlan = planResponse.data?.plan;
			setPlan(userPlan?.code || "free");
			console.log("Fetched account profile:", firebaseUser.photoURL);
			setAccount({
				email: firebaseUser?.email,
				displayName: firebaseUser?.displayName,
				photoURL: firebaseUser?.photoURL,
				created_at: firebaseUser?.metadata?.creationTime,
				plan: userPlan?.code || "free",
				planName: userPlan?.name || "Free",
				currentPeriodEnd: userPlan?.currentPeriodEnd || null,
				autoRenewing: Boolean(userPlan?.autoRenewing),
				...profileResponse.data?.profile,
			});
		} catch (error) {
			console.error("Error fetching account:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return "";
		try {
			return new Date(dateStr).toLocaleDateString(locale, {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch (e) {
			return new Date(dateStr).toLocaleDateString(locale);
		}
	};

	const formatDateTime = (dateStr) => {
		if (!dateStr) return t("no_expiration");
		try {
			return new Date(dateStr).toLocaleString(locale, {
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch (e) {
			return new Date(dateStr).toLocaleString(locale);
		}
	};

	const getPlanColor = (code) => {
		switch (code) {
			case "pro":
				return "#f59e0b";
			case "premium":
				return "#8b5cf6";
			default:
				return "#3b82f6";
		}
	};

	const showAlert = (
		title,
		message,
		variant = "primary",
		onCloseCallback = null,
	) => {
		setAlertConfig({
			visible: true,
			title,
			message,
			variant,
			onClose: onCloseCallback,
		});
	};

	const handleAlertClose = () => {
		const callback = alertConfig.onClose;
		setAlertConfig({ ...alertConfig, visible: false });
		if (callback) {
			callback();
		}
	};

	const handleDeleteAccount = async () => {
		setDeleting(true);
		try {
			// Delete from backend first
			await authAPI.deleteAccount();

			// Then delete from Firebase
			const user = getCurrentUser();
			if (user) {
				await user.delete();
			}

			await authHelpers.clearAuth();
			if (onLogout) {
				onLogout();
			}
		} catch (error) {
			Alert.alert(t("error"), t("error_deleting_account"));
			setDeleting(false);
			setShowDeleteDialog(false);
		}
	};

	const handleResetStatistics = async () => {
		setResetting(true);
		try {
			await accountAPI.resetStatistics();
			showAlert(
				t("success") || "Success",
				t("statistics_reset_success") || "Statistics reset successfully",
				"success",
			);
			setShowResetDialog(false);
		} catch (error) {
			showAlert(
				t("error"),
				t("statistics_reset_error") || "Failed to reset statistics",
				"danger",
			);
		} finally {
			setResetting(false);
		}
	};

	if (loading) {
		// Show header and skeleton placeholders while loading (no plain "loading" text)
		return (
			<ThemedView variant="gradient" style={styles.container}>
				<SafeAreaView style={styles.safeArea} edges={["top"]}>
					<ScrollView
						ref={scrollRef}
						contentContainerStyle={styles.scrollContent}
					>
						{/* Header (visible during skeleton) */}
						<Header
							primaryColor={headerPrimaryColor}
							title={headerTitle}
							subtitle={headerSubtitle}
						/>

						{/* Profile skeleton */}
						<Card style={styles.profileCard}>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<Skeleton width={60} height={60} style={{ borderRadius: 30 }} />
								<View style={{ marginLeft: spacing.md, flex: 1 }}>
									<Skeleton
										width="50%"
										height={22}
										style={{ marginBottom: spacing.sm }}
									/>
									<Skeleton
										width="40%"
										height={14}
										style={{ marginBottom: spacing.xs }}
									/>
									<Skeleton width="30%" height={12} />
								</View>
							</View>
						</Card>

						{/* Subscription skeleton */}
						<Card style={styles.subscriptionCard}>
							<Skeleton
								width="40%"
								height={20}
								style={{ marginBottom: spacing.md }}
							/>
							<Skeleton
								width="60%"
								height={14}
								style={{ marginBottom: spacing.sm }}
							/>
							<Skeleton
								width="30%"
								height={12}
								style={{ marginTop: spacing.md }}
							/>
						</Card>

						{/* Security skeletons */}
						<View style={styles.dangerZone}>
							{[0, 1].map((i) => (
								<Card key={i} style={styles.securityCard}>
									<View
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: spacing.md,
										}}
									>
										<Skeleton
											width={44}
											height={44}
											style={{ borderRadius: 12 }}
										/>
										<View style={{ flex: 1 }}>
											<Skeleton
												width="60%"
												height={16}
												style={{ marginBottom: spacing.xs }}
											/>
											<Skeleton width="80%" height={12} />
										</View>
									</View>
								</Card>
							))}
						</View>
					</ScrollView>
				</SafeAreaView>
			</ThemedView>
		);
	}

	return (
		<ThemedView variant="gradient" style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					{/* Header */}
					<Header
						primaryColor={headerPrimaryColor}
						title={headerTitle}
						subtitle={headerSubtitle}
					/>

					{/* Profile Info */}
					<Animated.View
						style={{
							opacity: profileAnim,
							transform: [
								{
									translateY: profileAnim.interpolate({
										inputRange: [0, 1],
										outputRange: [20, 0],
									}),
								},
							],
						}}
					>
						<Card style={styles.profileCard}>
							<Animated.View
								style={[styles.avatar, { transform: [{ scale: avatarScale }] }]}
							>
								{account?.photoURL ? (
									<Animated.Image
										source={{ uri: account.photoURL }}
										style={styles.avatarImage}
										resizeMode="cover"
									/>
								) : (
									<View
										style={[
											styles.avatarFallback,
											{ backgroundColor: theme.primary.main },
										]}
									>
										<ThemedText style={styles.avatarText}>
											{(account?.displayName || account?.email)
												?.charAt(0)
												.toUpperCase() || "U"}
										</ThemedText>
									</View>
								)}
							</Animated.View>
							<View style={styles.profileInfo}>
								<ThemedText variant="h3" style={styles.displayName}>
									{account?.displayName || account?.email?.split("@")[0]}
								</ThemedText>
								<ThemedText color="secondary" style={styles.emailText}>
									{account?.email}
								</ThemedText>
								{account?.created_at && (
									<ThemedText color="secondary" style={styles.memberSince}>
										{t("member_since")} {formatDate(account.created_at)}
									</ThemedText>
								)}
							</View>
						</Card>
					</Animated.View>

					{/* Subscription Status */}
					<Animated.View
						style={{
							opacity: subscriptionAnim,
							transform: [
								{
									translateY: subscriptionAnim.interpolate({
										inputRange: [0, 1],
										outputRange: [20, 0],
									}),
								},
							],
						}}
					>
						{(() => {
							const planCode = account?.plan || "free";
							const planConfig = {
								free: {
									icon: "calendar-outline",
									color: getPlanColor("free"),
									label: t("free_plan"),
								},
								pro: {
									icon: "calendar-outline",
									color: getPlanColor("pro"),
									label: t("pro_plan"),
								},
								premium: {
									icon: "calendar-outline",
									color: getPlanColor("premium"),
									label: t("premium_plan"),
								},
							};
							const cfg = planConfig[planCode] || planConfig.free;
							return (
								<Card
									style={[
										styles.subscriptionCard,
										{
											borderWidth: 1,
											borderColor: `${cfg.color}30`,
										},
									]}
								>
									<View style={{ position: "relative" }}>
										<View style={styles.subscriptionTop}>
											<LinearGradient
												colors={[cfg.color, theme.primary.main]}
												start={{ x: 0, y: 0 }}
												end={{ x: 1, y: 1 }}
												style={styles.planIconGradient}
											>
												<Ionicons name={cfg.icon} size={22} color="#fff" />
											</LinearGradient>
											<View style={{ flex: 1, marginLeft: spacing.md }}>
												<ThemedText color="secondary" style={{ fontSize: 12 }}>
													{t("subscription") || "Subscription"}
												</ThemedText>
												<View
													style={{
														flexDirection: "row",
														alignItems: "center",
														justifyContent: "flex-start",
													}}
												>
													<ThemedText
														variant="h4"
														style={[styles.planName, { color: cfg.color }]}
													>
														{cfg.label}
													</ThemedText>
												</View>
											</View>
										</View>
										{/* Absolute positioned Plans button in top-right of card */}
										<Pressable
											onPress={() => navigation.navigate("Plans")}
											style={styles.planManageBtn}
										>
											<ThemedText style={styles.planManageBtnText}>
												{t("manage") || t("plans") || "Plans"}
											</ThemedText>
										</Pressable>
									</View>
									<View
										style={[
											styles.subscriptionMetaRow,
											{ borderTopColor: subscriptionDividerColor },
										]}
									>
										<ThemedText
											color="secondary"
											style={styles.subscriptionMetaLabel}
										>
											{t("plan_end_time")}
										</ThemedText>
										<ThemedText style={styles.subscriptionMetaValue}>
											{formatDateTime(account?.currentPeriodEnd)}
										</ThemedText>
									</View>
									<View
										style={[
											styles.subscriptionMetaRow,
											{ borderTopColor: subscriptionDividerColor },
										]}
									>
										<ThemedText
											color="secondary"
											style={styles.subscriptionMetaLabel}
										>
											{t("auto_renewal")}
										</ThemedText>
										<ThemedText
											style={[
												styles.subscriptionMetaValue,
												{
													color: account?.autoRenewing ? "#22c55e" : "#ef4444",
												},
											]}
										>
											{account?.autoRenewing
												? t("renews_automatically")
												: t("will_not_renew")}
										</ThemedText>
									</View>
								</Card>
							);
						})()}
					</Animated.View>

					{/* Security Section */}
					<Animated.View
						style={[
							styles.dangerZone,
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
							{t("security_section_title")}
						</ThemedText>

						{/* Reset Statistics */}
						<Pressable
							onPress={() => {
								if (showResetInline) {
									// Hide when pressed again
									Animated.timing(resetInlineAnim, {
										toValue: 0,
										duration: 160,
										useNativeDriver: true,
									}).start(() => setShowResetInline(false));
									return;
								}
								setShowResetInline(true);
								resetInlineAnim.setValue(0);
								Animated.timing(resetInlineAnim, {
									toValue: 1,
									duration: 200,
									useNativeDriver: true,
								}).start(() => {
									scrollRef.current?.scrollToEnd({ animated: true });
								});
							}}
						>
							{({ pressed }) => (
								<Card
									style={[
										styles.securityCard,
										{
											opacity: pressed ? 0.96 : 1,
											transform: [{ scale: pressed ? 0.997 : 1 }],
										},
									]}
								>
									<View style={styles.securityCardContent}>
										<View
											style={[
												styles.securityIconContainer,
												{ backgroundColor: "#f59e0b18" },
											]}
										>
											<Ionicons
												name="refresh-outline"
												size={22}
												color="#f59e0b"
											/>
										</View>
										<View style={styles.securityTextContainer}>
											<ThemedText style={styles.securityTitle}>
												{t("reset_statistics") || "Reset Statistics"}
											</ThemedText>
										</View>
										<Ionicons
											name="chevron-forward"
											size={18}
											color={theme.text.secondary}
										/>
									</View>
								</Card>
							)}
						</Pressable>

						{/* Inline reset confirmation */}
						{showResetInline && (
							<Animated.View
								style={{
									opacity: resetInlineAnim,
									transform: [
										{
											translateY: resetInlineAnim.interpolate({
												inputRange: [0, 1],
												outputRange: [-8, 0],
											}),
										},
									],
								}}
							>
								<View
									style={{
										marginTop: spacing.sm,
										marginBottom: spacing.md,
										flexDirection: "row",
										alignItems: "center",
									}}
								>
									<View style={{ flex: 1, paddingRight: spacing.sm }}>
										<ThemedText numberOfLines={2} ellipsizeMode="tail">
											{t("reset_statistics_confirm") ||
												t("reset_statistics_warning")}
										</ThemedText>
									</View>
									<View
										style={{
											flexDirection: "row",
											width: 92,
											justifyContent: "flex-end",
											gap: spacing.sm,
										}}
									>
										<Pressable
											onPress={() => {
												Animated.timing(resetInlineAnim, {
													toValue: 0,
													duration: 160,
													useNativeDriver: true,
												}).start(() => setShowResetInline(false));
											}}
											style={{ padding: 8, borderRadius: 8 }}
										>
											<Ionicons
												name="close"
												size={20}
												color={theme.error?.main ?? "#ef4444"}
											/>
										</Pressable>
										<Pressable
											onPress={async () => {
												Animated.timing(resetInlineAnim, {
													toValue: 0,
													duration: 160,
													useNativeDriver: true,
												}).start(async () => {
													setShowResetInline(false);
													await handleResetStatistics();
												});
											}}
											style={{ padding: 8, borderRadius: 8 }}
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

						{/* Delete Account */}
						<Pressable
							onPress={() => {
								if (showDeleteInline) {
									// Hide when pressed again
									Animated.timing(deleteInlineAnim, {
										toValue: 0,
										duration: 160,
										useNativeDriver: true,
									}).start(() => setShowDeleteInline(false));
									return;
								}
								setShowDeleteInline(true);
								deleteInlineAnim.setValue(0);
								Animated.timing(deleteInlineAnim, {
									toValue: 1,
									duration: 200,
									useNativeDriver: true,
								}).start(() => {
									scrollRef.current?.scrollToEnd({ animated: true });
								});
							}}
						>
							{({ pressed }) => (
								<Card
									style={[
										styles.securityCard,
										{
											opacity: pressed ? 0.96 : 1,
											transform: [{ scale: pressed ? 0.997 : 1 }],
										},
									]}
								>
									<View style={styles.securityCardContent}>
										<View
											style={[
												styles.securityIconContainer,
												{ backgroundColor: `${theme.error.main}18` },
											]}
										>
											<Ionicons
												name="trash-outline"
												size={22}
												color={theme.error.main}
											/>
										</View>
										<View style={styles.securityTextContainer}>
											<ThemedText style={styles.securityTitle}>
												{t("delete_account")}
											</ThemedText>
										</View>
										<Ionicons
											name="chevron-forward"
											size={18}
											color={theme.text.secondary}
										/>
									</View>
								</Card>
							)}
						</Pressable>

						{/* Inline delete confirmation */}
						{showDeleteInline && (
							<Animated.View
								style={{
									opacity: deleteInlineAnim,
									transform: [
										{
											translateY: deleteInlineAnim.interpolate({
												inputRange: [0, 1],
												outputRange: [-8, 0],
											}),
										},
									],
								}}
							>
								<View
									style={{
										marginTop: spacing.sm,
										marginBottom: spacing.md,
										flexDirection: "row",
										alignItems: "center",
									}}
								>
									<View style={{ flex: 1, paddingRight: spacing.sm }}>
										<ThemedText numberOfLines={2} ellipsizeMode="tail">
											{t("delete_account_warning")}
										</ThemedText>
									</View>
									<View
										style={{
											flexDirection: "row",
											width: 92,
											justifyContent: "flex-end",
											gap: spacing.sm,
										}}
									>
										<Pressable
											onPress={() => {
												Animated.timing(deleteInlineAnim, {
													toValue: 0,
													duration: 160,
													useNativeDriver: true,
												}).start(() => setShowDeleteInline(false));
											}}
											style={{ padding: 8, borderRadius: 8 }}
										>
											<Ionicons
												name="close"
												size={20}
												color={theme.error?.main ?? "#ef4444"}
											/>
										</Pressable>
										<Pressable
											onPress={async () => {
												Animated.timing(deleteInlineAnim, {
													toValue: 0,
													duration: 160,
													useNativeDriver: true,
												}).start(async () => {
													setShowDeleteInline(false);
													await handleDeleteAccount();
												});
											}}
											style={{ padding: 8, borderRadius: 8 }}
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

			{/* Removed modal ConfirmDialogs for reset and delete — using inline confirmations instead */}

			<AlertDialog
				visible={alertConfig.visible}
				title={alertConfig.title}
				message={alertConfig.message}
				variant={alertConfig.variant}
				onClose={handleAlertClose}
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
	profileCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: spacing.lg,
		marginBottom: spacing.md,
	},
	avatar: {
		width: 72,
		height: 72,
		borderRadius: 36,
		justifyContent: "center",
		alignItems: "center",
	},
	avatarImage: {
		width: 72,
		height: 72,
		borderRadius: 36,
	},
	avatarFallback: {
		width: 72,
		height: 72,
		borderRadius: 36,
		justifyContent: "center",
		alignItems: "center",
	},
	displayName: {
		fontSize: 18,
		fontWeight: "700",
	},
	memberSince: {
		marginTop: 6,
		fontSize: 12,
		color: "#9aa4b2",
	},
	avatarText: {
		fontSize: 24,
		fontWeight: "700",
		color: "#fff",
	},
	profileInfo: {
		marginLeft: spacing.md,
		flex: 1,
	},
	subscriptionCard: {
		padding: spacing.md,
		marginBottom: spacing.lg,
	},
	subscriptionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	subscriptionMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: spacing.sm,
		paddingTop: spacing.sm,
		borderTopWidth: 1,
	},
	subscriptionMetaLabel: {
		fontSize: 12,
		flex: 1,
	},
	subscriptionMetaValue: {
		fontSize: 12,
		fontWeight: "600",
		textAlign: "right",
		flex: 1,
	},
	subscriptionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
	},
	subscriptionTop: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing.sm,
	},
	planIconGradient: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	manageBtn: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "transparent",
		backgroundColor: "rgba(255,255,255,0.06)",
	},
	manageBtnText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#fff",
	},
	planManageBtn: {
		position: "absolute",
		top: spacing.sm,
		right: spacing.sm,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: "#3b82f6",
		zIndex: 2,
	},
	planManageBtnText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 13,
	},
	planIconContainer: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	planName: {
		fontWeight: "700",
	},
	createdDate: {
		marginTop: 5,
		fontSize: 12,
	},
	emailText: {
		fontSize: 13,
		marginTop: 0,
	},
	section: {
		marginBottom: spacing.lg,
	},
	sectionTitle: {
		marginBottom: spacing.sm,
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
	dangerZone: {
		marginTop: spacing.lg,
	},
	securityCard: {
		padding: spacing.md,
		borderWidth: 1,
		marginBottom: spacing.sm,
	},
	securityCardContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
	},
	securityIconContainer: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
	},
	securityTextContainer: {
		flex: 1,
	},
	securityTitle: {
		fontSize: 15,
		fontWeight: "600",
	},
	securityDesc: {
		fontSize: 12,
		marginTop: 2,
	},
});

export default AccountScreen;
