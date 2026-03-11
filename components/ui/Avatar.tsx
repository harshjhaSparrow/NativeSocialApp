import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, typography } from '../../constants/theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface AvatarProps {
    uri?: string | null;
    name?: string | null;
    size?: AvatarSize;
    online?: boolean;
    style?: ViewStyle;
}

const sizes: Record<AvatarSize, number> = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 52,
    xl: 80,
    xxl: 120,
};

const fontSizes: Record<AvatarSize, number> = {
    xs: 10,
    sm: 13,
    md: 16,
    lg: 20,
    xl: 32,
    xxl: 48,
};

const badgeSizes: Record<AvatarSize, number> = {
    xs: 0,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
    xxl: 20,
};

// Generate a stable color from a name string
function getInitialColor(name?: string | null): string {
    const palette = [
        '#3b82f6', '#a855f7', '#22c55e', '#f59e0b',
        '#ef4444', '#14b8a6', '#ec4899', '#f97316',
    ];
    if (!name) return palette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
}

export default function Avatar({ uri, name, size = 'md', online = false, style }: AvatarProps) {
    const dim = sizes[size];
    const fontSize = fontSizes[size];
    const badgeSize = badgeSizes[size];
    const initials = name ? name.slice(0, 2).toUpperCase() : '?';
    const bgColor = getInitialColor(name);

    return (
        <View style={[{ width: dim, height: dim }, style]}>
            <View style={[styles.circle, { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: uri ? colors.bg3 : bgColor }]}>
                {uri ? (
                    <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                ) : (
                    <Text style={[styles.initials, { fontSize, color: colors.white }]}>{initials}</Text>
                )}
            </View>
            {online && badgeSize > 0 && (
                <View style={[styles.onlineDot, {
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    bottom: 0,
                    right: 0,
                }]} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    circle: {
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    initials: {
        fontWeight: typography.weight.bold,
        letterSpacing: -0.5,
    },
    onlineDot: {
        position: 'absolute',
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: colors.bg1,
    },
});
