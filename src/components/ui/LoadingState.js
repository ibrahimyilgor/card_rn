import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	ActivityIndicator,
	StyleSheet,
	Animated,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { spacing } from "../../styles/theme";

const LoadingState = ({ message, fullScreen = false }) => {
	const { theme } = useTheme();

	// Pulse animation values
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const opacityAnim = useRef(new Animated.Value(0.7)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		// Fade in
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 300,
			useNativeDriver: true,
		}).start();

		// Pulse animation loop
		const pulseAnimation = Animated.loop(
			Animated.sequence([
				Animated.parallel([
					Animated.timing(scaleAnim, {
						toValue: 1.1,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(opacityAnim, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
				]),
				Animated.parallel([
					Animated.timing(scaleAnim, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(opacityAnim, {
						toValue: 0.7,
						duration: 600,
						useNativeDriver: true,
					}),
				]),
			]),
		);
		pulseAnimation.start();

		return () => pulseAnimation.stop();
	}, []);

	return (
		<Animated.View
			style={[
				styles.container,
				fullScreen && styles.fullScreen,
				{
					backgroundColor: fullScreen
						? theme.background.default
						: "transparent",
					opacity: fadeAnim,
				},
			]}
		>
			<Animated.View
				style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
			>
				<ActivityIndicator size="large" color={theme.primary.main} />
			</Animated.View>
			{message && (
				<Text style={[styles.message, { color: theme.text.secondary }]}>
					{message}
				</Text>
			)}
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.xl,
	},
	fullScreen: {
		flex: 1,
	},
	message: {
		marginTop: spacing.md,
		fontSize: 16,
	},
});

export default LoadingState;
