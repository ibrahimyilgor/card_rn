import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, spacing, typography } from "../../styles/theme";

const Input = ({
	label,
	value,
	onChangeText,
	placeholder,
	error,
	helperText,
	secureTextEntry = false,
	multiline = false,
	numberOfLines = 1,
	disabled = false,
	leftIcon,
	rightIcon,
	onRightIconPress,
	style,
	inputStyle,
	...props
}) => {
	const { theme } = useTheme();
	const [isFocused, setIsFocused] = useState(false);

	const getBorderColor = () => {
		if (error) return theme.error.main;
		if (isFocused) return theme.primary.main;
		return theme.border.main;
	};

	return (
		<View style={[styles.container, style]}>
			{label && (
				<Text style={[styles.label, { color: theme.text.primary }]}>
					{label}
				</Text>
			)}

			<View
				style={[
					styles.inputContainer,
					{
						backgroundColor: theme.background.paper,
						borderColor: getBorderColor(),
						borderWidth: isFocused ? 2 : 1,
					},
					multiline && { minHeight: numberOfLines * 24 + spacing.md * 2 },
					disabled && { opacity: 0.5 },
				]}
			>
				{leftIcon && (
					<View style={styles.iconContainer}>
						{leftIcon}
					</View>
				)}

				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor={theme.text.disabled}
					secureTextEntry={secureTextEntry}
					multiline={multiline}
					numberOfLines={numberOfLines}
					editable={!disabled}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					style={[
						styles.input,
						{
							color: theme.text.primary,
						},
						multiline && { textAlignVertical: "top" },
						inputStyle,
					]}
					{...props}
				/>

				{rightIcon && (
					<Pressable onPress={onRightIconPress}>
						<View style={styles.iconContainer}>
							{rightIcon}
						</View>
					</Pressable>
				)}
			</View>

			{(error || helperText) && (
				<Text
					style={[
						styles.helperText,
						{ color: error ? theme.error.main : theme.text.secondary },
					]}
				>
					{error || helperText}
				</Text>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: spacing.md,
	},
	label: {
		fontSize: typography.fontSize.sm,
		fontWeight: "600",
		marginBottom: spacing.xs,
	},
	inputContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: borderRadius.md,
		paddingHorizontal: spacing.md,
	},
	input: {
		flex: 1,
		fontSize: typography.fontSize.md,
		paddingVertical: spacing.sm + 2,
	},
	iconContainer: {
		marginRight: spacing.sm,
	},
	icon: {
		fontSize: 20,
		marginHorizontal: spacing.xs,
	},
	helperText: {
		fontSize: typography.fontSize.xs,
		marginTop: spacing.xs,
		marginLeft: spacing.xs,
	},
});

export default Input;
