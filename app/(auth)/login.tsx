/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from "axios";
import { useRouter } from "expo-router";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

/* ---------------- GOOGLE CONFIG ---------------- */

GoogleSignin.configure({
  webClientId:
    "793742543220-aggmdtptgpbns7vrem2ftpelnv73g4e4.apps.googleusercontent.com",
  iosClientId:
    "793742543220-bnrhm15pgnjs5b1evvadu2tpjjk6pv6m.apps.googleusercontent.com",
  offlineAccess: true,
  scopes: ["email", "profile"],
} as any);

/* ---------------- COMPONENT ---------------- */

export default function AuthPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- GOOGLE LOGIN ---------------- */

  const handleGooglePress = async () => {
    try {
      setError(null);
      setGoogleLoading(true);

      await GoogleSignin.hasPlayServices();

      const response: any = await GoogleSignin.signIn();
      console.log("Google userInfo:", response);

      const user = response?.data?.user;
      const idToken = response?.data?.idToken;

      if (!user?.email) {
        throw new Error("Google did not return an email");
      }

      const result = await api.auth.googleLogin(
        user.email,
        user.name || user.email,
        user.photo || ""
      );

      login(result.user);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setError("Google sign in cancelled");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setError("Google sign in already in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services not available");
      } else {
        console.log("Google Sign In Error:", error);
        setError(
          error?.message
            ? `Google sign-in failed: ${error.message}`
            : "Google sign-in failed"
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ---------------- EMAIL LOGIN ---------------- */

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
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message;

        setError(
          msg === "Network Error"
            ? "Network Error: Cannot reach server. Check your connection."
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

  /* ---------------- UI ---------------- */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/MainLogoONLY.png")}
            style={{ width: 80, height: 80, borderRadius: 20 }}
          />
          <Text style={styles.subtitle}>
            {isLogin
              ? "Welcome back! Your community is waiting."
              : "Create a profile and start connecting instantly."}
          </Text>
        </View>

        <View style={styles.formCard}>
          {/* GOOGLE LOGIN */}

          <TouchableOpacity
            style={[
              styles.googleBtn,
              googleLoading && styles.googleBtnDisabled,
            ]}
            onPress={handleGooglePress}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Image
                source={{
                  uri: "https://developers.google.com/identity/images/g-logo.png",
                }}
                style={styles.googleIcon}
              />
            )}

            <Text style={styles.googleBtnText}>
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}

          <View style={styles.dividerBox}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or use email</Text>
            <View style={styles.divider} />
          </View>

          {/* EMAIL INPUT */}

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
            label={isLogin ? "Sign In" : "Create Account"}
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
              {isLogin ? "New to Orbyt? " : "Have an account? "}
              <Text style={styles.toggleTextHighlight}>
                {isLogin ? "Sign Up" : "Log In"}
              </Text>
            </Text>
          </TouchableOpacity>

          {!isLogin && (
            <View style={styles.legalBox}>
              <Text style={styles.legalText}>
                By creating an account you agree to our{" "}
                <Text
                  style={styles.legalLink}
                  onPress={() => router.push("/terms-of-service" as any)}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.legalLink}
                  onPress={() => router.push("/privacy-policy" as any)}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  subtitle: {
    color: "#94a3b8",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    maxWidth: 280,
  },
  formCard: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 16,
  },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 10,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },

  errorBox: {
    padding: 16,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { color: "#f87171", textAlign: "center", fontSize: 14 },

  submitButton: { marginTop: 4 },

  dividerBox: { flexDirection: "row", alignItems: "center" },
  divider: { flex: 1, height: 1, backgroundColor: "#1e293b" },
  dividerText: { marginHorizontal: 16, color: "#64748b", fontSize: 13 },

  toggleButton: { alignItems: "center" },
  toggleText: { color: "#64748b", fontSize: 14, fontWeight: "600" },
  toggleTextHighlight: { color: "#3b82f6" },

  legalBox: { paddingTop: 16, borderTopWidth: 1, borderTopColor: "#1e293b" },
  legalText: { color: "#475569", fontSize: 12, textAlign: "center" },
  legalLink: { color: "#3b82f6", fontWeight: "600", textDecorationLine: "underline" },
});