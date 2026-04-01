import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Animated,
	Pressable,
	Dimensions,
	Easing,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { spacing, borderRadius } from "../styles/theme";

const { width, height } = Dimensions.get("window");

const AnimatedConfirmBox = ({
	visible,
	title,
	message,
	confirmLabel,
	cancelLabel,
	confirmVariant = "success", // 'success', 'warning', 'danger'
	bottomOffset = 56, // Height of bottom buttons container
	buttonBorderRadius = 22,
	onConfirm,
	onClose,
}) => {
	const { theme } = useTheme();
	const slideAnim = useRef(new Animated.Value(height)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 400,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 300,
					easing: Easing.out(Easing.quad),
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: height,
					duration: 300,
					easing: Easing.in(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 0,
					duration: 200,
					easing: Easing.in(Easing.quad),
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible, slideAnim, opacityAnim]);

	if (!visible) return null;

	return (
		<>
			{/* Overlay */}
			<Animated.View
				style={[
					styles.overlay,
					{ opacity: opacityAnim, pointerEvents: visible ? "auto" : "none" },
				]}
				onTouchEnd={onClose}
			/>

			{/* Modal Container */}
			<Animated.View
				style={[
					styles.container(bottomOffset),
					{
						backgroundColor: theme.background.paper,
						transform: [{ translateY: slideAnim }],
					},
				]}
			>
				{/* Header */}
				<View style={[styles.header, { borderBottomColor: theme.border.main }]}>
					<Text style={[styles.title, { color: theme.text.primary }]}>
						{title}
					</Text>
					<Pressable onPress={onClose} style={styles.closeButton}>
						<MaterialCommunityIcons
							name="close"
							size={24}
							color={theme.text.secondary}
						/>
					</Pressable>
				</View>

				{/* Message */}
				<View style={styles.content}>
					<Text style={[styles.message, { color: theme.text.primary }]}>
						{message}
					</Text>
				</View>

				{/* Buttons */}
				<View style={styles.buttonRow}>
					{/* Cancel Button */}
					<Pressable
						onPress={onClose}
						style={[
							styles.button,
							{ borderRadius: buttonBorderRadius },
							styles.cancelButton,
						]}
					>
						<MaterialCommunityIcons name="close" size={18} color="#fff" />
					</Pressable>

					{/* Confirm Button */}
					<Pressable
						onPress={() => {
							onConfirm();
							onClose();
						}}
						style={[
							styles.button,
							{ borderRadius: buttonBorderRadius },
							styles.confirmButton,
						]}
					>
						<MaterialCommunityIcons name="check" size={18} color="#fff" />
					</Pressable>
				</View>
			</Animated.View>
		</>
	);
};

const styles = StyleSheet.create({
	overlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0, 0, 0, 0.3)",
		zIndex: 99,
	},
	container: (bottomOffset) => ({
		position: "absolute",
		bottom: bottomOffset,
		left: 0,
		right: 0,
		borderTopLeftRadius: borderRadius.xl,
		borderTopRightRadius: borderRadius.xl,
		zIndex: 100,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 8,
	}),
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		flex: 1,
	},
	closeButton: {
		padding: spacing.sm,
	},
	content: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
	},
	message: {
		fontSize: 15,
		lineHeight: 22,
	},
	buttonRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.lg,
		justifyContent: "flex-end",
	},
	button: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},
	cancelButton: {
		backgroundColor: "#ef4444",
	},
	confirmButton: {
		backgroundColor: "#22c55e",
	},
});

export default AnimatedConfirmBox;
