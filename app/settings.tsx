import { useRouter } from "expo-router";
import { ArrowRight, Bell, ChevronLeft, Code, Edit2, FileText, LogOut, PauseCircle, Radar, ShieldOff, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { api } from "../services/api";

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { pushToken } = useNotifications();
    const pushEnabled = !!pushToken;

    const [isDiscoverable, setIsDiscoverable] = useState(true);
    const [discoveryRadius, setDiscoveryRadius] = useState(10);
    const [loading, setLoading] = useState(true);
    const [deletingAccount, setDeletingAccount] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            if (!user) return;
            try {
                const profile = await api.profile.get(user?.uid);
                if (profile) { setIsDiscoverable(profile?.isDiscoverable !== false); setDiscoveryRadius(profile?.discoveryRadius || 10); }
            } catch { }
            finally { setLoading(false); }
        };
        fetch();
    }, [user]);

    const toggleDiscoverable = async () => {
        if (!user) return;
        const next = !isDiscoverable; setIsDiscoverable(next);
        try { await api.profile.createOrUpdate(user?.uid, { isDiscoverable: next }); }
        catch { setIsDiscoverable(!next); }
    };

    const saveRadius = async (val: number) => {
        setDiscoveryRadius(val);
        if (!user) return;
        try { await api.profile.createOrUpdate(user?.uid, { discoveryRadius: val }); } catch { }
    };

    const handleLogout = async () => { await logout(); router.replace("/(auth)/login" as any); };

    const handleConfirmDelete = () => {
        Alert.alert("Delete Account", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    if (!user) return;
                    setDeletingAccount(true);
                    try { const ok = await api.profile.delete(user?.uid); if (ok) { await logout(); router.replace("/(auth)/login" as any); } }
                    catch { Alert.alert("Error", "Account deletion failed"); }
                    finally { setDeletingAccount(false); }
                }
            },
        ]);
    };

    if (loading || deletingAccount) return <View style={styles?.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

    const SectionLabel = ({ label }: { label: string }) => (
        <Text style={styles?.sectionLabel}>{label}</Text>
    );

    const SettingRow = ({ label, subtitle, leading, trailing }: { label: string; subtitle?: string; leading: React.ReactNode; trailing: React.ReactNode }) => (
        <View style={styles?.settingRow}>
            <View style={styles?.settingIcon}>{leading}</View>
            <View style={styles?.settingBody}>
                <Text style={styles?.settingLabel}>{label}</Text>
                {subtitle && <Text style={styles?.settingSubtitle}>{subtitle}</Text>}
            </View>
            {trailing}
        </View>
    );

    const NavRow = ({ label, icon, danger, onPress }: { label: string; icon?: React.ReactNode; danger?: boolean; onPress: () => void }) => (
        <TouchableOpacity style={styles?.navRow} onPress={onPress} activeOpacity={0.7}>
            {icon && <View style={styles?.navIcon}>{icon}</View>}
            <Text style={[styles?.navLabel, danger && styles?.navLabelDanger]}>{label}</Text>
            {!danger && <ArrowRight size={16} color={colors.textTertiary} />}
        </TouchableOpacity>
    );

    return (
        <View style={[styles?.container, { paddingTop: insets?.top }]}>
            {/* Header */}
            <View style={styles?.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles?.backBtn}>
                    <ChevronLeft size={26} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles?.title}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles?.scroll}>

                {/* NOTIFICATIONS */}
                <SectionLabel label="NOTIFICATIONS" />
                <View style={styles?.card}>
                    <SettingRow
                        label="Push Notifications"
                        subtitle={pushEnabled ? "You'll be notified when away" : "Grant OS permissions to enable"}
                        leading={<Bell size={18} color={pushEnabled ? colors.primary : colors.textTertiary} />}
                        trailing={<Switch value={pushEnabled} disabled trackColor={{ true: colors.primary }} />}
                    />
                </View>

                {/* DISCOVERY */}
                <SectionLabel label="DISCOVERY" />
                <View style={[styles?.card, { gap: spacing.s4 }]}>
                    <SettingRow
                        label="Discovery Radius"
                        subtitle={`Show users & posts within ${discoveryRadius}km`}
                        leading={<Radar size={18} color={colors.primaryText} />}
                        trailing={
                            <View style={styles?.radiusBadge}>
                                <Text style={styles?.radiusBadgeText}>{discoveryRadius}km</Text>
                            </View>
                        }
                    />
                    {/* Radius picker */}
                    <View style={styles?.radiusRow}>
                        {[1, 5, 10, 25, 50].map(val => (
                            <TouchableOpacity key={val} style={[styles?.radiusBtn, discoveryRadius === val && styles?.radiusBtnActive]} onPress={() => saveRadius(val)}>
                                <Text style={[styles?.radiusBtnText, discoveryRadius === val && styles?.radiusBtnTextActive]}>{val}km</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles?.divider} />
                    <SettingRow
                        label="Pause Discoverability"
                        subtitle="Hide me from map & discovery"
                        leading={<PauseCircle size={18} color={!isDiscoverable ? colors.orange : colors.textTertiary} />}
                        trailing={<Switch value={!isDiscoverable} onValueChange={toggleDiscoverable} trackColor={{ true: colors.orange }} />}
                    />
                </View>

                {/* ACCOUNT */}
                <SectionLabel label="ACCOUNT" />
                <View style={styles?.card}>
                    <NavRow label="Edit Profile" icon={<Edit2 size={16} color={colors.textSecondary} />} onPress={() => router.push("/edit-profile")} />
                    <View style={styles?.divider} />
                    <NavRow label="Blocked Users" icon={<ShieldOff size={16} color={colors.textSecondary} />} onPress={() => router.push("/blocked-users")} />
                    <View style={styles?.divider} />
                    <NavRow label="Sign Out" icon={<LogOut size={16} color={colors.danger} />} danger onPress={handleLogout} />
                    <View style={styles?.divider} />
                    <NavRow label="Delete Account" icon={<Trash2 size={16} color={colors.danger} />} danger onPress={handleConfirmDelete} />
                </View>

                {/* LEGAL */}
                <SectionLabel label="LEGAL" />
                <View style={styles?.card}>
                    <NavRow label="Privacy Policy" icon={<FileText size={16} color={colors.textSecondary} />} onPress={() => router.push('/privacy-policy' as any)} />
                    <View style={styles?.divider} />
                    <NavRow label="Terms of Service" icon={<FileText size={16} color={colors.textSecondary} />} onPress={() => router.push('/terms-of-service' as any)} />
                </View>

                {/* ABOUT */}
                <SectionLabel label="ABOUT" />
                <View style={styles?.card}>
                    <NavRow label="Developer Profile" icon={<Code size={16} color={colors.primary} />} onPress={() => router.push('/developer' as any)} />
                </View>

                <Text style={styles?.version}>Orbyt v1.0.0</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.s4, paddingVertical: spacing.s3, borderBottomWidth: 1, borderBottomColor: colors.border0 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: { color: colors.textPrimary, fontSize: typography.size?.lg, fontWeight: typography.weight?.bold },
    scroll: { padding: spacing.s4, paddingBottom: 80, gap: spacing.s2 },
    sectionLabel: { color: colors.textTertiary, fontSize: typography.size?.xs, fontWeight: typography.weight?.bold, letterSpacing: typography.tracking?.widest, marginTop: spacing.s4, marginBottom: spacing.s2, paddingHorizontal: spacing.s1 },
    card: { backgroundColor: colors.bg2, borderRadius: radii.r4, borderWidth: 1, borderColor: colors.border0, padding: spacing.s4 },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3 },
    settingIcon: { width: 38, height: 38, borderRadius: radii.r3, backgroundColor: colors.bg3, justifyContent: 'center', alignItems: 'center' },
    settingBody: { flex: 1 },
    settingLabel: { color: colors.textPrimary, fontSize: typography.size?.base, fontWeight: typography.weight?.medium },
    settingSubtitle: { color: colors.textTertiary, fontSize: typography.size?.xs, marginTop: 1 },
    radiusBadge: { backgroundColor: colors.bg3, paddingHorizontal: spacing.s3, paddingVertical: spacing.s1, borderRadius: radii.rFull, borderWidth: 1, borderColor: colors.border1 },
    radiusBadgeText: { color: colors.primaryText, fontSize: typography.size?.sm, fontWeight: typography.weight?.bold },
    radiusRow: { flexDirection: 'row', gap: spacing.s2 },
    radiusBtn: { flex: 1, paddingVertical: spacing.s2, borderRadius: radii.r3, backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border0, alignItems: 'center' },
    radiusBtnActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
    radiusBtnText: { color: colors.textTertiary, fontSize: typography.size?.sm, fontWeight: typography.weight?.bold },
    radiusBtnTextActive: { color: colors.primaryText },
    divider: { height: 1, backgroundColor: colors.border0, marginVertical: spacing.s1 },
    navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3, minHeight: 44 },
    navIcon: { width: 32, justifyContent: 'center', alignItems: 'center' },
    navLabel: { flex: 1, color: colors.textPrimary, fontSize: typography.size?.base },
    navLabelDanger: { color: colors.danger },
    version: { textAlign: 'center', color: colors.textTertiary, fontSize: typography.size?.xs, marginTop: spacing.s6, marginBottom: spacing.s4 },
});
