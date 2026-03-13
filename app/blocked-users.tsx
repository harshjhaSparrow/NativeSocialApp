import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { UserProfile } from "@/types";

export default function BlockedUsersScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        const fetchBlockedUsers = async () => {
            if (!user) return;
            try {
                const profile = await api.profile.get(user?.uid);
                if (profile && profile?.blockedUsers?.length) {
                    const blocked = await api.profile.getBatch(profile?.blockedUsers);
                    setBlockedUsers(blocked);
                } else {
                    setBlockedUsers([]);
                }
            } catch (e) {
                console.error("Failed to load blocked users", e);
            } finally {
                setLoading(false);
            }
        };
        fetchBlockedUsers();
    }, [user]);

    const handleUnblock = async (targetUid: string) => {
        if (!user) return;
        try {
            await api.userAction.unblock(user?.uid, targetUid);
            setBlockedUsers(prev => prev.filter(u => u?.uid !== targetUid));
        } catch (e) {
            Alert.alert("Error", "Failed to unblock user");
        }
    };

    return (
        <View style={styles?.container}>
            {/* Header */}
            <View style={styles?.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles?.backButton}>
                    <ChevronLeft size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles?.headerTitle}>Blocked Users</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles?.center}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : blockedUsers?.length === 0 ? (
                <View style={styles?.center}>
                    <Text style={styles?.emptyText}>You haven&apos;t blocked anyone.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles?.scrollArea}>
                    <View style={styles?.cardList}>
                        {blockedUsers.map((u, i) => (
                            <View key={u?.uid} style={[styles?.listItem, i === blockedUsers?.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={styles?.userInfo}>
                                    <View style={styles?.avatar}>
                                        {u?.photoURL ? (
                                            <Image source={{ uri: u?.photoURL }} style={styles?.avatarImage} />
                                        ) : (
                                            <Text style={styles?.avatarText}>{u?.displayName?.[0]?.toUpperCase() || '?'}</Text>
                                        )}
                                    </View>
                                    <View>
                                        <Text style={styles?.userName}>{u?.displayName}</Text>
                                        <Text style={styles?.userSubtitle}>Blocked</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles?.unblockBtn}
                                    onPress={() => handleUnblock(u?.uid)}
                                >
                                    <Text style={styles?.unblockText}>Unblock</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    backButton: { width: 40, alignItems: 'flex-start' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    scrollArea: { padding: 16, paddingBottom: 60 },
    cardList: { backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden' },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    userName: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold' },
    userSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    unblockBtn: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
    unblockText: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold' },
    emptyText: { color: '#94a3b8', fontSize: 16 }
});
