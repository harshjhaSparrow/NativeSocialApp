import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import Swiper from "react-native-deck-swiper";
import { Briefcase, MapPin, SearchX, Heart, X } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useUserLocation } from "../../components/LocationGuard";
import { calculateDistance } from "../../util/location";
import { POPULAR_INTERESTS, UserProfile } from "../../types";
import Avatar from "../../components/ui/Avatar";
import Chip from "../../components/ui/Chip";
import EmptyState from "../../components/ui/EmptyState";
import { colors, typography, spacing, radii, screen } from "../../constants/theme";

export default function DiscoverScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { location: myLocation } = useUserLocation();
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);

    useEffect(() => {
        const fetchDiscover = async () => {
            if (!user) return;
            try {
                const [allUsers, myProf] = await Promise.all([api.profile.getAllWithLocation(user.uid), api.profile.get(user.uid)]);
                const maxDistMeters = (myProf?.discoveryRadius || 10) * 1000;
                const excluded = new Set<string>([user.uid, ...(myProf?.friends || []), ...(myProf?.outgoingRequests || []), ...(myProf?.incomingRequests || []), ...(myProf?.blockedUsers || [])]);
                const filtered = allUsers.filter((u: any) => {
                    if (excluded.has(u.uid) || u.isDiscoverable === false || !u.lastLocation || !myLocation) return false;
                    const R = 6371e3, rad = Math.PI / 180;
                    const [lat1, lng1, lat2, lng2] = [myLocation.lat, myLocation.lng, u.lastLocation.lat, u.lastLocation.lng];
                    const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
                    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= maxDistMeters;
                });
                setProfiles(filtered);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchDiscover();
    }, [user, myLocation]);

    const handleSwipeRight = async (index: number) => {
        if (!user) return;
        const targetUser = profiles[index];
        if (targetUser?.uid) {
            try { await api.friends.sendRequest(user.uid, targetUser.uid); } catch { }
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

    if (profiles.length === 0) return (
        <View style={[styles.center, { paddingTop: insets.top }]}>
            <EmptyState
                icon={<SearchX size={36} color={colors.textTertiary} />}
                title="No one nearby"
                subtitle="Try expanding your discovery radius in Settings."
                actionLabel="Open Settings"
                onAction={() => router.push('/settings')}
            />
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Discover</Text>
                <Text style={styles.subtitle}>Swipe right to connect</Text>
            </View>

            {/* Swipe hint row */}
            <View style={styles.hintRow}>
                <View style={[styles.hint, styles.hintLeft]}>
                    <X size={16} color={colors.danger} />
                    <Text style={[styles.hintText, { color: colors.danger }]}>Pass</Text>
                </View>
                <View style={[styles.hint, styles.hintRight]}>
                    <Heart size={16} color={colors.success} />
                    <Text style={[styles.hintText, { color: colors.success }]}>Connect</Text>
                </View>
            </View>

            <View style={styles.swiperContainer}>
                <Swiper
                    cards={profiles}
                    renderCard={(card: UserProfile) => {
                        if (!card) return <View />;
                        const distText = myLocation && card.lastLocation ? calculateDistance(myLocation.lat, myLocation.lng, card.lastLocation.lat, card.lastLocation.lng) : "Nearby";
                        return (
                            <TouchableOpacity activeOpacity={0.95} style={styles.card} onPress={() => router.push(`/profile/${card.uid}` as any)}>
                                {card.photoURL ? (
                                    <Image source={{ uri: card.photoURL }} style={styles.cardImage} resizeMode="cover" />
                                ) : (
                                    <View style={styles.cardImageFallback}>
                                        <Avatar uri={null} name={card.displayName} size="xxl" />
                                    </View>
                                )}
                                {/* Dark gradient overlay (View-based) */}
                                <View style={styles.gradient} />
                                {/* Card info */}
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardName}>{card.displayName}</Text>
                                    <View style={styles.infoRow}>
                                        {card.jobRole && (
                                            <View style={styles.infoPill}>
                                                <Briefcase size={12} color={colors.textSecondary} />
                                                <Text style={styles.infoPillText}>{card.jobRole}</Text>
                                            </View>
                                        )}
                                        <View style={styles.infoPill}>
                                            <MapPin size={12} color={colors.primaryText} />
                                            <Text style={[styles.infoPillText, { color: colors.primaryText }]}>{distText} away</Text>
                                        </View>
                                    </View>
                                    {card.bio && <Text style={styles.cardBio} numberOfLines={2}>{card.bio}</Text>}
                                    {card.interests && card.interests.length > 0 && (
                                        <View style={styles.tags}>
                                            {card.interests.slice(0, 4).map(id => {
                                                const tag = POPULAR_INTERESTS.find(i => i.id === id);
                                                return (
                                                    <View key={id} style={styles.tag}>
                                                        <Text style={styles.tagText}>{tag ? `${tag.emoji} ${tag.label}` : id}</Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    onSwipedRight={handleSwipeRight}
                    onSwipedAll={() => setProfiles([])}
                    cardIndex={0}
                    backgroundColor="transparent"
                    stackSize={3}
                    cardVerticalMargin={0}
                    cardHorizontalMargin={0}
                    animateCardOpacity
                />
            </View>
        </View>
    );
}

const CARD_HEIGHT = screen.height * 0.62;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg0 },
    header: { paddingHorizontal: spacing.s5, paddingTop: spacing.s3, paddingBottom: spacing.s1 },
    title: { color: colors.textPrimary, fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, letterSpacing: -0.5 },
    subtitle: { color: colors.textTertiary, fontSize: typography.size.sm, marginTop: 2 },
    hintRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.s6, marginBottom: spacing.s2 },
    hint: { flexDirection: 'row', alignItems: 'center', gap: spacing.s1 },
    hintLeft: {}, hintRight: {},
    hintText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold },
    swiperContainer: { flex: 1 },
    card: {
        height: CARD_HEIGHT,
        borderRadius: radii.r7,
        overflow: 'hidden',
        backgroundColor: colors.bg2,
        borderWidth: 1,
        borderColor: colors.border1,
    },
    cardImage: { width: '100%', height: '65%' },
    cardImageFallback: { width: '100%', height: '65%', backgroundColor: colors.bg3, justifyContent: 'center', alignItems: 'center' },
    gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
    cardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.s5 },
    cardName: { color: colors.white, fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, marginBottom: spacing.s2, letterSpacing: -0.4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3, marginBottom: spacing.s3 },
    infoPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.s1 },
    infoPillText: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
    cardBio: { color: 'rgba(255,255,255,0.7)', fontSize: typography.size.sm, lineHeight: 20, marginBottom: spacing.s3 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
    tag: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: spacing.s3, paddingVertical: spacing.s1, borderRadius: radii.rFull, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    tagText: { color: colors.white, fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
});
