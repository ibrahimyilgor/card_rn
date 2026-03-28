import React from "react";
import { View, Text, StyleSheet, Modal as RNModal, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../context/I18nContext";
import { usePlan } from "../context/PlanContext";
import { useTheme } from "../context/ThemeContext";
import { borderRadius, spacing } from "../styles/theme";
import { Button } from "./ui";

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
	} = usePlan();

	const handleUpgrade = () => {
		onClose();
		navigation.navigate("Settings", { screen: "Plans" });
	};

	const getContent = () => {
		switch (limitType) {
			case "deck":
				return {
					title: t("deck_limit_reached_title") || "Deck Limit Reached",
					message: t("deck_limit_reached") || "You have reached the limit for your current plan. To continue, please upgrade your plan.",
					showUsage: true,
				};
			case "flashcard":
				return {
					title: t("card_limit_reached_title") || "Flashcard Limit Reached",
					message: t("card_limit_reached") || "You have reached the limit for your current plan. To continue, please upgrade your plan.",
					showUsage: true,
				};
			case "game":
				return {
					title: t("cannot_start_game") || "Cannot Start Game",
					message: t("over_limit_message") || "You have exceeded your plan limits. Please delete some content or upgrade your plan to continue playing.",
					showUsage: true,
				};
			case "stats":
				return {
					title: t("stats_locked") || "Statistics Locked",
					message: t("stats_locked_message") || "Advanced statistics are only available for Pro and Premium users. Upgrade your plan to unlock detailed insights.",
					showUsage: false,
				};
			default:
				return {
					title: t("limit_reached") || "Limit Reached",
					message: t("limit_reached_message") || "You have reached your plan limits. Upgrade to continue.",
					showUsage: true,
				};
		}
	};

	const content = getContent();

	const getPlanBadgeColor = () => {
		switch (planCode) {
			case "pro": return "#3b82f6";
			case "premium": return "#8b5cf6";
			default: return "#64748b";
		}
	};

	const badgeColor = getPlanBadgeColor();

	return (
		<RNModal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={[styles.card, { backgroundColor: theme.background.elevated, borderColor: theme.border.main }]} onPress={() => {}}>

					{/* Header */}
					<View style={[styles.header, { borderBottomColor: theme.border.subtle }]}>
						<View style={styles.headerLeft}>
							<View style={styles.headerIcon}>
								<MaterialCommunityIcons name="alert" size={20} color="#fff" />
							</View>
							<Text style={[styles.headerTitle, { color: theme.text.primary }]}>{content.title}</Text>
						</View>
						<Pressable onPress={onClose} hitSlop={8}>
							<MaterialCommunityIcons name="close" size={20} color={theme.text.secondary} />
						</Pressable>
					</View>

					{/* Body */}
					<View style={styles.body}>
						{/* Plan Badge */}
						<View style={[styles.planBadge, { backgroundColor: badgeColor + "25" }]}>
							<Text style={[styles.planBadgeText, { color: badgeColor }]}>
								{t("current_plan") || "Current Plan"}: {planCode.charAt(0).toUpperCase() + planCode.slice(1)}
							</Text>
						</View>

						{/* Message */}
						<Text style={[styles.message, { color: theme.text.secondary }]}>{content.message}</Text>

						{/* Usage Card */}
						{content.showUsage && (
							<View style={[styles.usageCard, { backgroundColor: theme.background.default ?? "#0f172a" }]}>
								{maxDecks !== null && maxDecks !== undefined && (
									<>
										<View style={styles.usageRow}>
											<View style={styles.usageLeft}>
												<MaterialCommunityIcons
													name="layers-triple"
													size={18}
													color={(deckOverage > 0 || currentDecks >= maxDecks) ? theme.error.main : "#3b82f6"}
												/>
												<Text style={[styles.usageLabel, (deckOverage > 0 || currentDecks >= maxDecks) && { color: theme.error.main, fontWeight: "700" }]}>
													{t("deck_limit") || "Deck Limit"}
												</Text>
											</View>
											<Text style={[styles.usageValue, (deckOverage > 0 || currentDecks >= maxDecks) && { color: theme.error.main }]}>
												{currentDecks}/{maxDecks}
											</Text>
										</View>
										{maxFlashcards !== null && maxFlashcards !== undefined && (
											<View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />
										)}
									</>
								)}
								{maxFlashcards !== null && maxFlashcards !== undefined && (
									<View style={styles.usageRow}>
										<View style={styles.usageLeft}>
											<MaterialCommunityIcons
												name="cards"
												size={18}
												color={(flashcardOverage > 0 || currentFlashcards >= maxFlashcards) ? theme.error.main : "#3b82f6"}
											/>
											<Text style={[styles.usageLabel, (flashcardOverage > 0 || currentFlashcards >= maxFlashcards) && { color: theme.error.main, fontWeight: "700" }]}>
												{t("flashcard_limit") || "Flashcard Limit"}
											</Text>
										</View>
										<Text style={[styles.usageValue, (flashcardOverage > 0 || currentFlashcards >= maxFlashcards) && { color: theme.error.main }]}>
											{currentFlashcards}/{maxFlashcards}
										</Text>
									</View>
								)}
							</View>
						)}
					</View>

					{/* Footer */}
					<View style={[styles.footer, { borderTopColor: theme.border.subtle }]}>
						<Button variant="ghost" onPress={onClose} style={styles.closeBtn}>
							{t("close") || "Close"}
						</Button>
						<Button variant="primary" onPress={handleUpgrade} style={styles.upgradeBtn}>
							{t("upgrade_plan") || "Upgrade Plan"}
						</Button>
					</View>

				</Pressable>
			</Pressable>
		</RNModal>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: spacing.lg,
	},
	card: {
		width: "100%",
		borderRadius: borderRadius.xl,
		borderWidth: 1,
		overflow: "hidden",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		borderBottomWidth: 1,
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		flex: 1,
	},
	headerIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: "#6366f1",
		alignItems: "center",
		justifyContent: "center",
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "700",
		flex: 1,
	},
	body: {
		padding: spacing.lg,
		alignItems: "center",
		gap: spacing.md,
	},
	planBadge: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.full,
	},
	planBadgeText: {
		fontSize: 13,
		fontWeight: "600",
	},
	message: {
		textAlign: "center",
		fontSize: 15,
		lineHeight: 22,
	},
	usageCard: {
		width: "100%",
		borderRadius: borderRadius.lg,
		overflow: "hidden",
	},
	usageRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm + 3,
	},
	usageLeft: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	usageLabel: {
		fontSize: 15,
		fontWeight: "600",
		color: "#94a3b8",
	},
	usageValue: {
		fontSize: 15,
		fontWeight: "700",
		color: "#94a3b8",
	},
	divider: {
		height: 1,
		marginHorizontal: spacing.md,
	},
	footer: {
		flexDirection: "row",
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		borderTopWidth: 1,
		gap: spacing.sm,
	},
	closeBtn: {
		flex: 0.55,
	},
	upgradeBtn: {
		flex: 1,
	},
});

export default LimitWarningModal;
