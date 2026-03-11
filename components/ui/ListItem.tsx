import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, radii, spacing, animation, MIN_TOUCH } from '../../constants/theme';

interface ListItemProps {
    leading?: React.ReactNode;
    title: string;
    subtitle?: string;
    trailing?: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
    showBorder?: boolean;
}

export default function ListItem({ leading, title, subtitle, trailing, onPress, style, showBorder = false }: ListItemProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, ...animation.spring.press }).start();
    const handlePressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animation.spring.press }).start();

    const content = (
        <Animated.View style={[styles.row, showBorder && styles.bordered, { transform: [{ scale }] }, style]}>
            {leading && <View style={styles.leading}>{leading}</View>}
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
            </View>
            {trailing && <View style={styles.trailing}>{trailing}</View>}
        </Animated.View>
    );

    if (!onPress) return content;

    return (
        <TouchableWithoutFeedback onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            {content}
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TOUCH,
        paddingHorizontal: spacing.s4,
        paddingVertical: spacing.s3,
        backgroundColor: colors.bg2,
        borderRadius: radii.r4,
    },
    bordered: {
        borderWidth: 1,
        borderColor: colors.border0,
    },
    leading: { marginRight: spacing.s3 },
    content: { flex: 1 },
    trailing: { marginLeft: spacing.s3 },
    title: {
        color: colors.textPrimary,
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
    },
    subtitle: {
        color: colors.textTertiary,
        fontSize: typography.size.sm,
        marginTop: 2,
    },
});
