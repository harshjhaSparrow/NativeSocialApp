import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Bell, ChevronLeft, PauseCircle, Radar, Trash2, ArrowRight } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { api } from "../services/api";
import { UserProfile } from "@/types";

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { pushToken } = useNotifications();
    const pushEnabled = !!pushToken;

    const [isDiscoverable, setIsDiscoverable] = useState(true);
    const [discoveryRadius, setDiscoveryRadius] = useState(10);
    const [loading, setLoading] = useState(true);
    const [deletingAccount, setDeletingAccount] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                const profile = await api.profile.get(user.uid);
                if (profile) {
                    setIsDiscoverable(profile.isDiscoverable !== false);
                    setDiscoveryRadius(profile.discoveryRadius || 10);
                }
            } catch (e) {
                console.error("Failed to load settings", e);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);



    const toggleDiscoverable = async () => {
        if (!user) return;
        const newValue = !isDiscoverable;
        setIsDiscoverable(newValue);
        try {
            await api.profile.createOrUpdate(user.uid, { isDiscoverable: newValue });
        } catch (e) {
            setIsDiscoverable(!newValue);
        }
    };

    const saveRadius = async (val: number) => {
        setDiscoveryRadius(val);
        if (!user) return;
        try {
            await api.profile.createOrUpdate(user.uid, { discoveryRadius: val });
        } catch (e) {
            console.error("Failed to save radius");
        }
    };

    const handleConfirmDelete = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete your account? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (!user) return;
                        setDeletingAccount(true);
                        try {
                            const success = await api.profile.delete(user.uid);
                            if (success) {
                                await logout();
                                router.replace("/(auth)/login" as any);
                            }
                        } catch (e) {
                            console.error("Account deletion failed:", e);
                            Alert.alert("Error", "Account deletion failed");
                        } finally {
                            setDeletingAccount(false);
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        await logout();
        router.replace("/(auth)/login" as any);
    };

    if (loading || deletingAccount) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#94a3b8" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollArea}>
                {/* NOTIFICATIONS */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
                    <View style={styles.card}>
                        <View style={styles.cardRow}>
                            <View style={[styles.iconBox, pushEnabled ? styles.iconBoxActive : styles.iconBoxInactive]}>
                                <Bell size={20} color={pushEnabled ? "#fff" : "#94a3b8"} />
                            </View>
                            <View style={styles.cardTextContainer}>
                                <Text style={styles.cardTitle}>Push Notifications</Text>
                                <Text style={styles.cardSubtitle}>
                                    {pushEnabled ? "You'll get notified when away from the app" : "Grant OS permissions to enable"}
                                </Text>
                            </View>
                            <Switch value={pushEnabled} disabled={true} />
                        </View>
                    </View>
                </View>

                {/* DISCOVERY */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>DISCOVERY SETTINGS</Text>
                    <View style={[styles.card, { marginBottom: 16 }]}>
                        <View style={styles.cardRow}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                <Radar size={20} color="#3b82f6" />
                            </View>
                            <View style={styles.cardTextContainer}>
                                <Text style={styles.cardTitle}>Discovery Radius</Text>
                                <Text style={styles.cardSubtitle}>Show users & posts within {discoveryRadius}km</Text>
                            </View>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{discoveryRadius}km</Text>
                            </View>
                        </View>
                        {/* Slider replacement for React Native since range is complicated without community packages. */}
                        <View style={styles.radiusButtons}>
                            {[1, 5, 10, 25, 50].map(val => (
                                <TouchableOpacity
                                    key={val}
                                    style={[styles.radiusBtn, discoveryRadius === val && styles.radiusBtnActive]}
                                    onPress={() => saveRadius(val)}
                                >
                                    <Text style={[styles.radiusBtnText, discoveryRadius === val && styles.radiusBtnTextActive]}>{val}km</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardRow}>
                            <View style={[styles.iconBox, !isDiscoverable ? { backgroundColor: '#f97316' } : styles.iconBoxInactive]}>
                                <PauseCircle size={20} color={!isDiscoverable ? "#fff" : "#94a3b8"} />
                            </View>
                            <View style={styles.cardTextContainer}>
                                <Text style={styles.cardTitle}>Pause Discoverability</Text>
                                <Text style={styles.cardSubtitle}>Hide me from the map and discovery lists.</Text>
                            </View>
                            <Switch value={!isDiscoverable} onValueChange={toggleDiscoverable} trackColor={{ true: '#f97316' }} />
                        </View>
                    </View>
                </View>

                {/* ACCOUNT */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    <View style={styles.cardList}>
                        <TouchableOpacity style={styles.listItem} onPress={() => router.push("/edit-profile")}>
                            <Text style={styles.listTextLight}>Edit Profile</Text>
                            <ArrowRight size={16} color="#64748b" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.listItem} onPress={() => router.push("/blocked-users")}>
                            <Text style={styles.listTextLight}>Blocked Users</Text>
                            <ArrowRight size={16} color="#64748b" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.listItem} onPress={handleLogout}>
                            <Text style={styles.listTextRed}>Sign Out</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.listItem, { borderBottomWidth: 0 }]} onPress={handleConfirmDelete}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Trash2 size={16} color="#ef4444" />
                                <Text style={[styles.listTextRed, { fontWeight: 'bold' }]}>Delete Account</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Info */}
                <View style={styles.footerInfo}>
                    <Text style={styles.versionText}>Orbyt v1.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    backButton: { width: 40, alignItems: 'flex-start' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    scrollArea: { padding: 16, paddingBottom: 60 },
    sectionBox: { marginBottom: 24 },
    sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, paddingHorizontal: 8 },
    card: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', padding: 16 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    iconBoxActive: { backgroundColor: '#3b82f6' },
    iconBoxInactive: { backgroundColor: '#1e293b' },
    cardTextContainer: { flex: 1 },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    cardSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    badge: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    radiusButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    radiusBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b' },
    radiusBtnActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
    radiusBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    radiusBtnTextActive: { color: '#3b82f6' },
    ghostWarningBox: { marginTop: 12, backgroundColor: 'rgba(168, 85, 247, 0.1)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.2)', padding: 12, borderRadius: 12 },
    ghostWarningText: { color: '#c084fc', fontSize: 12, textAlign: 'center' },
    cardList: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden' },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    listTextLight: { color: '#e2e8f0', fontSize: 16 },
    listTextRed: { color: '#ef4444', fontSize: 16 },
    footerInfo: { alignItems: 'center', paddingVertical: 32 },
    versionText: { color: '#475569', fontSize: 12 }
});
