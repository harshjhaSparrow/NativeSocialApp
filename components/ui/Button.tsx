import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    isLoading?: boolean;
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    fullWidth = false,
    style,
    disabled,
    ...props
}) => {
    const isGlobalDisabled = disabled || isLoading;

    const getContainerStyle = (): ViewStyle => {
        switch (variant) {
            case 'secondary': return styles.secondaryContainer;
            case 'outline': return styles.outlineContainer;
            case 'ghost': return styles.ghostContainer;
            case 'primary':
            default: return styles.primaryContainer;
        }
    };

    const getTextStyle = (): TextStyle => {
        switch (variant) {
            case 'secondary': return styles.secondaryText;
            case 'outline': return styles.outlineText;
            case 'ghost': return styles.ghostText;
            case 'primary':
            default: return styles.primaryText;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.baseContainer,
                getContainerStyle(),
                fullWidth && styles.fullWidth,
                isGlobalDisabled && styles.disabledContainer,
                style
            ]}
            disabled={isGlobalDisabled}
            activeOpacity={0.8}
            {...props}
        >
            {isLoading && <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#3b82f6' : '#ffffff'} style={styles.loader} />}
            <Text style={[styles.baseText, getTextStyle(), isGlobalDisabled && styles.disabledText]}>
                {children}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    baseContainer: {
        height: 56,
        paddingHorizontal: 24,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullWidth: {
        width: '100%',
    },
    disabledContainer: {
        opacity: 0.5,
    },
    baseText: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    disabledText: {
        opacity: 0.9,
    },
    primaryContainer: {
        backgroundColor: '#3b82f6',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.5)',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryText: {
        color: '#ffffff',
    },
    secondaryContainer: {
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryText: {
        color: '#ffffff',
    },
    outlineContainer: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#334155',
    },
    outlineText: {
        color: '#cbd5e1',
    },
    ghostContainer: {
        backgroundColor: 'transparent',
    },
    ghostText: {
        color: '#94a3b8',
    },
    loader: {
        marginRight: 8,
    }
});

export default Button;
