import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../context/I18nContext";
import { usePlan } from "../context/PlanContext";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, spacing } from "../styles/theme";
import { ThemedText, Modal, Button } from "./ui";

const LimitWarningModal = ({ visible, onClose, limitType = "general" }) => {
	const { theme } = useTheme();
	const { t } = useI18n();
	const navigation = useNavigation();
	const {
		planCode,
		currentDecks,
		currentFlashcards,
		maxDecks,
		maxFlashcards,
		deckOverage,
		flashcardOverage,
		canPlay,
		canCreateDeck,
		canCreateFlashcard,
		isOverLimit,
	} = usePlan();

	const handleUpgrade = () => {
		onClose();
		navigation.navigate("Settings", { screen: "Plans" });
	};

	// Determine the message and icon based on limit type
	const getContent = () => {
		switch (limitType) {
			case "deck":
				return {
					icon: "folder-multiple",
					title: t("deck_limit_reached") || "Deck Limit Reached",
					message:
						t("deck_limit_message") ||
						`You have reached your deck limit (${currentDecks}/${maxDecks}). Upgrade your plan to create more decks.`,
					showUsage: true,
				};
			case "flashcard":
				return {
					icon: "cards",
					title: t("flashcard_limit_reached") || "Flashcard Limit Reached",
					message:
						t("flashcard_limit_message") ||
						`You have reached your flashcard limit (${currentFlashcards}/${maxFlashcards}). Upgrade your plan to create more flashcards.`,
					showUsage: true,
				};
			case "game":
				return {
					icon: "gamepad-variant",
					title: t("cannot_start_game") || "Cannot Start Game",
					message:
						t("over_limit_message") ||
						"You have exceeded your plan limits. Please delete some content or upgrade your plan to continue playing.",
					showUsage: true,
				};
			case "stats":
				return {
					icon: "chart-bar",
					title: t("stats_locked") || "Statistics Locked",
					message:
						t("stats_locked_message") ||
						"Advanced statistics are only available for Pro and Premium users. Upgrade your plan to unlock detailed insights.",
					showUsage: false,
				};
			default:
				return {
					icon: "alert-circle",
					title: t("limit_reached") || "Limit Reached",
					message:
						t("limit_reached_message") ||
						"You have reached your plan limits. Upgrade to continue.",
					showUsage: true,
				};
		}
	};

	const content = getContent();

	const getPlanBadgeColor = () => {
		switch (planCode) {
			case "pro":
				return "#3b82f6";
			case "premium":
				return "#8b5cf6";
			default:
				return "#64748b";
		}
	};

	return (
		<Modal visible={visible} onClose={onClose} title={content.title}>
			<View style={styles.container}>
				{/* Icon */}
				<View
					style={[
						styles.iconContainer,
						{ backgroundColor: theme.warning.main + "20" },
					]}
				>
					<MaterialCommunityIcons
						name={content.icon}
						size={48}
						color={theme.warning.main}
					/>
				</View>

				{/* Current Plan Badge */}
				<View
					style={[
						styles.planBadge,
						{ backgroundColor: getPlanBadgeColor() + "20" },
					]}
				>
					<ThemedText
						style={[styles.planBadgeText, { color: getPlanBadgeColor() }]}
					>
						{t("current_plan") || "Current Plan"}:{" "}
						{planCode.charAt(0).toUpperCase() + planCode.slice(1)}
					</ThemedText>
				</View>

				{/* Message */}
				<ThemedText style={styles.message}>{content.message}</ThemedText>

				{/* Usage Stats */}
				{content.showUsage && (
					<View
						style={[
							styles.usageContainer,
							{ backgroundColor: theme.background.paper },
						]}
					>
						{/* Deck Usage */}
						{maxDecks !== null && maxDecks !== undefined && (
							<View style={styles.usageRow}>
								<View style={styles.usageLabelContainer}>
									<MaterialCommunityIcons
										name="folder"
										size={18}
										color={theme.text.secondary}
									/>
									<ThemedText color="secondary" style={styles.usageLabel}>
										{t("decks") || "Decks"}
									</ThemedText>
								</View>
								<View style={styles.usageValueContainer}>
									<ThemedText
										style={[
											styles.usageValue,
											deckOverage > 0 && { color: theme.error.main },
										]}
									>
										{currentDecks}/{maxDecks}
									</ThemedText>
									{deckOverage > 0 && (
										<ThemedText
											style={[styles.overage, { color: theme.error.main }]}
										>
											(+{deckOverage})
										</ThemedText>
									)}
								</View>
							</View>
						)}

						{/* Flashcard Usage */}
						{maxFlashcards !== null && maxFlashcards !== undefined && (
							<View style={styles.usageRow}>
								<View style={styles.usageLabelContainer}>
									<MaterialCommunityIcons
										name="cards"
										size={18}
										color={theme.text.secondary}
									/>
									<ThemedText color="secondary" style={styles.usageLabel}>
										{t("flashcards") || "Flashcards"}
									</ThemedText>
								</View>
								<View style={styles.usageValueContainer}>
									<ThemedText
										style={[
											styles.usageValue,
											flashcardOverage > 0 && { color: theme.error.main },
										]}
									>
										{currentFlashcards}/{maxFlashcards}
									</ThemedText>
									{flashcardOverage > 0 && (
										<ThemedText
											style={[styles.overage, { color: theme.error.main }]}
										>
											(+{flashcardOverage})
										</ThemedText>
									)}
								</View>
							</View>
						)}
					</View>
				)}

				{/* Upgrade Button */}
				<Button
					variant="primary"
					onPress={handleUpgrade}
					style={styles.upgradeButton}
				>
					{t("upgrade_plan") || "Upgrade Plan"}
				</Button>

				{/* Close Button */}
				<Button variant="ghost" onPress={onClose} style={styles.closeButton}>
					{t("close") || "Close"}
				</Button>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		paddingVertical: spacing.md,
	},
	iconContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: spacing.md,
	},
	planBadge: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.full,
		marginBottom: spacing.md,
	},
	planBadgeText: {
		fontSize: 12,
		fontWeight: "600",
	},
	message: {
		textAlign: "center",
		marginBottom: spacing.lg,
		lineHeight: 22,
		paddingHorizontal: spacing.sm,
	},
	usageContainer: {
		width: "100%",
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		marginBottom: spacing.lg,
	},
	usageRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: spacing.xs,
	},
	usageLabelContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
	},
	usageLabel: {
		fontSize: 14,
	},
	usageValueContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
	},
	usageValue: {
		fontSize: 14,
		fontWeight: "600",
	},
	overage: {
		fontSize: 12,
		fontWeight: "500",
	},
	upgradeButton: {
		width: "100%",
		marginBottom: spacing.sm,
	},
	closeButton: {
		width: "100%",
	},
});

export default LimitWarningModal;
