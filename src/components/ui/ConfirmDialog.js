import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';
import { borderRadius, spacing } from '../../styles/theme';
import Modal from './Modal';
import Button from './Button';

const ConfirmDialog = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'danger', // 'primary' | 'danger' | 'success'
  loading = false,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  const footer = (
    <View style={styles.footer}>
      <Button 
        variant="ghost" 
        onPress={onClose}
        disabled={loading}
      >
        {cancelLabel || t('cancel')}
      </Button>
      <Button 
        variant={confirmVariant} 
        onPress={onConfirm}
        loading={loading}
      >
        {confirmLabel || t('delete')}
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});

export default ConfirmDialog;
