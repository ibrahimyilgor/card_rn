import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { spacing, borderRadius } from "../../styles/theme";
import Button from "./Button";

const EmptyState = ({
	icon = "📭",
	iconName,
	iconColor,
	title,
	description,
	actionLabel,
	onAction,
}) => {
	const { theme } = useTheme();

	// Animation values
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const bounceAnim = useRef(new Animated.Value(0)).current;
	const floatAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		// Fade in animation
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 400,
			useNativeDriver: true,
		}).start();

		// Bounce in for icon
		Animated.spring(bounceAnim, {
			toValue: 1,
			delay: 100,
			useNativeDriver: true,
			speed: 8,
			bounciness: 12,
		}).start();

		// Floating animation for icon
		const floatAnimation = Animated.loop(
			Animated.sequence([
				Animated.timing(floatAnim, {
					toValue: -8,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(floatAnim, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			]),
		);
		floatAnimation.start();

		return () => floatAnimation.stop();
	}, []);

	return (
		<Animated.View style={[styles.container, { opacity: fadeAnim }]}>
			<Animated.View
				style={{
					transform: [{ scale: bounceAnim }, { translateY: floatAnim }],
				}}
			>
				{iconName ? (
					<MaterialCommunityIcons
						name={iconName}
						size={64}
						color={iconColor || theme.primary.main}
						style={styles.iconComponent}
					/>
				) : (
					<Text style={styles.icon}>{icon}</Text>
				)}
			</Animated.View>
			<Text style={[styles.title, { color: theme.text.primary }]}>{title}</Text>
			{description && (
				<Text style={[styles.description, { color: theme.text.secondary }]}>
					{description}
				</Text>
			)}
			{actionLabel && onAction && (
				<Button onPress={onAction} style={styles.button}>
					{actionLabel}
				</Button>
			)}
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.xl,
	},
	icon: {
		fontSize: 64,
		marginBottom: spacing.md,
	},
	iconComponent: {
		marginBottom: spacing.md,
	},
	title: {
		fontSize: 20,
		fontWeight: "600",
		textAlign: "center",
		marginBottom: spacing.sm,
	},
	description: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: spacing.lg,
		lineHeight: 20,
	},
	button: {
		marginTop: spacing.sm,
	},
});

export default EmptyState;
