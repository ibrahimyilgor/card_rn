import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing, typography } from '../../styles/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const Button = ({
  children,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'medium', // 'small' | 'medium' | 'large'
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
  ...props
}) => {
  const { theme, shadows } = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          fontSize: typography.fontSize.sm,
        };
      case 'large':
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          fontSize: typography.fontSize.lg,
        };
      default:
        return {
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          fontSize: typography.fontSize.md,
        };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: theme.secondary.main,
          textColor: theme.secondary.contrastText,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.primary.main,
          textColor: theme.primary.main,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          textColor: theme.primary.main,
        };
      case 'danger':
        return {
          backgroundColor: theme.error.main,
          textColor: theme.error.contrastText,
        };
      case 'warning':
        return {
          backgroundColor: theme.warning.main,
          textColor: '#ffffff',
        };
      case 'success':
        return {
          backgroundColor: theme.success.main,
          textColor: theme.success.contrastText,
        };
      default:
        return {
          backgroundColor: theme.primary.main,
          textColor: theme.primary.contrastText,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();
  const isDisabled = disabled || loading;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variantStyles.textColor} 
          style={styles.loader}
        />
      ) : (
        <>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text
            style={[
              styles.text,
              {
                color: variantStyles.textColor,
                fontSize: sizeStyles.fontSize,
              },
              textStyle,
            ]}
          >
            {children}
          </Text>
        </>
      )}
    </>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        { transform: [{ scale: scaleAnim }] },
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderWidth: variantStyles.borderWidth || 0,
          borderColor: variantStyles.borderColor,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        variant === 'primary' && shadows.small,
        style,
      ]}
      {...props}
    >
      {buttonContent}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    marginRight: spacing.xs,
    fontSize: 18,
  },
  loader: {
    marginVertical: 2,
  },
});

export default Button;
