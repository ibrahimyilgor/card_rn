import React from "react";
import {
	Modal as RNModal,
	View,
	Text,
	Pressable,
	StyleSheet,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
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
			animationType="slide"
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.overlay}
			>
				<Pressable style={styles.backdrop} onPress={onClose} />

				<View
					style={[
						styles.container,
						{
							width: getWidth(),
							backgroundColor: theme.background.elevated,
							borderColor: theme.border.main,
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
				</View>
			</KeyboardAvoidingView>
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
