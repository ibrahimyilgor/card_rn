import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../styles/theme';

const ThemedView = ({ 
  children, 
  style, 
  variant = 'default', // 'default' | 'paper' | 'elevated' | 'gradient'
  ...props 
}) => {
  const { theme, isDark } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'paper':
        return theme.background.paper;
      case 'elevated':
        return theme.background.elevated;
      case 'card':
        return theme.background.card;
      default:
        return theme.background.default;
    }
  };

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={theme.background.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, style]}
        {...props}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ThemedView;
