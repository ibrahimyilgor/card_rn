import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	RefreshControl,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
	MaterialCommunityIcons,
	Ionicons,
	FontAwesome5,
} from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { achievementsAPI } from "../services/api";
import {
	ThemedView,
	ThemedText,
	Card,
	LoadingState,
	EmptyState,
} from "../components/ui";
import { spacing, borderRadius } from "../styles/theme";

const AchievementsScreen = () => {
	const { theme } = useTheme();
	const { t } = useI18n();

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [achievements, setAchievements] = useState([]);

	// Animations
	const headerAnim = useRef(new Animated.Value(0)).current;
	const progressBarWidth = useRef(new Animated.Value(0)).current;
	const progressCardAnim = useRef(new Animated.Value(0)).current;
	const trophyBounce = useRef(new Animated.Value(0.5)).current;

	// Fetch achievements every time screen is focused
	useFocusEffect(
		useCallback(() => {
			fetchAchievements();
		}, []),
	);

	const fetchAchievements = async () => {
		try {
			const response = await achievementsAPI.getAll();
			const data = response.data?.achievements || [];
			setAchievements(data);

			// Trigger animations after data loads
			Animated.timing(headerAnim, {
				toValue: 1,
				duration: 350,
				useNativeDriver: true,
			}).start();

			Animated.spring(progressCardAnim, {
				toValue: 1,
				delay: 150,
				useNativeDriver: true,
				speed: 12,
				bounciness: 4,
			}).start();

			// Trophy bounce
			Animated.spring(trophyBounce, {
				toValue: 1,
				delay: 300,
				useNativeDriver: true,
				speed: 6,
				bounciness: 14,
			}).start();

			// Animate progress bar fill
			const earned = data.filter((a) => a.earned).length;
			const pct = data.length > 0 ? earned / data.length : 0;
			Animated.timing(progressBarWidth, {
				toValue: pct,
				duration: 800,
				delay: 400,
				useNativeDriver: false,
			}).start();
		} catch (error) {
			console.error("Error fetching achievements:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const onRefresh = () => {
		setRefreshing(true);
		fetchAchievements();
	};

	const earnedCount = achievements.filter((a) => a.earned).length;

	// Helper function to get translated achievement name
	const getAchievementName = (achievement) => {
		const { name, category, threshold } = achievement;

		// Try specific translation key first (e.g., "accuracy_100", "streak_7")
		const specificKey = `${category}_${threshold}`;
		const specificTranslation = t(specificKey);
		if (specificTranslation && specificTranslation !== specificKey) {
			return specificTranslation;
		}

		// Also try the name directly (e.g., "accuracy_100")
		if (name) {
			const nameTranslation = t(name);
			if (nameTranslation && nameTranslation !== name) {
				return nameTranslation;
			}
		}

		// Dynamic translations based on category
		if (category === "streak") {
			return t("achievement_streak", { count: threshold });
		} else if (category === "accuracy") {
			if (threshold === 100) {
				return t("achievement_accuracy_100");
			}
			return t("achievement_accuracy", { count: threshold });
		} else if (category === "volume") {
			return t("achievement_volume", { count: threshold });
		}

		// Fallback to database description
		return achievement.description;
	};

	// Group achievements by category
	const groupedAchievements = achievements.reduce((acc, achievement) => {
		const category = achievement.category || "other";
		if (!acc[category]) {
			acc[category] = [];
		}
		acc[category].push(achievement);
		return acc;
	}, {});

	const categoryOrder = ["streak", "accuracy", "volume"];

	// Modern icon components for categories
	const CategoryIcon = ({ category, size = 24, color }) => {
		const iconColor = color || theme.text.primary;
		switch (category) {
			case "streak":
				return (
					<MaterialCommunityIcons name="fire" size={size} color="#FF6B35" />
				);
			case "accuracy":
				return (
					<MaterialCommunityIcons
						name="crosshairs"
						size={size}
						color="#4ECDC4"
					/>
				);
			case "volume":
				return (
					<MaterialCommunityIcons
						name="book-open-page-variant"
						size={size}
						color="#9B59B6"
					/>
				);
			default:
				return (
					<MaterialCommunityIcons name="star" size={size} color={iconColor} />
				);
		}
	};

	// Achievement icon based on category and threshold
	const AchievementIcon = ({ achievement, size = 32, earned }) => {
		const { category, threshold } = achievement;
		const opacity = earned ? 1 : 0.4;

		// Get icon based on category and threshold tier
		const getStreakIcon = () => {
			if (threshold >= 30) return { name: "fire", color: "#FF4500" }; // Red-orange for high streaks
			if (threshold >= 14) return { name: "fire", color: "#FF6B35" }; // Orange
			if (threshold >= 7) return { name: "fire", color: "#FF8C00" }; // Dark orange
			return { name: "fire", color: "#FFA500" }; // Regular orange
		};

		const getAccuracyIcon = () => {
			return { name: "crosshairs", color: "#4ECDC4" }; // Crosshair/aim icon for all accuracy
		};

		const getVolumeIcon = () => {
			return { name: "book-open-page-variant", color: "#9B59B6" }; // Book icon for all volume
		};

		let iconConfig;
		switch (category) {
			case "streak":
				iconConfig = getStreakIcon();
				break;
			case "accuracy":
				iconConfig = getAccuracyIcon();
				break;
			case "volume":
				iconConfig = getVolumeIcon();
				break;
			default:
				iconConfig = { name: "star", color: theme.primary.main };
		}

		return (
			<MaterialCommunityIcons
				name={iconConfig.name}
				size={size}
				color={earned ? iconConfig.color : theme.text.secondary}
				style={{ opacity }}
			/>
		);
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
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={theme.primary.main}
						/>
					}
				>
					{/* Header */}
					<Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }] }]}>
						<ThemedText variant="h2">{t("achievements")}</ThemedText>
						<ThemedText color="secondary">
							{t("achievements_subtitle")}
						</ThemedText>
					</Animated.View>

					{/* Progress */}
					<Animated.View style={{ opacity: progressCardAnim, transform: [{ translateY: progressCardAnim.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) }] }}>
					<Card style={styles.progressCard}>
						<View style={styles.progressHeader}>
							<Animated.View
								style={[
									styles.trophyIconContainer,
									{ backgroundColor: theme.primary.main + "20", transform: [{ scale: trophyBounce }] },
								]}
							>
								<FontAwesome5 name="trophy" size={32} color="#FFD700" />
							</Animated.View>
							<View style={styles.progressInfo}>
								<ThemedText variant="h3">
									{earnedCount} / {achievements.length}
								</ThemedText>
								<ThemedText color="secondary">
									{t("achievements_earned")}
								</ThemedText>
							</View>
						</View>

						<View
							style={[
								styles.progressBar,
								{ backgroundColor: theme.border.main },
							]}
						>
							<Animated.View
								style={[
									styles.progressFill,
									{
										backgroundColor: theme.primary.main,
										width: progressBarWidth.interpolate({
											inputRange: [0, 1],
											outputRange: ['0%', '100%'],
										}),
									},
								]}
							/>
						</View>
					</Card>
					</Animated.View>

					{/* Achievement Categories */}
					{categoryOrder.map((category) => {
						const categoryAchievements = groupedAchievements[category];
						if (!categoryAchievements || categoryAchievements.length === 0)
							return null;

						return (
							<View key={category} style={styles.categorySection}>
								<View style={styles.categoryHeader}>
									<CategoryIcon category={category} size={24} />
									<ThemedText variant="h3">
										{t(`achievement_category_${category}`)}
									</ThemedText>
								</View>

								<View style={styles.achievementsGrid}>
									{categoryAchievements.map((achievement) => (
										<Card
											key={achievement.id}
											style={[
												styles.achievementCard,
												!achievement.earned && styles.achievementCardLocked,
											]}
										>
											<View
												style={[
													styles.achievementIcon,
													{
														backgroundColor: achievement.earned
															? theme.primary.main + "15"
															: theme.background.elevated,
													},
												]}
											>
												<AchievementIcon
													achievement={achievement}
													size={32}
													earned={achievement.earned}
												/>
											</View>

											<ThemedText
												numberOfLines={2}
												style={[
													styles.achievementName,
													!achievement.earned && { opacity: 0.5 },
												]}
											>
												{getAchievementName(achievement)}
											</ThemedText>

											{achievement.earned && achievement.done_count > 1 && (
												<View
													style={[
														styles.earnedBadge,
														{ backgroundColor: theme.primary.dark },
													]}
												>
													<Text style={styles.earnedBadgeText}>
														×{achievement.done_count}
													</Text>
												</View>
											)}

											{!achievement.earned && (
												<View
													style={[
														styles.lockedOverlay,
														{ borderColor: theme.border.main },
													]}
												>
													<Ionicons
														name="lock-closed"
														size={14}
														color={theme.text.secondary}
														style={{ opacity: 0.6 }}
													/>
												</View>
											)}
										</Card>
									))}
								</View>
							</View>
						);
					})}

					{achievements.length === 0 && (
						<EmptyState
							icon="🏆"
							title={t("no_data")}
							description={t("no_data")}
						/>
					)}
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
		marginBottom: spacing.lg,
	},
	progressCard: {
		padding: spacing.lg,
		marginBottom: spacing.lg,
	},
	progressHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: spacing.md,
	},
	trophyIconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
		marginRight: spacing.md,
	},
	progressInfo: {
		flex: 1,
	},
	progressBar: {
		height: 8,
		borderRadius: 4,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		borderRadius: 4,
	},
	categorySection: {
		marginBottom: spacing.lg,
	},
	categoryHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: spacing.md,
		gap: spacing.sm,
	},
	achievementsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
	},
	achievementCard: {
		width: "48%",
		height: 140,
		padding: spacing.md,
		alignItems: "center",
		justifyContent: "center",
		position: "relative",
		overflow: "hidden",
	},
	achievementCardLocked: {
		opacity: 0.7,
	},
	achievementIcon: {
		width: 60,
		height: 60,
		borderRadius: 30,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: spacing.sm,
	},
	achievementName: {
		fontWeight: "600",
		textAlign: "center",
		fontSize: 13,
		numberOfLines: 2,
	},
	achievementDesc: {
		fontSize: 11,
		textAlign: "center",
		lineHeight: 15,
	},
	earnedBadge: {
		position: "absolute",
		top: spacing.sm,
		right: spacing.sm,
		paddingHorizontal: spacing.xs,
		paddingVertical: 2,
		borderRadius: borderRadius.sm,
	},
	earnedBadgeText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
	},
	lockedOverlay: {
		position: "absolute",
		top: spacing.sm,
		right: spacing.sm,
	},
});

export default AchievementsScreen;
