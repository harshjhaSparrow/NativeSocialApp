import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, typography, spacing, MIN_TOUCH } from '../../constants/theme';

interface ScreenHeaderProps {
    title: string;
    onBack?: () => void;
    trailing?: React.ReactNode;
    transparent?: boolean;
}

export default function ScreenHeader({ title, onBack, trailing, transparent = false }: ScreenHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.header,
            { paddingTop: insets.top + spacing.s2 },
            transparent ? styles.transparent : styles.solid,
        ]}>
            {/* Left */}
            <View style={styles.side}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <ChevronLeft size={26} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Center */}
            <Text style={styles.title} numberOfLines={1}>{title}</Text>

            {/* Right */}
            <View style={[styles.side, styles.sideRight]}>
                {trailing}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.s4,
        paddingBottom: spacing.s3,
        minHeight: MIN_TOUCH + spacing.s3,
    },
    solid: {
        backgroundColor: colors.bg1,
        borderBottomWidth: 1,
        borderBottomColor: colors.border0,
    },
    transparent: {
        backgroundColor: 'transparent',
    },
    side: {
        width: 64,
        justifyContent: 'center',
    },
    sideRight: {
        alignItems: 'flex-end',
    },
    backBtn: {
        width: MIN_TOUCH,
        height: MIN_TOUCH,
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        textAlign: 'center',
        color: colors.textPrimary,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
    },
});
