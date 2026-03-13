import React, { useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableWithoutFeedback, ViewStyle } from 'react-native';
import { animation, colors, MIN_TOUCH, radii, spacing, typography } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
}

const variantStyles: Record<Variant, { bg: string; border: string; text: string }> = {
    primary: { bg: colors.primary, border: colors.primary, text: colors.white },
    secondary: { bg: colors.bg3, border: colors.border1, text: colors.textPrimary },
    ghost: { bg: 'transparent', border: colors.border1, text: colors.textPrimary },
    danger: { bg: colors.dangerGlow, border: colors.danger, text: colors.danger },
    success: { bg: colors.successGlow, border: colors.success, text: colors.success },
};

const sizeStyles: Record<Size, { height: number; px: number; fontSize: number }> = {
    sm: { height: 36, px: spacing.s3, fontSize: typography.size.sm },
    md: { height: MIN_TOUCH, px: spacing.s5, fontSize: typography.size.base },
    lg: { height: 52, px: spacing.s6, fontSize: typography.size.md },
};

export default function Button({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon,
    style,
}: ButtonProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, ...animation.spring.press }).start();
    const handlePressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animation.spring.press }).start();

    const v = variantStyles[variant];
    const s = sizeStyles[size];
    const isDisabled = disabled || loading;

    return (
        <TouchableWithoutFeedback
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isDisabled}
        >
            <Animated.View
                style={[
                    styles.base,
                    {
                        backgroundColor: v.bg,
                        borderColor: v.border,
                        height: s.height,
                        paddingHorizontal: s.px,
                        transform: [{ scale }],
                        opacity: isDisabled ? 0.5 : 1,
                        alignSelf: fullWidth ? 'stretch' : 'flex-start',
                    },
                    style,
                ]}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={v.text} />
                ) : (
                    <>
                        {icon && <>{icon}</>}
                        <Text style={[styles.label, { color: v.text, fontSize: s.fontSize }]}>{label}</Text>
                    </>
                )}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.r4,
        borderWidth: 1,
        gap: spacing.s2,
    },
    label: {
        fontWeight: typography.weight.bold,
        letterSpacing: typography.tracking.base,
    },
});
