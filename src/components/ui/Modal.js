import React, { useEffect, useRef } from "react";
import {
	Modal as RNModal,
	View,
	Text,
	Pressable,
	StyleSheet,
	ScrollView,
	Platform,
	Animated,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, spacing } from "../../styles/theme";

const Modal = ({
	visible,
	onClose,
	title,
	children,
	footer,
	size = "medium", // 'small' | 'medium' | 'large' | 'full'
	showCloseButton = true,
}) => {
	const { theme, shadows } = useTheme();
	const backdropAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.9)).current;
	const translateYAnim = useRef(new Animated.Value(30)).current;
	const contentOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			// Reset values
			backdropAnim.setValue(0);
			scaleAnim.setValue(0.9);
			translateYAnim.setValue(30);
			contentOpacity.setValue(0);

			// Animate in
			Animated.parallel([
				Animated.timing(backdropAnim, {
					toValue: 1,
					duration: 250,
					useNativeDriver: true,
				}),
				Animated.spring(scaleAnim, {
					toValue: 1,
					useNativeDriver: true,
					speed: 18,
					bounciness: 4,
				}),
				Animated.spring(translateYAnim, {
					toValue: 0,
					useNativeDriver: true,
					speed: 18,
					bounciness: 4,
				}),
				Animated.timing(contentOpacity, {
					toValue: 1,
					duration: 200,
					delay: 100,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [visible]);

	const getWidth = () => {
		switch (size) {
			case "small":
				return "80%";
			case "large":
				return "95%";
			case "full":
				return "100%";
			default:
				return "90%";
		}
	};

	return (
		<RNModal
			visible={visible}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
					<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				</Animated.View>

				<Animated.View
					style={[
						styles.container,
						{
							width: getWidth(),
							backgroundColor: theme.background.elevated,
							borderColor: theme.border.main,
							opacity: contentOpacity,
							transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
						},
						shadows.large,
						size === "full" && styles.fullSize,
					]}
				>
					{/* Header */}
					{(title || showCloseButton) && (
						<View
							style={[
								styles.header,
								{ borderBottomColor: theme.border.subtle },
							]}
						>
							<Text style={[styles.title, { color: theme.text.primary }]}>
								{title}
							</Text>
							{showCloseButton && (
								<Pressable onPress={onClose} style={styles.closeButton}>
									<Text
										style={[styles.closeIcon, { color: theme.text.secondary }]}
									>
										✕
									</Text>
								</Pressable>
							)}
						</View>
					)}

					{/* Content */}
					<ScrollView
						style={styles.content}
						contentContainerStyle={styles.contentContainer}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
					>
						{children}
					</ScrollView>

					{/* Footer */}
					{footer && (
						<View
							style={[styles.footer, { borderTopColor: theme.border.subtle }]}
						>
							{footer}
						</View>
					)}
				</Animated.View>
			</View>
		</RNModal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.6)",
	},
	container: {
		maxHeight: "85%",
		borderRadius: borderRadius.xl,
		borderWidth: 1,
		overflow: "hidden",
	},
	fullSize: {
		height: "100%",
		maxHeight: "100%",
		borderRadius: 0,
	},
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
		fontWeight: "600",
		flex: 1,
	},
	closeButton: {
		padding: spacing.xs,
		marginLeft: spacing.sm,
	},
	closeIcon: {
		fontSize: 20,
		fontWeight: "600",
	},
	content: {
		flexGrow: 0,
	},
	contentContainer: {
		padding: spacing.lg,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: spacing.sm,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		borderTopWidth: 1,
	},
});

export default Modal;
