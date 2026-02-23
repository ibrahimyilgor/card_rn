import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Dimensions,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { accountAPI } from "../services/api";
import {
	ThemedView,
	ThemedText,
	Card,
	Button,
	LoadingState,
} from "../components/ui";
import { spacing, borderRadius } from "../styles/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";

const { width } = Dimensions.get("window");

const PlansScreen = ({ navigation }) => {
	const { theme } = useTheme();
	const { t } = useI18n();

	const [loading, setLoading] = useState(true);
	const [currentPlan, setCurrentPlan] = useState("free");
	const [plans, setPlans] = useState([]);

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

	// Convert hex color to rgba string with specified alpha
	const hexToRgba = (hex, alpha = 1) => {
		const sanitized = hex.replace("#", "");
		const bigint = parseInt(sanitized, 16);
		const r = (bigint >> 16) & 255;
		const g = (bigint >> 8) & 255;
		const b = bigint & 255;
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	};

	// Animations
	const headerAnim = useRef(new Animated.Value(0)).current;
	const planAnims = useRef([
		new Animated.Value(0),
		new Animated.Value(0),
		new Animated.Value(0),
	]).current;
	const infoAnim = useRef(new Animated.Value(0)).current;

	const startAnimations = () => {
		Animated.timing(headerAnim, {
			toValue: 1,
			duration: 350,
			useNativeDriver: true,
		}).start();

		planAnims.forEach((anim, index) => {
			Animated.spring(anim, {
				toValue: 1,
				delay: 150 + index * 120,
				useNativeDriver: true,
				speed: 12,
				bounciness: 4,
			}).start();
		});

		Animated.timing(infoAnim, {
			toValue: 1,
			duration: 400,
			delay: 600,
			useNativeDriver: true,
		}).start();
	};

	useEffect(() => {
		fetchPlansData();
	}, []);

	const fetchPlansData = async () => {
		try {
			const [plansResponse, myPlanResponse] = await Promise.all([
				accountAPI.getPlans(),
				accountAPI.getCurrentPlan(),
			]);

			// Get plans from backend
			const backendPlans = plansResponse.data?.plans || [];

			// Map backend plans to display format
			const formattedPlans = backendPlans.map((plan) => ({
				id: plan.code,
				name: plan.code.toUpperCase()[0] + plan.code.slice(1), // Capitalize first letter
				price: plan.price_monthly === 0 ? "$0" : `$${plan.price_monthly}`,
				period: plan.price_monthly === 0 ? t("forever") : t("per_month"),
				description: plan.description,
				maxDecks: plan.max_decks,
				maxFlashcards: plan.max_flashcards,
				advancedStats: plan.advanced_stats,
				features: getFeaturesList(plan),
				// Show recommended badge for Pro (not Premium)
				recommended: false,
			}));

			setPlans(formattedPlans);

			// Get current plan
			const userPlan = myPlanResponse.data?.plan;
			setCurrentPlan(userPlan?.code || "free");
		} catch (error) {
			console.error("Error fetching plans:", error);
		} finally {
			setLoading(false);
			startAnimations();
		}
	};

	// Helper to generate features list from plan data
	const getFeaturesList = (plan) => {
		const features = [];

		// Decks
		if (plan.max_decks === null) {
			features.push({
				text: t("plan_feature_unlimited_decks"),
				included: true,
			});
		} else {
			features.push({
				text: t("plan_feature_decks", { count: plan.max_decks }),
				included: true,
			});
		}

		// Flashcards
		if (plan.max_flashcards === null) {
			features.push({
				text: t("plan_feature_unlimited_cards"),
				included: true,
			});
		} else {
			features.push({
				text: t("plan_feature_cards", { count: plan.max_flashcards }),
				included: true,
			});
		}

		// Advanced stats row: show for all plans, but inactive for free
		if (plan.code === "premium") {
			features.push({
				text: plan.advanced_stats
					? t("plan_feature_advanced_stats")
					: t("plan_feature_basic_stats"),
				included: true,
			});
		}

		// Advanced stats row: show for all plans, but inactive for free
		if (plan.code !== "free") {
			features.push({
				text: plan.no_ads ? t("plan_feature_no_ads") : t("plan_feature_no_ads"),
				included: true,
			});
		}

		// For premium plan add special "All features included" row
		if (plan.code === "premium") {
			features.push({
				text: t("all_features_included") || "All features included",
				included: true,
				allIncluded: true,
			});
		}

		return features;
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
							<MaterialCommunityIcons
								name="calendar"
								size={28}
								color={theme.primary.main}
							/>
							<ThemedText variant="h2" style={styles.headerTitleText}>
								{t("plans_title")}
							</ThemedText>
						</View>
						<ThemedText color="secondary">{t("plans_subtitle")}</ThemedText>
					</Animated.View>

					{/* Plans */}
					<View style={styles.plansContainer}>
						{plans.map((plan, planIndex) => (
							<Animated.View
								key={plan.id}
								style={[
									styles.planWrapper,
									{
										opacity: planAnims[planIndex] || planAnims[0],
										transform: [
											{
												translateY: (
													planAnims[planIndex] || planAnims[0]
												).interpolate({
													inputRange: [0, 1],
													outputRange: [30, 0],
												}),
											},
											{
												scale: (
													planAnims[planIndex] || planAnims[0]
												).interpolate({
													inputRange: [0, 1],
													outputRange: [0.95, 1],
												}),
											},
										],
									},
								]}
							>
								{plan.recommended && (
									<LinearGradient
										colors={[theme.primary.main, theme.secondary.main]}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
										style={styles.recommendedBadge}
									>
										<Ionicons name="star" size={12} color="#fff" />
										<ThemedText style={styles.recommendedText}>
											{t("recommended")}
										</ThemedText>
									</LinearGradient>
								)}

								<Card
									style={[
										styles.planCard,
										plan.recommended && styles.recommendedCard,
										currentPlan === plan.id && {
											borderColor: getPlanColor(plan.id),
											borderWidth: 2,
											backgroundColor: hexToRgba(getPlanColor(plan.id), 0.06),
										},
									]}
								>
									{currentPlan === plan.id && (
										<View
											style={[
												styles.inCardCurrentBadge,
												{ backgroundColor: getPlanColor(plan.id) },
											]}
										>
											<ThemedText style={styles.inCardCurrentText}>
												{t("current_plan")}
											</ThemedText>
										</View>
									)}
									{/* Plan Header */}
									<View style={styles.planHeader}>
										<ThemedText variant="h3">{plan.name}</ThemedText>
										<View style={styles.priceContainer}>
											<ThemedText
												style={[styles.price, { color: getPlanColor(plan.id) }]}
											>
												{plan.id === "free" ? t("free") : plan.price}
											</ThemedText>
											{plan.id !== "free" && (
												<ThemedText color="secondary" style={styles.period}>
													/{plan.period}
												</ThemedText>
											)}
										</View>
									</View>
									<ThemedText color="secondary" style={styles.period}>
										{t("plan_description_" + plan.id)}
									</ThemedText>
									{/* Divider */}
									{/* <View
										style={[styles.divider, { backgroundColor: theme.divider }]}
									/> */}

									{/* Features */}
									<View style={styles.features}>
										{plan.features.map((feature, index) => {
											// color mapping per plan id for included features
											const includedColor =
												plan.id === "free"
													? "#2563eb"
													: plan.id === "pro"
														? "#d97706"
														: plan.id === "premium"
															? "#7c3aed"
															: theme.success.main;

											const iconName = feature.allIncluded
												? "infinite"
												: feature.included
													? "checkmark-circle"
													: "close-circle";

											const iconColor = feature.included
												? includedColor
												: theme.text.disabled;

											return (
												<View key={index} style={styles.featureRow}>
													<Ionicons
														name={iconName}
														size={20}
														color={iconColor}
													/>
													<ThemedText
														style={[
															styles.featureText,
															!feature.included && {
																color: theme.text.disabled,
															},
														]}
													>
														{feature.text}
													</ThemedText>
												</View>
											);
										})}
									</View>

									{/* CTA Button */}
									{currentPlan === plan.id ? (
										<></>
									) : (
										(() => {
											const order = ["free", "pro", "premium"];
											const currentIndex = order.indexOf(currentPlan);
											const targetIndex = order.indexOf(plan.id);
											const label =
												targetIndex > currentIndex
													? t("upgrade")
													: t("downgrade");
											return (
												<Button
													variant={plan.recommended ? "contained" : "outlined"}
													onPress={() => {
														// Handle subscription - would integrate with in-app purchases
														// For now, just show an alert
														alert(t("coming_soon"));
													}}
													style={styles.ctaButton}
												>
													{label}
												</Button>
											);
										})()
									)}
								</Card>
							</Animated.View>
						))}
					</View>

					{/* Info */}
					<Animated.View
						style={{
							opacity: infoAnim,
							transform: [
								{
									translateY: infoAnim.interpolate({
										inputRange: [0, 1],
										outputRange: [15, 0],
									}),
								},
							],
						}}
					>
						<Card style={styles.infoCard}>
							<Ionicons
								name="information-circle-outline"
								size={24}
								color={theme.primary.main}
							/>
							<View style={styles.infoContent}>
								<ThemedText variant="body2" color="secondary">
									{t("plans_info")}
								</ThemedText>
							</View>
						</Card>
					</Animated.View>
				</ScrollView>
			</SafeAreaView>
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
		marginBottom: spacing.xl,
		alignItems: "flex-start",
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
	plansContainer: {
		gap: spacing.lg,
	},
	planWrapper: {
		position: "relative",
	},
	recommendedBadge: {
		position: "absolute",
		top: -12,
		alignSelf: "center",
		zIndex: 1,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.full,
		gap: 4,
	},
	recommendedText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "700",
	},
	planCard: {
		padding: spacing.lg,
	},
	recommendedCard: {
		paddingTop: spacing.xl,
	},
	planHeader: {
		// alignItems: "center",
		// marginBottom: spacing.md,
	},
	priceContainer: {
		flexDirection: "row",
		alignItems: "baseline",
		marginTop: spacing.xs,
		minHeight: 75,
	},
	price: {
		fontSize: 32,
		fontWeight: 900,
		lineHeight: 40,
	},
	period: {
		fontSize: 14,
		marginLeft: 4,
		marginBottom: 35,
		marginTop: -15,
	},
	divider: {
		height: 1,
		marginVertical: spacing.md,
	},
	features: {
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	featureText: {
		flex: 1,
		fontSize: 14,
	},
	inCardCurrentBadge: {
		position: "absolute",
		top: 12,
		right: 12,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: 10,
		zIndex: 3,
		alignItems: "center",
		justifyContent: "center",
	},
	inCardCurrentText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 10,
	},
	currentPlanBadge: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderRadius: borderRadius.md,
		gap: spacing.xs,
	},
	currentPlanText: {
		fontWeight: "600",
	},
	ctaButton: {
		marginTop: spacing.sm,
	},
	infoCard: {
		marginTop: spacing.xl,
		padding: spacing.md,
		flexDirection: "row",
		alignItems: "flex-start",
	},
	infoContent: {
		flex: 1,
		marginLeft: spacing.sm,
	},
});

export default PlansScreen;
