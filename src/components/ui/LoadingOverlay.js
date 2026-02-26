import React, { useEffect, useRef } from "react";
import {
	View,
	ActivityIndicator,
	StyleSheet,
	Text,
	Animated,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { spacing, borderRadius } from "../../styles/theme";

const LoadingOverlay = ({ visible = false, message = "Loading..." }) => {
	const { theme } = useTheme();
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(opacity, {
			toValue: visible ? 1 : 0,
			duration: 180,
			useNativeDriver: true,
		}).start();
	}, [visible]);

	// Don't render at all when not visible (after fade-out)
	if (!visible && opacity.__getValue() === 0) return null;

	return (
		<Animated.View
			style={[styles.backdrop, { opacity }]}
			pointerEvents={visible ? "auto" : "none"}
		>
			<View style={[styles.box, { backgroundColor: theme.background.card }]}>
				<ActivityIndicator size="large" color={theme.primary.main} />
				{!!message && (
					<Text style={[styles.msg, { color: theme.text.secondary }]}>
						{message}
					</Text>
				)}
			</View>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 999,
	},
	box: {
		padding: spacing.xl,
		borderRadius: borderRadius.md,
		alignItems: "center",
		minWidth: 160,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.2,
		shadowRadius: 12,
		elevation: 10,
	},
	msg: {
		marginTop: spacing.md,
		fontSize: 14,
		fontWeight: "600",
		textAlign: "center",
	},
});

export default LoadingOverlay;
