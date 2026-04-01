import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Animated,
	Pressable,
	Dimensions,
	ScrollView,
	Easing,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { spacing, borderRadius } from "../styles/theme";

const { height } = Dimensions.get("window");

const SortBottomSheet = ({
	visible,
	title,
	options,
	selectedValue,
	onSelect,
	onClose,
}) => {
	const { theme } = useTheme();
	const slideAnim = useRef(new Animated.Value(height)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;
	const overlayOpacityAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 450,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 350,
					easing: Easing.out(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(overlayOpacityAnim, {
					toValue: 1,
					duration: 350,
					easing: Easing.out(Easing.quad),
					useNativeDriver: false,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: height,
					duration: 350,
					easing: Easing.in(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 0,
					duration: 250,
					easing: Easing.in(Easing.quad),
					useNativeDriver: true,
				}),
				Animated.timing(overlayOpacityAnim, {
					toValue: 0,
					duration: 250,
					easing: Easing.in(Easing.quad),
					useNativeDriver: false,
				}),
			]).start();
		}
	}, [visible, slideAnim, opacityAnim, overlayOpacityAnim]);

	if (!visible) return null;

	return (
		<>
			{/* Overlay */}
			<Animated.View
				style={[
					styles.overlay,
					{
						opacity: overlayOpacityAnim,
						backgroundColor: "rgba(0, 0, 0, 0.3)",
					},
				]}
				onTouchEnd={onClose}
			/>

			{/* Bottom Sheet */}
			<Animated.View
				style={[
					styles.container,
					{
						transform: [{ translateY: slideAnim }],
						opacity: opacityAnim,
						backgroundColor: theme.background.paper,
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

				{/* Options */}
				<ScrollView
					style={styles.optionsContainer}
					showsVerticalScrollIndicator={false}
				>
					{options.map((option) => {
						const isSelected = selectedValue === option.value;
						return (
							<Pressable
								key={option.value}
								onPress={() => {
									onSelect(option.value);
									onClose();
								}}
								style={[
									styles.optionRow,
									{
										backgroundColor: isSelected
											? theme.primary.main + "12"
											: "transparent",
									},
								]}
							>
								{/* Icon */}
								<View
									style={[
										styles.iconContainer,
										{
											backgroundColor: isSelected
												? theme.primary.main + "20"
												: "transparent",
										},
									]}
								>
									<MaterialCommunityIcons
										name={option.icon}
										size={24}
										color={
											isSelected ? theme.primary.main : theme.text.secondary
										}
									/>
								</View>

								{/* Label */}
								<Text
									style={[
										styles.optionLabel,
										{
											color: isSelected
												? theme.primary.main
												: theme.text.primary,
											fontWeight: isSelected ? "700" : "600",
										},
									]}
								>
									{option.label}
								</Text>

								{/* Checkmark */}
								{isSelected && (
									<MaterialCommunityIcons
										name="check-circle"
										size={24}
										color={theme.primary.main}
										style={styles.checkmark}
									/>
								)}
							</Pressable>
						);
					})}
				</ScrollView>
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
		zIndex: 99,
	},
	container: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		borderTopLeftRadius: borderRadius.xl,
		borderTopRightRadius: borderRadius.xl,
		maxHeight: "70%",
		zIndex: 100,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 8,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
	},
	closeButton: {
		padding: spacing.sm,
	},
	optionsContainer: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
	},
	optionRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		marginBottom: spacing.xs,
		borderRadius: borderRadius.lg,
	},
	iconContainer: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginRight: spacing.md,
	},
	optionLabel: {
		fontSize: 15,
		flex: 1,
	},
	checkmark: {
		marginLeft: spacing.sm,
	},
});

export default SortBottomSheet;
