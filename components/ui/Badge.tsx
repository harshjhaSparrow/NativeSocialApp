import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../../constants/theme';

type BadgeVariant = 'default' | 'blue' | 'red' | 'green' | 'amber' | 'purple' | 'teal';

interface BadgeProps {
    label: string | number;
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
    style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    default: { bg: colors.bg3, text: colors.textSecondary, border: colors.border1 },
    blue: { bg: colors.primaryGlow, text: colors.primaryText, border: colors.primary },
    red: { bg: colors.dangerGlow, text: colors.danger, border: colors.danger },
    green: { bg: colors.successGlow, text: colors.success, border: colors.success },
    amber: { bg: colors.warningGlow, text: colors.warning, border: colors.warning },
    purple: { bg: colors.purpleGlow, text: colors.purple, border: colors.purple },
    teal: { bg: 'rgba(20,184,166,0.12)', text: colors.teal, border: colors.teal },
};

export default function Badge({ label, variant = 'default', size = 'md', style }: BadgeProps) {
    const v = variantColors[variant];
    const isSmall = size === 'sm';

    return (
        <View style={[
            styles.base,
            {
                backgroundColor: v.bg,
                borderColor: v.border,
                paddingHorizontal: isSmall ? spacing.s1 : spacing.s2,
                paddingVertical: isSmall ? 1 : 3,
                minWidth: isSmall ? 16 : 20,
                height: isSmall ? 16 : 22,
                borderRadius: radii.rFull,
            },
            style,
        ]}>
            <Text style={[
                styles.text,
                {
                    color: v.text,
                    fontSize: isSmall ? typography.size.xs : typography.size.sm - 1,
                },
            ]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: typography.weight.bold,
        textAlign: 'center',
    },
});
