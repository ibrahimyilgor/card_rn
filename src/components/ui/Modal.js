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
	Dimensions,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, spacing } from "../../styles/theme";

const WINDOW_HEIGHT = Dimensions.get("window").height;

const Modal = ({
	visible,
	onClose,
	title,
	children,
	footer,
	size = "medium", // 'small' | 'medium' | 'large' | 'full'
	showCloseButton = true,
	verticalAlign = "center", // 'auto' | 'top' | 'center'
}) => {
	const { theme, shadows } = useTheme();
	const isIOS = Platform.OS === "ios";
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

	const resolvedVerticalAlign =
		verticalAlign === "auto" ? "center" : verticalAlign;

	return (
		<RNModal
			visible={visible}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View style={styles.root}>
				<Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
					<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				</Animated.View>

				<View
					style={[
						styles.overlay,
						resolvedVerticalAlign === "top" ? styles.overlayTop : null,
					]}
				>
					<Animated.View
						style={[
							styles.container,
							{
								width: getWidth(),
								maxHeight: isIOS ? "85%" : WINDOW_HEIGHT * 0.85,
								backgroundColor: theme.background.elevated,
								borderColor: theme.border.main,
								opacity: contentOpacity,
								transform: [
									{ scale: scaleAnim },
									{ translateY: translateYAnim },
								],
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
											style={[
												styles.closeIcon,
												{ color: theme.text.secondary },
											]}
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
							keyboardShouldPersistTaps="always"
							keyboardDismissMode="none"
							automaticallyAdjustContentInsets={false}
							automaticallyAdjustKeyboardInsets={false}
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
			</View>
		</RNModal>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		width: "100%",
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: spacing.md,
	},
	overlayTop: {
		justifyContent: "flex-start",
		paddingTop: spacing.xl,
		paddingBottom: spacing.md,
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.6)",
	},
	container: {
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
