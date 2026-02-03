import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useI18n } from "../../context/I18nContext";
import { spacing } from "../../styles/theme";
import Modal from "./Modal";
import Button from "./Button";

const AlertDialog = ({
	visible,
	onClose,
	title,
	message,
	buttonLabel,
	variant = "primary", // 'primary' | 'danger' | 'success'
}) => {
	const { theme } = useTheme();
	const { t } = useI18n();

	const footer = (
		<View style={styles.footer}>
			<Button variant={variant} onPress={onClose}>
				{buttonLabel || t("ok")}
			</Button>
		</View>
	);

	return (
		<Modal
			visible={visible}
			onClose={onClose}
			title={title}
			footer={footer}
			size="small"
			showCloseButton={false}
		>
			<Text style={[styles.message, { color: theme.text.secondary }]}>
				{message}
			</Text>
		</Modal>
	);
};

const styles = StyleSheet.create({
	message: {
		fontSize: 15,
		lineHeight: 22,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "flex-end",
	},
});

export default AlertDialog;
