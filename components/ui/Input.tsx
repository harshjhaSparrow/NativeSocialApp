import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, style, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View style={[
                styles.inputWrapper,
                isFocused && styles.inputWrapperFocused,
                !!error && styles.inputWrapperError
            ]}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}

                <TextInput
                    style={[
                        styles.input,
                        icon && styles.inputWithIcon,
                        style
                    ]}
                    placeholderTextColor="#64748b" // slate-500
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    {...props}
                />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cbd5e1', // slate-300
        marginLeft: 4,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a', // slate-900
        borderWidth: 2,
        borderColor: '#1e293b', // slate-800
        borderRadius: 16,
        position: 'relative',
    },
    inputWrapperFocused: {
        borderColor: '#3b82f6', // primary-500
    },
    inputWrapperError: {
        borderColor: '#ef4444', // red-500
    },
    iconContainer: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    input: {
        flex: 1,
        height: 56,
        color: '#ffffff',
        fontSize: 16,
        paddingHorizontal: 16,
    },
    inputWithIcon: {
        paddingLeft: 48,
    },
    errorText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#f87171', // red-400
        marginLeft: 4,
        marginTop: 8,
    }
});

export default Input;
