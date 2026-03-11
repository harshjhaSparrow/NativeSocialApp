import axios from 'axios';
import { Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

// IMPORTANT: Replace with your actual Google OAuth Web Client ID from Google Cloud Console
// Steps: cloud.google.com → APIs & Services → Credentials → Create OAuth Client ID (Web application)
// Authorised redirect URIs must include: https://auth.expo.io/@harshjhasd/orbyt
const GOOGLE_CLIENT_ID = '793742543220-aggmdtptgpbns7vrem2ftpelnv73g4e4.apps.googleusercontent.com';

WebBrowser.maybeCompleteAuthSession();

const useGoogleAuth = () => {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'orbyt' });

    const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: GOOGLE_CLIENT_ID,
            redirectUri,
            scopes: ['openid', 'profile', 'email'],
            responseType: AuthSession.ResponseType.Code,
            usePKCE: true,
        },
        discovery
    );

    return { request, response, promptAsync, redirectUri };
};

export default function AuthPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { request, response, promptAsync } = useGoogleAuth();

    // Handle Google OAuth response
    React.useEffect(() => {
        if (response?.type === 'success') {
            handleGoogleAuthSuccess(response);
        } else if (response?.type === 'error') {
            setError('Google sign-in failed. Please try again.');
            setGoogleLoading(false);
        } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
            setGoogleLoading(false);
        }
    }, [response]);

    const handleGoogleAuthSuccess = async (oauthResponse: AuthSession.AuthSessionResult) => {
        if (oauthResponse.type !== 'success') return;
        setGoogleLoading(true);
        try {
            const { code, codeVerifier } = oauthResponse.params as any;
            if (!code) throw new Error('No authorization code returned');

            // Exchange code for tokens with Google
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    redirect_uri: AuthSession.makeRedirectUri({ scheme: 'orbyt' }),
                    grant_type: 'authorization_code',
                    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
                }).toString(),
            });
            const tokens = await tokenResponse.json();
            if (tokens.error) throw new Error(tokens.error_description || tokens.error);

            // Fetch user info from Google
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            const userInfo = await userInfoResponse.json();

            // Log in with our backend
            const result = await api.auth.googleLogin(
                userInfo.email,
                userInfo.name || userInfo.email,
                userInfo.picture || ''
            );
            login(result.user);
        } catch (err: any) {
            setError(err?.message || 'Google sign-in failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleGooglePress = async () => {
        setError(null);
        setGoogleLoading(true);
        await promptAsync();
    };

    const handleSubmit = async () => {
        if (!email || !password) {
            setError('Please fill in all fields.');
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
                    msg === 'Network Error'
                        ? 'Network Error: Cannot reach server. Check your connection.'
                        : msg
                );
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred.');
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
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Image source={require('../../assets/images/MainLogoONLY.png')} style={{ width: 80, height: 80, borderRadius: 20 }} />
                    <Text style={styles.subtitle}>
                        {isLogin
                            ? 'Welcome back! Your community is waiting.'
                            : 'Create a profile and start connecting instantly.'}
                    </Text>
                </View>

                <View style={styles.formCard}>
                    {/* Google Sign-In Button */}
                    <TouchableOpacity
                        style={[styles.googleBtn, (googleLoading || !request) && styles.googleBtnDisabled]}
                        onPress={handleGooglePress}
                        disabled={googleLoading || !request}
                        activeOpacity={0.85}
                    >
                        {googleLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Image
                                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                                style={styles.googleIcon}
                            />
                        )}
                        <Text style={styles.googleBtnText}>
                            {googleLoading ? 'Signing in...' : `Continue with Google`}
                        </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.dividerBox}>
                        <View style={styles.divider} />
                        <Text style={styles.dividerText}>or use email</Text>
                        <View style={styles.divider} />
                    </View>

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

                    <Button
                        label={isLogin ? 'Sign In' : 'Create Account'}
                        onPress={handleSubmit}
                        fullWidth
                        loading={loading}
                        style={styles.submitButton}
                    />

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

                    {/* Legal disclaimer — shown only on Sign Up */}
                    {!isLogin && (
                        <View style={styles.legalBox}>
                            <Text style={styles.legalText}>
                                By creating an account you agree to our{' '}
                                <Text style={styles.legalLink} onPress={() => router.push('/terms-of-service' as any)}>Terms of Service</Text>
                                {' '}and{' '}
                                <Text style={styles.legalLink} onPress={() => router.push('/privacy-policy' as any)}>Privacy Policy</Text>.
                            </Text>
                        </View>
                    )}
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
    formCard: { backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', gap: 16 },

    // Google button
    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
        borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, gap: 10,
    },
    googleBtnDisabled: { opacity: 0.5 },
    googleIcon: { width: 20, height: 20, borderRadius: 2 },
    googleBtnText: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },

    errorBox: { padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
    errorText: { color: '#f87171', textAlign: 'center', fontSize: 14 },
    submitButton: { marginTop: 4 },
    dividerBox: { flexDirection: 'row', alignItems: 'center' },
    divider: { flex: 1, height: 1, backgroundColor: '#1e293b' },
    dividerText: { marginHorizontal: 16, color: '#64748b', fontSize: 13 },
    toggleButton: { alignItems: 'center' },
    toggleText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
    toggleTextHighlight: { color: '#3b82f6' },
    legalBox: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
    legalText: { color: '#475569', fontSize: 12, textAlign: 'center', lineHeight: 18 },
    legalLink: { color: '#3b82f6', fontWeight: '600', textDecorationLine: 'underline' },
});
