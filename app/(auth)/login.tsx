import axios from 'axios';
import { Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function AuthPage() {
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            let response;
            if (isLogin) {
                response = await api.auth.login(email, password);
            } else {
                response = await api.auth.signup(email, password);
            }
            login(response.user);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const msg = err.response?.data?.error || err.response?.data?.message || err.message;
                setError(
                    msg === "Network Error"
                        ? "Network Error: Cannot reach server. If using local backend, update the API_BASE URL in services/api.ts"
                        : msg
                );
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Image source={require('../../assets/images/MainLogoONLY.png')} style={{ width: 80, height: 80, borderRadius: 20 }} />
                    <Text style={styles.subtitle}>
                        {isLogin
                            ? 'Welcome back! Your community is waiting.'
                            : 'Create a profile and start connecting instantly.'}
                    </Text>
                </View>

                <View style={styles.formCard}>
                    <Input
                        placeholder="hello@example.com"
                        label="Email Address"
                        icon={<Mail size={20} color="#64748b" />}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Input
                        placeholder="••••••••"
                        label="Password"
                        icon={<Lock size={20} color="#64748b" />}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <Button onPress={handleSubmit} fullWidth isLoading={loading} style={styles.submitButton}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </Button>

                    <View style={styles.dividerBox}>
                        <View style={styles.divider} />
                        <Text style={styles.dividerText}>Or continue with</Text>
                        <View style={styles.divider} />
                    </View>

                    <Button variant="secondary" fullWidth onPress={() => alert("Google Login requires native setup. Please use email/password for Expo Go.")}>
                        Google (Not implemented on mobile)
                    </Button>

                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                        }}
                    >
                        <Text style={styles.toggleText}>
                            {isLogin ? 'New to Orbyt? ' : 'Have an account? '}
                            <Text style={styles.toggleTextHighlight}>
                                {isLogin ? 'Sign Up' : 'Log In'}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 32 },
    subtitle: { color: '#94a3b8', fontSize: 16, textAlign: 'center', marginTop: 16, maxWidth: 280 },
    formCard: { backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b' },
    errorBox: { padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', marginBottom: 16 },
    errorText: { color: '#f87171', textAlign: 'center', fontSize: 14 },
    submitButton: { marginTop: 16, marginBottom: 24 },
    dividerBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    divider: { flex: 1, height: 1, backgroundColor: '#1e293b' },
    dividerText: { marginHorizontal: 16, color: '#64748b', fontSize: 14 },
    toggleButton: { marginTop: 24, alignItems: 'center' },
    toggleText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
    toggleTextHighlight: { color: '#3b82f6' }
});
