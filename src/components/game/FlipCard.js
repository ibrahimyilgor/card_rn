import React, { useRef, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	Animated,
	Platform,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, spacing } from "../../styles/theme";

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
		inputRange: [0, 0.5, 1],
		outputRange: [1, 0, 0],
	});

	const backOpacity = flipAnim.interpolate({
		inputRange: [0, 0.5, 1],
		outputRange: [0, 0, 1],
	});

	return (
		<Pressable
			onPress={disabled ? undefined : onFlip}
			style={[styles.container, style]}
		>
			{/* Front Side */}
			<Animated.View
				style={[
					styles.card,
					styles.cardFront,
					{
						backgroundColor: theme.background.elevated,
						borderColor: theme.border.main,
					},
					shadows.large,
					{
						transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
						opacity: frontOpacity,
						backfaceVisibility: "hidden",
					},
				]}
			>
				<Text style={[styles.label, { color: theme.primary.main }]}>FRONT</Text>
				<Text style={[styles.text, { color: theme.text.primary }]}>
					{frontText}
				</Text>
				<Text style={[styles.hint, { color: theme.text.disabled }]}>
					Tap to flip
				</Text>
			</Animated.View>

			{/* Back Side */}
			<Animated.View
				style={[
					styles.card,
					styles.cardBack,
					{
						backgroundColor: theme.primary.dark,
						borderColor: theme.primary.main,
					},
					shadows.large,
					{
						transform: [{ perspective: 1000 }, { rotateY: backRotate }],
						opacity: backOpacity,
						backfaceVisibility: "hidden",
					},
				]}
			>
				<Text style={[styles.label, { color: theme.primary.light }]}>BACK</Text>
				<Text style={[styles.text, { color: "#ffffff" }]}>{backText}</Text>
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
		padding: spacing.lg,
		justifyContent: "center",
		alignItems: "center",
	},
	cardFront: {},
	cardBack: {},
	label: {
		position: "absolute",
		top: spacing.md,
		left: spacing.md,
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 1,
	},
	text: {
		fontSize: 24,
		fontWeight: "600",
		textAlign: "center",
		lineHeight: 32,
	},
	hint: {
		position: "absolute",
		bottom: spacing.md,
		fontSize: 12,
	},
});

export default FlipCard;
