import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Alert,
	Animated,
	Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

// Module-level flag to persist animation state across remounts
let _accountAnimated = false;

const AccountScreen = ({ navigation, onLogout }) => {
	const { theme } = useTheme();
	const { t } = useI18n();

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

	// Entrance animations (preserve finished state across remounts)
	const headerAnim = useRef(
		new Animated.Value(_accountAnimated ? 1 : 0),
	).current;
	const profileAnim = useRef(
		new Animated.Value(_accountAnimated ? 1 : 0),
	).current;
	const avatarScale = useRef(
		new Animated.Value(_accountAnimated ? 1 : 0.5),
	).current;
	const sectionAnims = useRef([
		new Animated.Value(_accountAnimated ? 1 : 0),
		new Animated.Value(_accountAnimated ? 1 : 0),
	]).current;

	useEffect(() => {
		fetchAccount();
	}, []);

	useEffect(() => {
		if (_accountAnimated) return; // already animated this session
		if (!loading) {
			// Start entrance animations when data is loaded
			Animated.timing(headerAnim, {
				toValue: 1,
				duration: 350,
				useNativeDriver: true,
			}).start();

			Animated.spring(profileAnim, {
				toValue: 1,
				delay: 100,
				useNativeDriver: true,
				speed: 12,
				bounciness: 4,
			}).start();

			Animated.spring(avatarScale, {
				toValue: 1,
				delay: 200,
				useNativeDriver: true,
				speed: 8,
				bounciness: 10,
			}).start();

			sectionAnims.forEach((anim, index) => {
				Animated.spring(anim, {
					toValue: 1,
					delay: 250 + index * 100,
					useNativeDriver: true,
					speed: 14,
					bounciness: 3,
				}).start();
			});

			_accountAnimated = true;
		}
	}, [loading]);

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
			return new Date(dateStr).toLocaleDateString(undefined, {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch (e) {
			return new Date(dateStr).toLocaleDateString();
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
		return (
			<ThemedView variant="gradient" style={styles.container}>
				<LoadingState fullScreen message={t("loading")} />
			</ThemedView>
		);
	}

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
							<Ionicons name="person" size={26} color={theme.primary.main} />
							<ThemedText variant="h2" style={styles.headerTitleText}>
								{t("account")}
							</ThemedText>
						</View>
						<ThemedText color="secondary">{t("account_subtitle")}</ThemedText>
					</Animated.View>

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
								style={[
									styles.avatar,
									{
										backgroundColor: theme.primary.main,
										transform: [{ scale: avatarScale }],
									},
								]}
							>
								<ThemedText style={styles.avatarText}>
									{(account?.displayName || account?.email)
										?.charAt(0)
										.toUpperCase() || "U"}
								</ThemedText>
							</Animated.View>
							<View style={styles.profileInfo}>
								<ThemedText variant="h3">
									{account?.displayName || account?.email?.split("@")[0]}
								</ThemedText>
								<ThemedText color="secondary" style={styles.emailText}>
									{account?.email}
								</ThemedText>
								{account?.created_at && (
									<ThemedText color="secondary" style={styles.createdDate}>
										{t("member_since")} {formatDate(account.created_at)}
									</ThemedText>
								)}
							</View>
						</Card>
					</Animated.View>

					{/* Subscription Status */}
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
						<Pressable onPress={() => navigation.navigate("Plans")}>
							{({ pressed }) => {
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
												opacity: pressed ? 0.92 : 1,
												transform: [{ scale: pressed ? 0.995 : 1 }],
											},
										]}
									>
										<View style={styles.subscriptionRow}>
											<View style={styles.subscriptionHeader}>
												<View
													style={[
														styles.planIconContainer,
														{ backgroundColor: `${cfg.color}18` },
													]}
												>
													<Ionicons
														name={cfg.icon}
														size={22}
														color={cfg.color}
													/>
												</View>
												<View>
													<ThemedText
														color="secondary"
														style={{ fontSize: 12 }}
													>
														{t("subscription") || "Subscription"}
													</ThemedText>
													<ThemedText
														variant="h4"
														style={[styles.planName, { color: cfg.color }]}
													>
														{cfg.label}
													</ThemedText>
												</View>
											</View>
											<Ionicons
												name="chevron-forward"
												size={20}
												color={theme.text.secondary}
											/>
										</View>
									</Card>
								);
							}}
						</Pressable>
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
						<Pressable onPress={() => setShowResetDialog(true)}>
							{({ pressed }) => (
								<Card
									style={[
										styles.securityCard,
										{
											borderColor: "#f59e0b30",
											backgroundColor: "#f59e0b08",
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
											<ThemedText color="secondary" style={styles.securityDesc}>
												{t("reset_statistics_warning") ||
													"Reset all card statistics and delete study sessions."}
											</ThemedText>
										</View>
										<Ionicons
											name="chevron-forward"
											size={18}
											color="#f59e0b"
										/>
									</View>
								</Card>
							)}
						</Pressable>

						{/* Delete Account */}
						<Pressable onPress={() => setShowDeleteDialog(true)}>
							{({ pressed }) => (
								<Card
									style={[
										styles.securityCard,
										{
											borderColor: `${theme.error.main}30`,
											backgroundColor: `${theme.error.main}08`,
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
											<ThemedText color="secondary" style={styles.securityDesc}>
												{t("delete_account_warning")}
											</ThemedText>
										</View>
										<Ionicons
											name="chevron-forward"
											size={18}
											color={theme.error.main}
										/>
									</View>
								</Card>
							)}
						</Pressable>
					</Animated.View>
				</ScrollView>
			</SafeAreaView>

			<ConfirmDialog
				visible={showDeleteDialog}
				title={t("delete_account")}
				message={t("delete_account_message")}
				confirmLabel={t("delete")}
				cancelLabel={t("cancel")}
				onConfirm={handleDeleteAccount}
				onClose={() => setShowDeleteDialog(false)}
				confirmVariant="danger"
				loading={deleting}
			/>

			<ConfirmDialog
				visible={showResetDialog}
				title={t("reset_statistics") || "Reset Statistics"}
				message={
					t("reset_statistics_confirm") ||
					"Are you sure you want to reset all statistics? This action cannot be undone."
				}
				confirmLabel={t("reset") || "Reset"}
				cancelLabel={t("cancel")}
				onConfirm={handleResetStatistics}
				onClose={() => setShowResetDialog(false)}
				confirmVariant="warning"
				loading={resetting}
			/>

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
		width: 60,
		height: 60,
		borderRadius: 30,
		justifyContent: "center",
		alignItems: "center",
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
	subscriptionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
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
