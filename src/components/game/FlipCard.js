import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, spacing } from "../../styles/theme";

const FRONT_ACCENT = "#8b5cf6"; // purple
const BACK_ACCENT = "#22c55e"; // green

const FlipCard = ({
	frontText,
	backText,
	isFlipped,
	onFlip,
	disabled = false,
	style,
	cardKey,
}) => {
	const { theme, shadows } = useTheme();
	const flipAnim = useRef(new Animated.Value(0)).current;

	// Reset animation immediately when card changes (cardKey changes)
	useEffect(() => {
		flipAnim.setValue(0);
	}, [cardKey]);

	useEffect(() => {
		Animated.timing(flipAnim, {
			toValue: isFlipped ? 1 : 0,
			duration: 400,
			useNativeDriver: true,
		}).start();
	}, [isFlipped]);

	const frontRotate = flipAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "180deg"],
	});

	const backRotate = flipAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["180deg", "360deg"],
	});

	const frontOpacity = flipAnim.interpolate({
		inputRange: [0, 0.49, 0.5, 1],
		outputRange: [1, 1, 0, 0],
	});

	const backOpacity = flipAnim.interpolate({
		inputRange: [0, 0.49, 0.5, 1],
		outputRange: [0, 0, 1, 1],
	});

	const isBackTextLong = (backText || "").trim().length > 60;

	return (
		<Pressable
			onPress={disabled ? undefined : onFlip}
			style={[styles.container, shadows.large, style]}
		>
			{/* Front Side */}
			<Animated.View
				style={[
					styles.card,
					{
						backgroundColor: theme.background.elevated,
						borderColor: theme.border.main,
					},
					{
						transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
						opacity: frontOpacity,
						backfaceVisibility: "hidden",
					},
				]}
			>
				{/* Purple accent bar */}
				<View style={[styles.accentBar, { backgroundColor: FRONT_ACCENT }]} />
				{/* Content */}
				<View style={styles.contentArea}>
					<Text style={[styles.text, { color: theme.text.primary }]}>
						{frontText}
					</Text>
				</View>
				{/* Tap hint */}
				<View style={styles.hintRow}>
					<MaterialCommunityIcons
						name="gesture-tap"
						size={15}
						color={theme.text.disabled}
						style={styles.hintIcon}
					/>
					<Text style={[styles.hint, { color: theme.text.disabled }]}>
						Tap to flip
					</Text>
				</View>
			</Animated.View>

			{/* Back Side */}
			<Animated.View
				style={[
					styles.card,
					{
						backgroundColor: theme.background.elevated,
						borderColor: theme.border.main,
					},
					{
						transform: [{ perspective: 1000 }, { rotateY: backRotate }],
						opacity: backOpacity,
						backfaceVisibility: "hidden",
					},
				]}
			>
				{/* Green accent bar */}
				<View style={[styles.accentBar, { backgroundColor: BACK_ACCENT }]} />
				{/* ANSWER label */}
				<Text
					style={[styles.answerLabel, isBackTextLong && styles.answerLabelLong]}
				>
					ANSWER
				</Text>
				{/* Content */}
				<View style={styles.contentArea}>
					<Text style={[styles.text, { color: theme.text.primary }]}>
						{backText}
					</Text>
				</View>
				{/* Tap hint */}
				<View style={styles.hintRow}>
					<MaterialCommunityIcons
						name="gesture-tap"
						size={15}
						color={theme.text.disabled}
						style={styles.hintIcon}
					/>
					<Text style={[styles.hint, { color: theme.text.disabled }]}>
						Tap to flip back
					</Text>
				</View>
			</Animated.View>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	container: {
		width: "100%",
		aspectRatio: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
	card: {
		position: "absolute",
		width: "100%",
		height: "100%",
		borderRadius: borderRadius.xl,
		borderWidth: 2,
		overflow: "hidden",
		justifyContent: "center",
		alignItems: "center",
	},
	accentBar: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 4,
		borderTopLeftRadius: borderRadius.xl,
		borderTopRightRadius: borderRadius.xl,
	},
	answerLabel: {
		position: "absolute",
		top: "30%",
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 2,
		color: BACK_ACCENT,
		textTransform: "uppercase",
	},
	answerLabelLong: {
		top: "24%",
	},
	contentArea: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: spacing.lg,
		paddingTop: spacing.xl,
		paddingBottom: spacing.xl,
	},
	text: {
		fontSize: 24,
		fontWeight: "600",
		textAlign: "center",
		lineHeight: 32,
	},
	hintRow: {
		position: "absolute",
		bottom: spacing.md,
		flexDirection: "row",
		alignItems: "center",
	},
	hintIcon: {
		marginRight: 4,
	},
	hint: {
		fontSize: 12,
	},
});

export default FlipCard;
