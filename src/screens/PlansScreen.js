import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
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
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const PlansScreen = ({ navigation }) => {
	const { theme } = useTheme();
	const { t } = useI18n();

	const [loading, setLoading] = useState(true);
	const [currentPlan, setCurrentPlan] = useState("free");
	const [plans, setPlans] = useState([]);

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
				name:
					plan.code === "free"
						? t("free_plan")
						: plan.code === "pro"
						? t("pro_plan")
						: t("premium_plan"),
				price: plan.price_monthly === 0 ? "$0" : `$${plan.price_monthly}`,
				period: plan.price_monthly === 0 ? t("forever") : t("per_month"),
				description: plan.description,
				maxDecks: plan.max_decks,
				maxFlashcards: plan.max_flashcards,
				advancedStats: plan.advanced_stats,
				features: getFeaturesList(plan),
				recommended: plan.code === "premium",
			}));

			setPlans(formattedPlans);

			// Get current plan
			const userPlan = myPlanResponse.data?.plan;
			setCurrentPlan(userPlan?.code || "free");
		} catch (error) {
			console.error("Error fetching plans:", error);
		} finally {
			setLoading(false);
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
		if (plan.code === "free") {
			features.push({ text: t("plan_feature_advanced_stats"), included: false });
		} else {
			features.push({
				text: plan.advanced_stats
					? t("plan_feature_advanced_stats")
					: t("plan_feature_basic_stats"),
				included: true,
			});
		}

		// No-ads only for paid plans
		features.push({ text: t("plan_feature_no_ads"), included: plan.code !== "free" });

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
					<View style={styles.header}>
						<ThemedText variant="h2">{t("subscription_plans")}</ThemedText>
						<ThemedText color="secondary">{t("plans_subtitle")}</ThemedText>
					</View>

					{/* Plans */}
					<View style={styles.plansContainer}>
						{plans.map((plan) => (
							<View key={plan.id} style={styles.planWrapper}>
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
											borderColor: theme.success.main,
											borderWidth: 2,
										},
									]}
								>
									{/* Plan Header */}
									<View style={styles.planHeader}>
										<ThemedText variant="h3">{plan.name}</ThemedText>
										<View style={styles.priceContainer}>
											<ThemedText style={styles.price}>{plan.price}</ThemedText>
											<ThemedText color="secondary" style={styles.period}>
												/{plan.period}
											</ThemedText>
										</View>
									</View>

									{/* Divider */}
									<View
										style={[styles.divider, { backgroundColor: theme.divider }]}
									/>

									{/* Features */}
									<View style={styles.features}>
										{plan.features.map((feature, index) => (
											<View key={index} style={styles.featureRow}>
												<Ionicons
													name={
														feature.included
															? "checkmark-circle"
															: "close-circle"
													}
													size={20}
													color={
														feature.included
															? theme.success.main
															: theme.text.disabled
													}
												/>
												<ThemedText
													style={[
														styles.featureText,
														!feature.included && { color: theme.text.disabled },
													]}
												>
													{feature.text}
												</ThemedText>
											</View>
										))}
									</View>

									{/* CTA Button */}
									{currentPlan === plan.id ? (
										<View
											style={[
												styles.currentPlanBadge,
												{ backgroundColor: theme.success.main + "20" },
											]}
										>
											<Ionicons
												name="checkmark-circle"
												size={18}
												color={theme.success.main}
											/>
											<ThemedText
												style={[
													styles.currentPlanText,
													{ color: theme.success.main },
												]}
											>
												{t("current_plan")}
											</ThemedText>
										</View>
									) : (
										<Button
											variant={plan.recommended ? "contained" : "outlined"}
											onPress={() => {
												// Handle subscription - would integrate with in-app purchases
												// For now, just show an alert
												alert(t("coming_soon"));
											}}
											style={styles.ctaButton}
										>
											{plan.id === "free" ? t("downgrade") : t("upgrade")}
										</Button>
									)}
								</Card>
							</View>
						))}
					</View>

					{/* Info */}
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
		alignItems: "center",
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
		alignItems: "center",
		marginBottom: spacing.md,
	},
	priceContainer: {
		flexDirection: "row",
		alignItems: "baseline",
		marginTop: spacing.xs,
		minHeight: 50,
	},
	price: {
		fontSize: 32,
		fontWeight: "700",
		lineHeight: 40,
	},
	period: {
		fontSize: 14,
		marginLeft: 4,
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
