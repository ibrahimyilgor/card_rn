import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import auth from "@react-native-firebase/auth";
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

const AccountScreen = ({ navigation, onLogout }) => {
	const { theme } = useTheme();
	const { t } = useI18n();

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [account, setAccount] = useState(null);
	const [plan, setPlan] = useState("free");

	// Password change state
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);

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

	useEffect(() => {
		fetchAccount();
	}, []);

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

			setAccount({
				email: firebaseUser?.email,
				displayName: firebaseUser?.displayName,
				photoURL: firebaseUser?.photoURL,
				created_at: profileResponse.data?.profile?.created_at,
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

	const handleChangePassword = async () => {
		if (!currentPassword || !newPassword || !confirmPassword) {
			showAlert(t("error"), t("all_fields_required"), "danger");
			return;
		}

		if (newPassword !== confirmPassword) {
			showAlert(t("error"), t("passwords_do_not_match"), "danger");
			return;
		}

		if (newPassword.length < 8) {
			showAlert(t("error"), t("password_too_short"), "danger");
			return;
		}

		setSaving(true);
		try {
			const user = getCurrentUser();
			if (!user || !user.email) {
				showAlert(t("error"), t("error_changing_password"), "danger");
				return;
			}

			// Re-authenticate with current password
			const credential = auth.EmailAuthProvider.credential(
				user.email,
				currentPassword,
			);
			await user.reauthenticateWithCredential(credential);

			// Update password
			await user.updatePassword(newPassword);

			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");

			// Show success
			showAlert(t("success"), t("password_changed_successfully"), "success");
		} catch (error) {
			console.error("Password change error:", error);
			let message = t("error_changing_password");
			if (error.code === "auth/wrong-password") {
				message = t("invalid_credentials") || "Current password is incorrect";
			} else if (error.code === "auth/weak-password") {
				message = t("password_too_short") || "Password is too weak";
			}
			showAlert(t("error"), message, "danger");
		} finally {
			setSaving(false);
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
					<View style={styles.header}>
						<ThemedText variant="h2">{t("account")}</ThemedText>
						<ThemedText color="secondary">{t("account_subtitle")}</ThemedText>
					</View>

					{/* Profile Info */}
					<Card style={styles.profileCard}>
						<View
							style={[styles.avatar, { backgroundColor: theme.primary.main }]}
						>
							<ThemedText style={styles.avatarText}>
								{(account?.displayName || account?.email)
									?.charAt(0)
									.toUpperCase() || "U"}
							</ThemedText>
						</View>
						<View style={styles.profileInfo}>
							<ThemedText variant="h3">
								{account?.displayName || account?.email?.split("@")[0]}
							</ThemedText>
							<ThemedText color="secondary" style={styles.emailText}>
								{account?.email}
							</ThemedText>
							{account?.created_at && (
								<ThemedText color="secondary" style={styles.createdDate}>
									{t("member_since")}{" "}
									{new Date(account.created_at).toLocaleDateString()}
								</ThemedText>
							)}
						</View>
					</Card>

					{/* Subscription Status */}
					<Card style={styles.subscriptionCard}>
						<View style={styles.subscriptionRow}>
							<View style={styles.subscriptionHeader}>
								<Ionicons
									name={account?.plan === "free" ? "star-outline" : "star"}
									size={24}
									color={
										account?.plan === "free"
											? theme.text.secondary
											: theme.warning.main
									}
								/>
								<ThemedText variant="h4" style={styles.planName}>
									{account?.plan === "free"
										? t("free_plan")
										: t("premium_plan")}
								</ThemedText>
							</View>
							{account?.plan === "free" && (
								<Button
									variant="outlined"
									size="small"
									onPress={() => navigation.navigate("Plans")}
								>
									{t("upgrade")}
								</Button>
							)}
						</View>
					</Card>

					{/* Change Password */}
					<View style={styles.section}>
						<ThemedText variant="h4" style={styles.sectionTitle}>
							{t("change_password")}
						</ThemedText>

						<Card style={styles.passwordCard}>
							<Input
								label={t("current_password")}
								value={currentPassword}
								onChangeText={setCurrentPassword}
								secureTextEntry={!showCurrentPassword}
								placeholder={t("enter_current_password")}
								rightIcon={
									<Ionicons
										name={
											showCurrentPassword ? "eye-off-outline" : "eye-outline"
										}
										size={20}
										color={theme.text.secondary}
									/>
								}
								onRightIconPress={() =>
									setShowCurrentPassword(!showCurrentPassword)
								}
							/>

							<Input
								label={t("new_password")}
								value={newPassword}
								onChangeText={setNewPassword}
								secureTextEntry={!showNewPassword}
								placeholder={t("enter_new_password")}
								rightIcon={
									<Ionicons
										name={showNewPassword ? "eye-off-outline" : "eye-outline"}
										size={20}
										color={theme.text.secondary}
									/>
								}
								onRightIconPress={() => setShowNewPassword(!showNewPassword)}
							/>

							<Input
								label={t("confirm_password")}
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								secureTextEntry
								placeholder={t("confirm_new_password")}
							/>

							<Button
								onPress={handleChangePassword}
								loading={saving}
								disabled={!currentPassword || !newPassword || !confirmPassword}
								style={styles.changePasswordButton}
							>
								{t("change_password")}
							</Button>
						</Card>
					</View>

					{/* Danger Zone */}
					<View style={styles.dangerZone}>
						<ThemedText
							variant="h4"
							style={[styles.sectionTitle, { color: theme.warning.main }]}
						>
							{t("security_section_title")}
						</ThemedText>

						{/* Reset Statistics */}
						<Card
							style={[
								styles.dangerCard,
								{ borderColor: "#f59e0b", marginBottom: 12 },
							]}
						>
							<ThemedText variant="body1" style={{ fontWeight: "600" }}>
								{t("reset_statistics") || "Reset Statistics"}
							</ThemedText>
							<ThemedText color="secondary" style={styles.dangerDesc}>
								{t("reset_statistics_warning") ||
									"Reset all card statistics and delete study sessions."}
							</ThemedText>
							<View style={styles.dangerButtonRow}>
								<Button
									variant="warning"
									size="small"
									onPress={() => setShowResetDialog(true)}
								>
									{t("reset") || "Reset"}
								</Button>
							</View>
						</Card>

						{/* Delete Account */}
						<Card
							style={[styles.dangerCard, { borderColor: theme.error.main }]}
						>
							<ThemedText variant="body1" style={{ fontWeight: "600" }}>
								{t("delete_account")}
							</ThemedText>
							<ThemedText color="secondary" style={styles.dangerDesc}>
								{t("delete_account_warning")}
							</ThemedText>
							<View style={styles.dangerButtonRow}>
								<Button
									variant="contained"
									size="small"
									onPress={() => setShowDeleteDialog(true)}
									style={{ backgroundColor: theme.error.main }}
									textStyle={{ color: "#fff" }}
								>
									{t("delete")}
								</Button>
							</View>
						</Card>
					</View>
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
	},
	planName: {
		marginLeft: spacing.sm,
	},
	createdDate: {
		marginTop: 2,
		fontSize: 12,
	},
	emailText: {
		fontSize: 13,
		marginTop: 2,
	},
	section: {
		marginBottom: spacing.lg,
	},
	sectionTitle: {
		marginBottom: spacing.sm,
	},
	passwordCard: {
		padding: spacing.lg,
	},
	changePasswordButton: {
		marginTop: spacing.sm,
	},
	dangerZone: {
		marginTop: spacing.lg,
	},
	dangerCard: {
		padding: spacing.lg,
		borderWidth: 1,
	},
	dangerDesc: {
		marginTop: 4,
		fontSize: 13,
	},
	dangerButtonRow: {
		flexDirection: "row",
		justifyContent: "flex-end",
		marginTop: spacing.md,
	},
});

export default AccountScreen;
