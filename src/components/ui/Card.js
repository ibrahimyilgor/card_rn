import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, spacing } from "../../styles/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const Card = ({
	children,
	variant = "default", // 'default' | 'elevated' | 'outlined'
	style,
	onPress,
	animated = true, // Enable/disable animations
	animationDelay = 0, // Delay for staggered animations
	...props
}) => {
	const { theme, shadows, isDark } = useTheme();

	// Animation values
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const fadeAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;
	const translateAnim = useRef(new Animated.Value(animated ? 20 : 0)).current;

	useEffect(() => {
		if (animated) {
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 400,
					delay: animationDelay,
					useNativeDriver: true,
				}),
				Animated.spring(translateAnim, {
					toValue: 0,
					delay: animationDelay,
					useNativeDriver: true,
					speed: 12,
					bounciness: 6,
				}),
			]).start();
		}
	}, [animated, animationDelay]);

	const handlePressIn = () => {
		if (onPress) {
			Animated.spring(scaleAnim, {
				toValue: 0.97,
				useNativeDriver: true,
				speed: 50,
				bounciness: 4,
			}).start();
		}
	};

	const handlePressOut = () => {
		if (onPress) {
			Animated.spring(scaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				speed: 50,
				bounciness: 4,
			}).start();
		}
	};

	const getVariantStyles = () => {
		switch (variant) {
			case "elevated":
				return {
					...shadows.medium,
					backgroundColor: theme.background.elevated,
				};
			case "outlined":
				return {
					backgroundColor: theme.background.paper,
					borderWidth: 1,
					borderColor: theme.border.main,
				};
			default:
				return {
					backgroundColor: theme.background.card,
					borderWidth: 1,
					borderColor: theme.border.subtle,
				};
		}
	};

	const animatedContainerStyle = {
		opacity: fadeAnim,
		transform: [{ translateY: translateAnim }, { scale: scaleAnim }],
	};

	// Non-pressable card with fade-in animation
	if (!onPress) {
		return (
			<Animated.View
				style={[animatedContainerStyle, styles.card, getVariantStyles(), style]}
				{...props}
			>
				{children}
			</Animated.View>
		);
	}

	// Pressable card with scale animation
	return (
		<AnimatedPressable
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			style={[animatedContainerStyle, styles.card, getVariantStyles(), style]}
			{...props}
		>
			{children}
		</AnimatedPressable>
	);
};

const styles = StyleSheet.create({
	card: {
		borderRadius: borderRadius.lg,
		padding: spacing.md,
	},
});

export default Card;
