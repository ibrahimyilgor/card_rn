import React, { createContext, useContext, useState, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	Pressable,
	Animated,
	unstable_batchedUpdates,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "./ThemeContext";
import { useI18n } from "./I18nContext";
import { borderRadius, spacing } from "../styles/theme";

const AchievementContext = createContext();

export const AchievementProvider = ({ children }) => {
	const { theme, shadows } = useTheme();
	const { t } = useI18n();
	const [achievementQueue, setAchievementQueue] = useState([]);
	const [currentAchievement, setCurrentAchievement] = useState(null);
	const [isVisible, setIsVisible] = useState(false);
	const scaleAnim = React.useRef(new Animated.Value(0)).current;

	// Show achievement popup
	const showAchievement = useCallback((achievement) => {
		setAchievementQueue((prev) => [...prev, achievement]);
	}, []);

	// Show multiple achievements (deduplicated by id)
	const showAchievements = useCallback((achievements) => {
		if (achievements && achievements.length > 0) {
			setAchievementQueue((prev) => {
				const existingIds = new Set(prev.map((a) => a.id));
				const unique = [];
				for (const a of achievements) {
					if (!existingIds.has(a.id)) {
						existingIds.add(a.id);
						unique.push(a);
					}
				}
				return [...prev, ...unique];
			});
		}
	}, []);

	// Process queue
	React.useEffect(() => {
		if (achievementQueue.length > 0 && !isVisible) {
			setCurrentAchievement(achievementQueue[0]);
			setIsVisible(true);
			// Animate in
			Animated.spring(scaleAnim, {
				toValue: 1,
				friction: 6,
				tension: 100,
				useNativeDriver: true,
			}).start();
		}
	}, [achievementQueue, isVisible]);

	// Close current achievement
	const closeAchievement = useCallback(() => {
		Animated.timing(scaleAnim, {
			toValue: 0,
			duration: 150,
			useNativeDriver: true,
		}).start(() => {
			// Batch all three updates into a single render so the queue-processing
			// effect doesn't fire between setIsVisible(false) and setAchievementQueue
			// (which would re-show the just-dismissed achievement).
			unstable_batchedUpdates(() => {
				setIsVisible(false);
				setCurrentAchievement(null);
				setAchievementQueue((prev) => prev.slice(1));
			});
		});
	}, []);

	const value = {
		showAchievement,
		showAchievements,
	};

	// Category colors — matches web AchievementModal
	const CATEGORY_COLORS = {
		streak: "#f97316",
		accuracy: "#4ECDC4",
		volume: "#9B59B6",
	};

	const getCategoryColor = (category) =>
		CATEGORY_COLORS[category] || theme.primary.main;

	// Category icons — matches web AchievementModal icons
	const getCategoryIcon = (category) => {
		switch (category) {
			case "streak":
				return "flame";
			case "accuracy":
				return "locate";
			case "volume":
				return "book";
			default:
				return "trophy";
		}
	};

	// Get translated achievement name
	const getAchievementName = (achievement) => {
		if (!achievement) return "";
		const { name, category, threshold } = achievement;
		const specificKey = `${category}_${threshold}`;
		const specificTranslation = t(specificKey);
		if (specificTranslation && specificTranslation !== specificKey)
			return specificTranslation;
		if (name) {
			const nameTranslation = t(name);
			if (nameTranslation && nameTranslation !== name) return nameTranslation;
		}
		return name || achievement.description || "";
	};

	const getCategoryLabel = (category) => {
		const key = `achievement_category_${category}`;
		const translated = t(key);
		if (translated && translated !== key) return translated;
		return category ? category.charAt(0).toUpperCase() + category.slice(1) : "";
	};

	return (
		<AchievementContext.Provider value={value}>
			{children}

			<Modal
				visible={isVisible}
				transparent
				animationType="none"
				onRequestClose={closeAchievement}
			>
				<Pressable style={styles.overlay} onPress={closeAchievement}>
					<Animated.View
						style={[
							styles.container,
							{
								backgroundColor: theme.background.elevated,
							},
							currentAchievement && {
								borderColor: getCategoryColor(currentAchievement.category),
								shadowColor: getCategoryColor(currentAchievement.category),
							},
							{ transform: [{ scale: scaleAnim }] },
						]}
					>
						{currentAchievement && (
							<Pressable
								onPress={() => {}}
								style={{ width: "100%", alignItems: "center" }}
							>
								{/* Close button */}
								<Pressable
									onPress={closeAchievement}
									style={styles.closeButton}
									hitSlop={12}
								>
									<Ionicons
										name="close"
										size={20}
										color={theme.text.secondary}
									/>
								</Pressable>

								{/* Queue indicator */}
								{achievementQueue.length > 1 && (
									<Text
										style={[styles.queueBadge, { color: theme.text.secondary }]}
									>
										+{achievementQueue.length - 1} {t("more") || "more"}
									</Text>
								)}

								{/* Icon container with gradient */}
								<LinearGradient
									colors={[
										`${getCategoryColor(currentAchievement.category)}33`,
										`${getCategoryColor(currentAchievement.category)}11`,
									]}
									style={[
										styles.iconContainer,
										{
											borderColor: getCategoryColor(
												currentAchievement.category,
											),
										},
									]}
								>
									<Ionicons
										name={getCategoryIcon(currentAchievement.category)}
										size={48}
										color={getCategoryColor(currentAchievement.category)}
									/>
								</LinearGradient>

								{/* "Achievement Earned!" label */}
								<Text style={[styles.earnedLabel, { color: "white" }]}>
									{t("achievement_earned") || "Achievement Earned!"}
								</Text>

								{/* Achievement Name */}
								<Text
									style={[
										styles.name,
										{
											color: getCategoryColor(currentAchievement.category),
										},
									]}
								>
									{getAchievementName(currentAchievement)}
								</Text>

								{/* Category badge */}
								<View
									style={[
										styles.categoryBadge,
										{
											backgroundColor: `${getCategoryColor(currentAchievement.category)}22`,
										},
									]}
								>
									<Text
										style={[
											styles.categoryBadgeText,
											{
												color: getCategoryColor(currentAchievement.category),
											},
										]}
									>
										{getCategoryLabel(currentAchievement.category)}
									</Text>
								</View>

								{/* Repeat indicator */}
								{currentAchievement.isRepeat &&
									currentAchievement.done_count > 1 && (
										<Text
											style={[
												styles.repeatText,
												{ color: theme.text.secondary },
											]}
										>
											{t("earned_times") || "Earned"}{" "}
											<Text style={{ fontWeight: "700" }}>
												x{currentAchievement.done_count}
											</Text>
										</Text>
									)}
							</Pressable>
						)}
					</Animated.View>
				</Pressable>
			</Modal>
		</AchievementContext.Provider>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0, 0, 0, 0.75)",
	},
	container: {
		width: "88%",
		maxWidth: 360,
		borderRadius: borderRadius.xl,
		borderWidth: 2.5,
		padding: spacing.xl,
		alignItems: "center",
		backgroundColor: "#1a1a2e", // overridden by theme at runtime via inline style absent; kept as fallback
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.5,
		shadowRadius: 24,
		elevation: 16,
	},
	closeButton: {
		position: "absolute",
		top: -spacing.sm,
		right: -spacing.sm,
		padding: spacing.xs,
	},
	queueBadge: {
		position: "absolute",
		top: -spacing.sm,
		left: -spacing.sm,
		fontSize: 11,
		fontWeight: "600",
	},
	iconContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing.md,
		marginTop: spacing.sm,
		borderWidth: 2.5,
	},
	earnedLabel: {
		fontSize: 15,
		fontWeight: "700",
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginBottom: spacing.xs,
	},
	name: {
		fontSize: 22,
		fontWeight: "800",
		textAlign: "center",
		marginBottom: spacing.sm,
	},
	description: {
		fontSize: 13,
		textAlign: "center",
		marginBottom: spacing.md,
		lineHeight: 19,
	},
	categoryBadge: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.md,
		marginBottom: spacing.md,
	},
	categoryBadgeText: {
		fontSize: 12,
		fontWeight: "700",
		textTransform: "capitalize",
		letterSpacing: 0.5,
	},
	repeatText: {
		fontSize: 13,
		marginBottom: spacing.md,
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: spacing.sm + 2,
		paddingHorizontal: spacing.xl,
		borderRadius: borderRadius.lg,
		gap: spacing.xs,
		marginTop: spacing.xs,
	},
	buttonText: {
		fontSize: 15,
		fontWeight: "700",
		color: "#fff",
	},
});

export const useAchievement = () => {
	const context = useContext(AchievementContext);
	if (context === undefined) {
		throw new Error(
			"useAchievement must be used within an AchievementProvider",
		);
	}
	return context;
};

export default AchievementContext;
