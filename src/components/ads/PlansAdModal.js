import React, { useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	TouchableOpacity,
	ScrollView,
	Animated,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useI18n } from "../../context/I18nContext";
import { accountAPI } from "../../services/api";
import { spacing, borderRadius } from "../../styles/theme";

const BLOCK_DURATION_SEC = 10;

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

const getPlanIcon = (code) => {
	switch (code) {
		case "pro":
			return "star";
		case "premium":
			return "medal-outline";
		default:
			return "reader-outline";
	}
};

const PlansAdModal = ({ visible, onClose, onUpgrade }) => {
	const { theme } = useTheme();
	const { t } = useI18n();

	const [secondsLeft, setSecondsLeft] = useState(BLOCK_DURATION_SEC);
	const [plans, setPlans] = useState([]);
	const [currentPlan, setCurrentPlan] = useState("free");
	const [loading, setLoading] = useState(true);
	const intervalRef = useRef(null);
	const fadeAnim = useRef(new Animated.Value(0)).current;

	const hexToRgba = (hex, alpha) => {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	};

	const getFeaturesList = (plan) => {
		const features = [];
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
		if (plan.code === "premium") {
			features.push({ text: t("plan_feature_advanced_stats"), included: true });
		}
		if (plan.code !== "free") {
			features.push({ text: t("plan_feature_no_ads"), included: true });
		}
		if (plan.code === "premium") {
			features.push({
				text: t("all_features_included") || "All features included",
				included: true,
				allIncluded: true,
			});
		}
		return features;
	};

	const fetchPlans = async () => {
		try {
			setLoading(true);
			const [plansRes, myPlanRes] = await Promise.all([
				accountAPI.getPlans(),
				accountAPI.getCurrentPlan(),
			]);
			const backendPlans = plansRes.data?.plans || [];
			const formatted = backendPlans.map((plan) => ({
				id: plan.code,
				name: plan.code.charAt(0).toUpperCase() + plan.code.slice(1),
				price: plan.price_monthly === 0 ? "$0" : `$${plan.price_monthly}`,
				period: plan.price_monthly === 0 ? t("forever") : t("per_month"),
				color: getPlanColor(plan.code),
				icon: getPlanIcon(plan.code),
				features: getFeaturesList(plan),
			}));
			setPlans(formatted);
			setCurrentPlan(myPlanRes.data?.plan?.code || "free");
		} catch (e) {
			console.error("PlansAdModal fetchPlans error:", e);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!visible) {
			clearInterval(intervalRef.current);
			setSecondsLeft(BLOCK_DURATION_SEC);
			fadeAnim.setValue(0);
			return;
		}

		fetchPlans();

		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 300,
			useNativeDriver: true,
		}).start();

		setSecondsLeft(BLOCK_DURATION_SEC);
		intervalRef.current = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					clearInterval(intervalRef.current);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(intervalRef.current);
	}, [visible]);

	const closeAllowed = secondsLeft === 0;

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent={false}
			statusBarTranslucent
		>
			<Animated.View
				style={[
					styles.sheet,
					{
						backgroundColor: theme.background.default,
						opacity: fadeAnim,
					},
				]}
			>
				{/* Top bar */}
				<View style={[styles.topBar, { borderBottomColor: theme.border.main }]}>
					<View style={styles.adBadge}>
						<Text style={styles.adBadgeText}>AD</Text>
					</View>
					<View style={{ flex: 1 }} />
					<View style={styles.topBarRight}>
						{!closeAllowed && (
							<View style={styles.countdownBox}>
								<Text style={styles.countdownText}>{secondsLeft}s</Text>
							</View>
						)}
						{closeAllowed && (
							<TouchableOpacity
								onPress={() => onClose && onClose()}
								hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
							>
								<Ionicons
									name="close-circle"
									size={28}
									color={theme.text.secondary}
								/>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Header */}
				<View style={styles.header}>
					<Text style={[styles.headerTitle, { color: theme.text.primary }]}>
						{t("plans_title")}
					</Text>
					<Text
						style={[styles.headerSubtitle, { color: theme.text.secondary }]}
					>
						{t("plans_subtitle")}
					</Text>
				</View>

				{loading ? (
					<View style={styles.loadingBox}>
						<ActivityIndicator
							size="large"
							color={theme.primary?.main || "#8b5cf6"}
						/>
					</View>
				) : (
					<ScrollView
						contentContainerStyle={styles.plansColumn}
						showsVerticalScrollIndicator={false}
					>
						{plans.map((plan) => {
							const isCurrent = currentPlan === plan.id;
							const color = plan.color;
							return (
								<View
									key={plan.id}
									style={[
										styles.planCard,
										{
											backgroundColor: theme.background.paper,
											borderColor: isCurrent ? color : theme.border.main,
											borderWidth: isCurrent ? 2 : 1,
										},
										isCurrent && { backgroundColor: hexToRgba(color, 0.06) },
									]}
								>
									{/* Current plan badge */}
									{isCurrent && (
										<View
											style={[styles.currentBadge, { backgroundColor: color }]}
										>
											<Text style={styles.currentBadgeText}>
												{t("current_plan")}
											</Text>
										</View>
									)}

									{/* Plan name + price */}
									<Text
										style={[styles.planName, { color: theme.text.primary }]}
									>
										{plan.name}
									</Text>
									<View style={styles.priceRow}>
										<Text style={[styles.planPrice, { color }]}>
											{plan.id === "free" ? t("free") : plan.price}
										</Text>
										{plan.id !== "free" && (
											<Text
												style={[
													styles.planPeriod,
													{ color: theme.text.secondary },
												]}
											>
												/{plan.period}
											</Text>
										)}
									</View>

									{/* Features */}
									<View style={styles.featureList}>
										{plan.features.map((f, i) => {
											const iconName = f.allIncluded
												? "infinite"
												: f.included
													? "checkmark-circle"
													: "close-circle";
											const iconColor = f.included
												? color
												: theme.text.disabled;
											return (
												<View key={i} style={styles.featureRow}>
													<Ionicons
														name={iconName}
														size={18}
														color={iconColor}
													/>
													<Text
														style={[
															styles.featureText,
															{
																color: f.included
																	? theme.text.secondary
																	: theme.text.disabled,
															},
														]}
													>
														{f.text}
													</Text>
												</View>
											);
										})}
									</View>
								</View>
							);
						})}

						{/* CTA — visible after countdown */}
						{closeAllowed && (
							<TouchableOpacity
								style={[styles.ctaButton, { backgroundColor: "#8b5cf6" }]}
								onPress={() => {
									onClose && onClose();
									onUpgrade && onUpgrade();
								}}
							>
								<Text style={styles.ctaText}>{t("upgrade_plan")}</Text>
							</TouchableOpacity>
						)}
					</ScrollView>
				)}
			</Animated.View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	sheet: {
		flex: 1,
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderBottomWidth: 1,
		gap: spacing.sm,
		paddingTop: spacing.xl,
	},
	adBadge: {
		backgroundColor: "#64748b",
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	adBadgeText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	topBarRight: {
		flexDirection: "row",
		alignItems: "center",
	},
	countdownBox: {
		backgroundColor: "rgba(100,116,139,0.2)",
		borderRadius: 6,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	countdownText: {
		fontWeight: "700",
		fontSize: 13,
		color: "#94a3b8",
	},
	header: {
		alignItems: "center",
		marginTop: spacing.xl,
		marginBottom: spacing.md,
		paddingHorizontal: spacing.md,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: "800",
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: 13,
	},
	loadingBox: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	plansColumn: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.xxl || 40,
		marginTop: spacing.sm,
		gap: spacing.md,
	},
	planCard: {
		borderRadius: borderRadius.lg,
		padding: spacing.lg,
		position: "relative",
	},
	currentBadge: {
		position: "absolute",
		top: 12,
		right: 12,
		paddingHorizontal: spacing.sm,
		paddingVertical: 3,
		borderRadius: 10,
		zIndex: 3,
	},
	currentBadgeText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 10,
	},
	planIconBox: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing.sm,
	},
	planName: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 2,
	},
	priceRow: {
		flexDirection: "row",
		alignItems: "baseline",
		marginBottom: spacing.sm,
	},
	planPrice: {
		fontSize: 28,
		fontWeight: "900",
	},
	planPeriod: {
		fontSize: 13,
		marginLeft: 4,
	},
	featureList: {
		gap: spacing.xs,
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	featureText: {
		fontSize: 14,
		flex: 1,
	},
	ctaButton: {
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "center",
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.xxl || 40,
		borderRadius: borderRadius.lg,
		marginTop: spacing.sm,
	},
	ctaText: {
		color: "#fff",
		fontSize: 15,
		fontWeight: "700",
	},
});

export default PlansAdModal;
