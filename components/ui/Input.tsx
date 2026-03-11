import React, { useRef } from 'react';
import { Animated, TextInput, Text, View, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, typography, radii, spacing, animation } from '../../constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
    containerStyle?: ViewStyle;
}

export default function Input({ label, error, icon, trailingIcon, containerStyle, style, onFocus, onBlur, ...rest }: InputProps) {
    const borderAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = (e: any) => {
        Animated.spring(borderAnim, { toValue: 1, useNativeDriver: false, ...animation.spring.soft }).start();
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        Animated.spring(borderAnim, { toValue: 0, useNativeDriver: false, ...animation.spring.soft }).start();
        onBlur?.(e);
    };

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border0, colors.primary],
    });

    return (
        <View style={[styles.wrapper, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <Animated.View style={[styles.container, { borderColor }, error ? { borderColor: colors.danger } : null]}>
                {icon && <View style={styles.iconSlot}>{icon}</View>}
                <TextInput
                    style={[styles.input, style]}
                    placeholderTextColor={colors.textTertiary}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...rest}
                />
                {trailingIcon && <View style={styles.iconSlot}>{trailingIcon}</View>}
            </Animated.View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { gap: spacing.s1 },
    label: {
        color: colors.textSecondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        letterSpacing: typography.tracking.wide,
        textTransform: 'uppercase',
        marginLeft: spacing.s1,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg4,
        borderWidth: 1.5,
        borderRadius: radii.r4,
        paddingHorizontal: spacing.s3,
        minHeight: 48,
        gap: spacing.s2,
    },
    input: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: typography.size.base,
        paddingVertical: spacing.s3,
    },
    iconSlot: { opacity: 0.7 },
    errorText: {
        color: colors.danger,
        fontSize: typography.size.xs,
        marginLeft: spacing.s1,
    },
});
