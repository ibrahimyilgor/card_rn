import React, { createContext, useContext, useState, useCallback } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	Pressable,
	Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

	// Show multiple achievements
	const showAchievements = useCallback((achievements) => {
		if (achievements && achievements.length > 0) {
			setAchievementQueue((prev) => [...prev, ...achievements]);
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
			setIsVisible(false);
			setCurrentAchievement(null);
			setAchievementQueue((prev) => prev.slice(1));
		});
	}, []);

	const value = {
		showAchievement,
		showAchievements,
	};

	// Get category color
	const getCategoryColor = (category) => {
		switch (category) {
			case "streak":
				return "#f59e0b";
			case "accuracy":
				return "#22c55e";
			case "volume":
				return "#3b82f6";
			default:
				return theme.primary.main;
		}
	};

	// Get translated achievement name
	const getAchievementName = (achievement) => {
		if (!achievement) return "";
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

		// Fallback to name or description
		return name || achievement.description || "";
	};

	return (
		<AchievementContext.Provider value={value}>
			{children}

			{/* Achievement Modal */}
			<Modal
				visible={isVisible}
				transparent
				animationType="fade"
				onRequestClose={closeAchievement}
			>
				<Pressable style={styles.overlay} onPress={closeAchievement}>
					<Animated.View
						style={[
							styles.container,
							{
								backgroundColor: theme.background.elevated,
								borderColor: currentAchievement
									? getCategoryColor(currentAchievement.category)
									: theme.primary.main,
								transform: [{ scale: scaleAnim }],
							},
							shadows.large,
						]}
					>
						{currentAchievement && (
							<>
								{/* Icon Container */}
								<View
									style={[
										styles.iconContainer,
										{
											backgroundColor: `${getCategoryColor(
												currentAchievement.category,
											)}20`,
										},
									]}
								>
									<Text style={styles.icon}>
										{currentAchievement.icon || "🏆"}
									</Text>
								</View>

								{/* Title */}
								<Text
									style={[
										styles.title,
										{ color: getCategoryColor(currentAchievement.category) },
									]}
								>
									{t("achievement_earned") || "Achievement Earned!"}
								</Text>

								{/* Achievement Name */}
								<Text style={[styles.name, { color: theme.text.primary }]}>
									{getAchievementName(currentAchievement)}
								</Text>

								{/* Description */}
								<Text
									style={[styles.description, { color: theme.text.secondary }]}
								>
									{currentAchievement.description}
								</Text>

								{/* Queue indicator */}
								{achievementQueue.length > 1 && (
									<Text
										style={[styles.queueText, { color: theme.text.secondary }]}
									>
										+{achievementQueue.length - 1} {t("more") || "more"}
									</Text>
								)}

								{/* Button */}
								<Pressable
									style={({ pressed }) => [
										styles.button,
										{
											backgroundColor: getCategoryColor(
												currentAchievement.category,
											),
										},
										pressed && { opacity: 0.8 },
									]}
									onPress={closeAchievement}
								>
									<Ionicons name="checkmark" size={20} color="#fff" />
									<Text style={styles.buttonText}>
										{t("awesome") || "Awesome!"}
									</Text>
								</Pressable>
							</>
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
		backgroundColor: "rgba(0, 0, 0, 0.7)",
	},
	container: {
		width: "85%",
		maxWidth: 340,
		borderRadius: borderRadius.xl,
		borderWidth: 2,
		padding: spacing.xl,
		alignItems: "center",
	},
	iconContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing.md,
	},
	icon: {
		fontSize: 56,
	},
	title: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: spacing.xs,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	name: {
		fontSize: 24,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: spacing.sm,
	},
	description: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: spacing.md,
		lineHeight: 20,
	},
	queueText: {
		fontSize: 12,
		marginBottom: spacing.md,
	},
	button: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.xl,
		borderRadius: borderRadius.lg,
		gap: spacing.xs,
	},
	buttonText: {
		fontSize: 16,
		fontWeight: "600",
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
