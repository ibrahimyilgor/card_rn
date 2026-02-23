import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, Text, StyleSheet, Pressable, Animated } from "react-native";
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
	const focusAnim = useRef(new Animated.Value(0)).current;
	const labelAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(focusAnim, {
			toValue: isFocused ? 1 : 0,
			duration: 200,
			useNativeDriver: false,
		}).start();

		Animated.spring(labelAnim, {
			toValue: isFocused ? 1 : 0,
			useNativeDriver: true,
			speed: 20,
			bounciness: 4,
		}).start();
	}, [isFocused]);

	const borderColor = focusAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [error ? theme.error.main : theme.border.main, error ? theme.error.main : theme.primary.main],
	});

	return (
		<View style={[styles.container, style]}>
			{label && (
				<Animated.Text style={[styles.label, { color: theme.text.primary, transform: [{ translateX: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }] }]}>
					{label}
				</Animated.Text>
			)}

			<Animated.View
				style={[
					styles.inputContainer,
					{
						backgroundColor: theme.background.paper,
						borderColor: borderColor,
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
			</Animated.View>

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
