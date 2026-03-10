import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Swiper from "react-native-deck-swiper";
import { Briefcase, MapPin, SearchX, User as UserIcon } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useUserLocation } from "../../components/LocationGuard";
import { calculateDistance } from "../../util/location";
import { POPULAR_INTERESTS, UserProfile } from "../../types";

const { width, height } = Dimensions.get("window");

export default function DiscoverScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { location: myLocation } = useUserLocation();

    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const fetchDiscover = async () => {
            if (!user) return;
            try {
                const [allUsers, myProf] = await Promise.all([
                    api.profile.getAllWithLocation(user.uid),
                    api.profile.get(user.uid)
                ]);

                setCurrentUserProfile(myProf);
                const maxDistanceMeters = (myProf?.discoveryRadius || 10) * 1000;

                // Exclude yourself, existing friends, pending outgoing/incoming requests, and blocked users
                const excluded = new Set<string>([
                    user.uid,
                    ...(myProf?.friends || []),
                    ...(myProf?.outgoingRequests || []),
                    ...(myProf?.incomingRequests || []),
                    ...(myProf?.blockedUsers || []),
                ]);

                const filtered = allUsers.filter((u: any) => {
                    if (excluded.has(u.uid)) return false;
                    if (u.isDiscoverable === false) return false;
                    if (!u.lastLocation || !myLocation) return false;

                    const R = 6371e3;
                    const rad = Math.PI / 180;
                    const lat1 = myLocation.lat;
                    const lng1 = myLocation.lng;
                    const lat2 = u.lastLocation.lat;
                    const lng2 = u.lastLocation.lng;
                    const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
                    const distMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    if (distMeters > maxDistanceMeters) return false;

                    return true;
                });

                setProfiles(filtered);
            } catch (e) {
                console.error("Failed to load discover profiles", e);
            } finally {
                setLoading(false);
            }
        };

        fetchDiscover();
    }, [user, myLocation]);

    const handleSwipeRight = async (index: number) => {
        if (!user) return;
        const targetUser = profiles[index];
        if (targetUser && targetUser.uid) {
            try {
                // Send Friend Request automatically on right swipe (Tinder style!)
                await api.friends.sendRequest(user.uid, targetUser.uid);
            } catch (e) {
                console.error("Failed to send request", e);
            }
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (profiles.length === 0) {
        return (
            <View style={styles.center}>
                <SearchX size={64} color="#334155" style={{ marginBottom: 16 }} />
                <Text style={styles.noProfilesText}>No one nearby.</Text>
                <Text style={styles.noProfilesSub}>Try expanding your discovery radius in Settings.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Discover</Text>
                <Text style={styles.subtitle}>Swipe Right to Add Friend</Text>
            </View>

            <View style={styles.swiperContainer}>
                <Swiper
                    cards={profiles}
                    renderCard={(card: UserProfile) => {
                        if (!card) return <View />;

                        const distText = myLocation && card.lastLocation
                            ? calculateDistance(myLocation.lat, myLocation.lng, card.lastLocation.lat, card.lastLocation.lng)
                            : "Nearby";

                        return (
                            <View style={styles.card}>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    style={{ flex: 1 }}
                                    onPress={() => router.push(`/profile/${card.uid}` as any)}
                                >
                                    {card.photoURL ? (
                                        <Image source={{ uri: card.photoURL }} style={styles.cardImage} />
                                    ) : (
                                        <View style={styles.cardAvatarFallback}>
                                            <UserIcon size={80} color="#475569" />
                                        </View>
                                    )}

                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardName}>{card.displayName}</Text>

                                        <View style={styles.infoRow}>
                                            {card.jobRole && (
                                                <View style={styles.infoPill}>
                                                    <Briefcase size={14} color="#e2e8f0" />
                                                    <Text style={styles.infoPillText}>{card.jobRole}</Text>
                                                </View>
                                            )}
                                            <View style={styles.infoPill}>
                                                <MapPin size={14} color="#3b82f6" />
                                                <Text style={[styles.infoPillText, { color: '#94a3b8' }]}>{distText} away</Text>
                                            </View>
                                        </View>

                                        {card.bio ? (
                                            <Text style={styles.cardBio} numberOfLines={2}>{card.bio}</Text>
                                        ) : null}

                                        {card.interests && card.interests.length > 0 && (
                                            <View style={styles.tagsContainer}>
                                                {card.interests.slice(0, 3).map(id => {
                                                    const tag = POPULAR_INTERESTS.find(i => i.id === id);
                                                    return (
                                                        <View key={id} style={styles.tag}>
                                                            <Text style={styles.tagText}>{tag ? `${tag.emoji} ${tag.label}` : id}</Text>
                                                        </View>
                                                    );
                                                })}
                                                {card.interests.length > 3 && (
                                                    <View style={styles.tag}>
                                                        <Text style={styles.tagText}>+{card.interests.length - 3}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    onSwipedRight={handleSwipeRight}
                    onSwipedAll={() => setProfiles([])}
                    cardIndex={0}
                    backgroundColor="transparent"
                    stackSize={3}
                    cardVerticalMargin={20}
                    cardHorizontalMargin={16}
                    animateCardOpacity
                    swipeBackCard
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
    title: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    subtitle: { color: '#94a3b8', fontSize: 16 },
    swiperContainer: { flex: 1 },
    noProfilesText: { color: '#e2e8f0', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    noProfilesSub: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    card: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1e293b',
        backgroundColor: '#0f172a',
        height: height * 0.65,
        justifyContent: 'flex-start',
    },
    cardImage: { width: '100%', height: '60%', backgroundColor: '#1e293b' },
    cardAvatarFallback: { width: '100%', height: '60%', backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
    cardInfo: { padding: 20, flex: 1, justifyContent: 'center' },
    cardName: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoPillText: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
    cardBio: { color: '#cbd5e1', fontSize: 16, lineHeight: 22, marginBottom: 16 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    tagText: { color: '#e2e8f0', fontSize: 12, fontWeight: 'bold' }
});
