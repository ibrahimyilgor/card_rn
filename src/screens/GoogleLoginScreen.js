import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	Image,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { authHelpers } from "../services/api";
import { signInWithGoogle, getErrorMessage } from "../services/firebase";
import { ThemedText, Card } from "../components/ui";
import { spacing, borderRadius } from "../styles/theme";

// Feature item component
const FeatureItem = ({ icon, iconColor, title, description, theme }) => (
	<View style={styles.featureItem}>
		<View
			style={[
				styles.featureIconContainer,
				{ backgroundColor: iconColor + "20" },
			]}
		>
			{icon}
		</View>
		<View style={styles.featureText}>
			<ThemedText style={styles.featureTitle}>{title}</ThemedText>
			<ThemedText color="secondary" style={styles.featureDesc}>
				{description}
			</ThemedText>
		</View>
	</View>
);

const GoogleLoginScreen = ({ onLogin }) => {
	const { theme } = useTheme();
	const { t } = useI18n();

	const [googleLoading, setGoogleLoading] = useState(false);
	const [error, setError] = useState("");

	// Entrance animations
	const logoScale = useRef(new Animated.Value(0.3)).current;
	const logoOpacity = useRef(new Animated.Value(0)).current;
	const cardTranslateY = useRef(new Animated.Value(40)).current;
	const cardOpacity = useRef(new Animated.Value(0)).current;
	const featuresOpacity = useRef(new Animated.Value(0)).current;
	const featuresTranslateY = useRef(new Animated.Value(30)).current;

	useEffect(() => {
		// Logo bounce in
		Animated.parallel([
			Animated.spring(logoScale, {
				toValue: 1,
				useNativeDriver: true,
				speed: 8,
				bounciness: 10,
			}),
			Animated.timing(logoOpacity, {
				toValue: 1,
				duration: 400,
				useNativeDriver: true,
			}),
		]).start();

		// Card slide up
		Animated.parallel([
			Animated.spring(cardTranslateY, {
				toValue: 0,
				delay: 200,
				useNativeDriver: true,
				speed: 12,
				bounciness: 4,
			}),
			Animated.timing(cardOpacity, {
				toValue: 1,
				duration: 400,
				delay: 200,
				useNativeDriver: true,
			}),
		]).start();

		// Features fade in
		Animated.parallel([
			Animated.timing(featuresOpacity, {
				toValue: 1,
				duration: 500,
				delay: 400,
				useNativeDriver: true,
			}),
			Animated.spring(featuresTranslateY, {
				toValue: 0,
				delay: 400,
				useNativeDriver: true,
				speed: 12,
				bounciness: 4,
			}),
		]).start();
	}, []);

	const handleGoogleLogin = async () => {
		setGoogleLoading(true);
		setError("");

		try {
			await signInWithGoogle();
			// Google accounts are always verified
			await authHelpers.syncWithBackend();
			onLogin();
		} catch (err) {
			console.error("Google login error:", err);
			const errorKey = getErrorMessage(err);
			if (errorKey !== "sign_in_cancelled") {
				setError(t(errorKey) || t("network_error"));
			}
		} finally {
			setGoogleLoading(false);
		}
	};

	const features = [
		{
			icon: <Ionicons name="bulb" size={22} color="#3b82f6" />,
			iconColor: "#3b82f6",
			title: t("adaptable_performance"),
			desc: t("adaptable_performance_desc"),
		},
		{
			icon: <Ionicons name="stats-chart" size={22} color="#22c55e" />,
			iconColor: "#22c55e",
			title: t("built_to_last"),
			desc: t("built_to_last_desc"),
		},
		{
			icon: <Ionicons name="sparkles" size={22} color="#8b5cf6" />,
			iconColor: "#8b5cf6",
			title: t("great_account_experience"),
			desc: t("great_account_experience_desc"),
		},
		{
			icon: <Ionicons name="game-controller" size={22} color="#ec4899" />,
			iconColor: "#ec4899",
			title: t("innovative_functionality"),
			desc: t("innovative_functionality_desc"),
		},
	];

	return (
		<LinearGradient colors={theme.background.gradient} style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Logo & Title */}
					<Animated.View style={[styles.header, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
						<Image
							source={require("../../assets/memodeck.png")}
							style={styles.logo}
							resizeMode="contain"
						/>
						<ThemedText variant="h1" style={styles.title}>
							MemoDeck
						</ThemedText>
						<ThemedText color="secondary" style={styles.tagline}>
							{t("tagline")}
						</ThemedText>
					</Animated.View>

					{/* Login Card */}
					<Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }}>
					<Card variant="elevated" style={styles.card}>
						<ThemedText variant="h3" style={styles.cardTitle}>
							{t("welcome_back")}
						</ThemedText>
						<ThemedText color="secondary" style={styles.cardSubtitle}>
							{t("login_subtitle")}
						</ThemedText>

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

						{/* Google Sign In Button */}
						<Pressable
							onPress={handleGoogleLogin}
							disabled={googleLoading}
							style={[
								styles.googleButton,
								{
									backgroundColor: theme.background.paper,
									borderColor: theme.border.main,
								},
							]}
						>
							{googleLoading ? (
								<View style={styles.googleLoading}>
									<ThemedText color="secondary">
										{t("signing_in") || "Signing in..."}
									</ThemedText>
								</View>
							) : (
								<View style={styles.googleButtonContent}>
									<Ionicons name="logo-google" size={20} color="#4285F4" />
									<ThemedText style={styles.googleButtonText}>
										{t("continue_with_google") || "Continue with Google"}
									</ThemedText>
								</View>
							)}
						</Pressable>
					</Card>
					</Animated.View>

					{/* Features */}
					<Animated.View style={[styles.features, { opacity: featuresOpacity, transform: [{ translateY: featuresTranslateY }] }]}>
						{features.map((feature, index) => (
							<FeatureItem
								key={index}
								icon={feature.icon}
								iconColor={feature.iconColor}
								title={feature.title}
								description={feature.desc}
								theme={theme}
							/>
						))}
					</Animated.View>
				</ScrollView>
			</SafeAreaView>
		</LinearGradient>
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
		flexGrow: 1,
		padding: spacing.lg,
	},
	header: {
		alignItems: "center",
		marginBottom: spacing.xl,
		marginTop: spacing.md,
	},
	logo: {
		width: 100,
		height: 100,
		borderRadius: 20,
		marginBottom: spacing.md,
	},
	title: {
		marginBottom: spacing.xs,
		fontWeight: "700",
	},
	tagline: {
		fontSize: 15,
		textAlign: "center",
	},
	card: {
		padding: spacing.xl,
		marginBottom: spacing.xl,
	},
	cardTitle: {
		textAlign: "center",
		marginBottom: spacing.xs,
		fontWeight: "700",
	},
	cardSubtitle: {
		textAlign: "center",
		marginBottom: spacing.lg,
		fontSize: 14,
	},
	errorContainer: {
		flexDirection: "row",
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: borderRadius.md,
		marginBottom: spacing.md,
		gap: spacing.xs,
	},
	errorText: {
		fontSize: 14,
		flex: 1,
	},
	googleButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		borderWidth: 1,
	},
	googleButtonContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	googleButtonText: {
		fontWeight: "600",
		fontSize: 15,
	},
	googleLoading: {
		alignItems: "center",
	},
	features: {
		gap: spacing.lg,
	},
	featureItem: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: spacing.md,
	},
	featureIconContainer: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	featureText: {
		flex: 1,
	},
	featureTitle: {
		fontWeight: "600",
		marginBottom: 4,
		fontSize: 15,
	},
	featureDesc: {
		fontSize: 13,
		lineHeight: 19,
	},
});

export default GoogleLoginScreen;
