import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../../constants/theme';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';

interface CardProps {
    children: React.ReactNode;
    variant?: CardVariant;
    padding?: number;
    radius?: number;
    style?: ViewStyle;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
    default: { backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.border0 },
    elevated: { backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border1, ...shadows.md },
    outlined: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border1 },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
};

export default function Card({ children, variant = 'default', padding = spacing.s4, radius = radii.r6, style }: CardProps) {
    return (
        <View style={[styles.base, variantStyles[variant], { padding, borderRadius: radius }, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: { overflow: 'hidden' },
});
