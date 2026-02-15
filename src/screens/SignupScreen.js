import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { authHelpers } from "../services/api";
import {
	signUp,
	signInWithGoogle,
	getErrorMessage,
} from "../services/firebase";

import { ThemedText, Button, Input, Card } from "../components/ui";
import { spacing, borderRadius } from "../styles/theme";

const SignupScreen = ({ navigation, onLogin }) => {
	const { theme } = useTheme();
	const { t } = useI18n();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [googleLoading, setGoogleLoading] = useState(false);

	return (
		<LinearGradient colors={theme.background.gradient} style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.keyboardView}
				>
					<ScrollView
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						{/* Back Button */}
						<Pressable
							onPress={() => navigation.goBack()}
							style={styles.backButton}
						>
							<Ionicons
								name="arrow-back"
								size={24}
								color={theme.text.primary}
							/>
						</Pressable>

						{/* Header */}
						<View style={styles.header}>
							<Image
								source={require("../../assets/memodeck.png")}
								style={styles.logo}
								resizeMode="contain"
							/>
							<ThemedText variant="h1">MemoDeck</ThemedText>
							<ThemedText color="secondary">{t("tagline")}</ThemedText>
						</View>

						{/* Card */}
						<Card variant="elevated" style={styles.card}>
							<ThemedText variant="h3">{t("create_account")}</ThemedText>
							<ThemedText color="secondary">{t("signup_subtitle")}</ThemedText>

							<Input
								label={t("email")}
								value={email}
								onChangeText={setEmail}
								autoCapitalize="none"
								keyboardType="email-address"
								leftIcon={
									<Ionicons
										name="mail-outline"
										size={20}
										color={theme.text.secondary}
									/>
								}
							/>

							<Input
								label={t("password")}
								value={password}
								onChangeText={setPassword}
								secureTextEntry
								helperText={t("password_rule_helper_text")}
								leftIcon={
									<Ionicons
										name="lock-closed-outline"
										size={20}
										color={theme.text.secondary}
									/>
								}
							/>

							<Input
								label={t("confirm_password")}
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								secureTextEntry
								leftIcon={
									<Ionicons
										name="lock-closed-outline"
										size={20}
										color={theme.text.secondary}
									/>
								}
							/>

							{error ? (
								<View
									style={[
										styles.errorContainer,
										{ backgroundColor: theme.error.main + "15" },
									]}
								>
									<Ionicons
										name="alert-circle"
										size={18}
										color={theme.error.main}
									/>
									<Text style={[styles.errorText, { color: theme.error.main }]}>
										{error}
									</Text>
								</View>
							) : null}

							{/* Google Button */}
							<Pressable
								disabled={googleLoading}
								style={[
									styles.googleButton,
									{
										backgroundColor: theme.background.paper,
										borderColor: theme.border.main,
									},
								]}
								onPress={async () => {
									setGoogleLoading(true);
									setError("");
									try {
										await signInWithGoogle();
										await authHelpers.syncWithBackend();
										onLogin();
									} catch (err) {
										const key = getErrorMessage(err);
										if (key !== "sign_in_cancelled") {
											setError(t(key) || t("network_error"));
										}
									} finally {
										setGoogleLoading(false);
									}
								}}
							>
								{googleLoading ? (
									<ThemedText color="secondary">{t("signing_up")}</ThemedText>
								) : (
									<View style={styles.googleButtonContent}>
										<Ionicons name="logo-google" size={20} color="#4285F4" />
										<ThemedText style={styles.googleButtonText}>
											{t("continue_with_google")}
										</ThemedText>
									</View>
								)}
							</Pressable>
						</Card>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</LinearGradient>
	);
};

export default SignupScreen;

const styles = StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	keyboardView: { flex: 1 },
	scrollContent: { padding: spacing.lg },
	backButton: { marginBottom: spacing.md },
	header: { alignItems: "center", marginBottom: spacing.lg },
	logo: { width: 80, height: 80, marginBottom: spacing.sm },
	card: { padding: spacing.lg },
	errorContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		padding: spacing.sm,
		borderRadius: borderRadius.md,
		marginTop: spacing.sm,
	},
	errorText: { fontSize: 13 },
	googleButton: {
		marginTop: spacing.md,
		padding: spacing.md,
		borderRadius: borderRadius.md,
		borderWidth: 1,
		alignItems: "center",
	},
	googleButtonContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	googleButtonText: {
		fontWeight: "600",
	},
});
