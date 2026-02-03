import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../styles/theme';

const ThemedText = ({ 
  children, 
  style, 
  variant = 'body', // 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'button'
  color = 'primary', // 'primary' | 'secondary' | 'disabled' | 'error' | 'success'
  ...props 
}) => {
  const { theme } = useTheme();

  const getTextColor = () => {
    switch (color) {
      case 'secondary':
        return theme.text.secondary;
      case 'disabled':
        return theme.text.disabled;
      case 'error':
        return theme.error.main;
      case 'success':
        return theme.success.main;
      case 'primary':
      default:
        return theme.text.primary;
    }
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'h1':
        return {
          fontSize: typography.fontSize.xxxl,
          fontWeight: typography.fontWeight.bold,
          lineHeight: typography.fontSize.xxxl * 1.2,
        };
      case 'h2':
        return {
          fontSize: typography.fontSize.xxl,
          fontWeight: typography.fontWeight.bold,
          lineHeight: typography.fontSize.xxl * 1.2,
        };
      case 'h3':
        return {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          lineHeight: typography.fontSize.xl * 1.3,
        };
      case 'caption':
        return {
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.regular,
          lineHeight: typography.fontSize.sm * 1.4,
        };
      case 'button':
        return {
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.semibold,
          lineHeight: typography.fontSize.md * 1.2,
        };
      case 'body':
      default:
        return {
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.regular,
          lineHeight: typography.fontSize.md * 1.5,
        };
    }
  };

  return (
    <Text
      style={[
        { color: getTextColor() },
        getVariantStyle(),
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

export default ThemedText;
