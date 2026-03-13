import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableWithoutFeedback, ViewStyle } from 'react-native';
import { animation, colors, radii, spacing, typography } from '../../constants/theme';

interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    style?: ViewStyle;
}

export default function Chip({ label, selected = false, onPress, style }: ChipProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, ...animation.spring.press }).start();
    const handlePressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animation.spring.press }).start();

    return (
        <TouchableWithoutFeedback onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[
                styles.base,
                selected ? styles.selected : styles.unselected,
                { transform: [{ scale }] },
                style,
            ]}>
                <Text style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
                    {label}
                </Text>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    base: {
        paddingHorizontal: spacing.s3,
        paddingVertical: spacing.s2,
        borderRadius: radii.rFull,
        borderWidth: 1.5,
    },
    unselected: {
        backgroundColor: colors.bg3,
        borderColor: colors.border1,
    },
    selected: {
        backgroundColor: colors.primaryGlow,
        borderColor: colors.primary,
    },
    label: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
    labelUnselected: { color: colors.textSecondary },
    labelSelected: { color: colors.primaryText },
});
