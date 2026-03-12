import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Animated,
    PanResponder,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import { Briefcase, MapPin, SearchX, Heart, X, Info } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useUserLocation } from "../../components/LocationGuard";
import { calculateDistance } from "../../util/location";
import { POPULAR_INTERESTS, UserProfile } from "../../types";
import Avatar from "../../components/ui/Avatar";
import EmptyState from "../../components/ui/EmptyState";
import { colors, typography, spacing, radii, screen } from "../../constants/theme";

const SWIPE_THRESHOLD = screen.width * 0.30;
const CARD_WIDTH = screen.width - spacing.s5 * 2;
const CARD_HEIGHT = screen.height * 0.52;

// ─── Single swipeable card ────────────────────────────────────────────────────
function SwipeCard({
    card,
    onSwipeLeft,
    onSwipeRight,
    isTop,
    index,
}: {
    card: UserProfile;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    isTop: boolean;
    index: number;
}) {
    const pan = useRef(new Animated.ValueXY()).current;
    const likeOpacity = useRef(new Animated.Value(0)).current;
    const nopeOpacity = useRef(new Animated.Value(0)).current;
    const router = useRouter();
    const { location: myLocation } = useUserLocation();

    // Fix stale closures by using refs for callbacks
    const onSwipeLeftRef = useRef(onSwipeLeft);
    const onSwipeRightRef = useRef(onSwipeRight);
    const isTopRef = useRef(isTop);

    useEffect(() => {
        onSwipeLeftRef.current = onSwipeLeft;
        onSwipeRightRef.current = onSwipeRight;
        isTopRef.current = isTop;
    }, [onSwipeLeft, onSwipeRight, isTop]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => isTopRef.current,
            onMoveShouldSetPanResponder: (_, g) =>
                isTopRef.current && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
            onPanResponderGrant: () => {
                pan.setOffset({ x: (pan.x as any)._value, y: 0 });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (_, g) => {
                pan.setValue({ x: g.dx, y: 0 });
                // Label fade
                if (g.dx > 0) {
                    likeOpacity.setValue(Math.min(g.dx / SWIPE_THRESHOLD, 1));
                    nopeOpacity.setValue(0);
                } else {
                    nopeOpacity.setValue(Math.min(-g.dx / SWIPE_THRESHOLD, 1));
                    likeOpacity.setValue(0);
                }
            },
            onPanResponderRelease: (_, g) => {
                pan.flattenOffset();
                if (g.dx > SWIPE_THRESHOLD) {
                    Animated.timing(pan, { toValue: { x: screen.width * 1.5, y: 0 }, duration: 280, useNativeDriver: true }).start(() => onSwipeRightRef.current());
                } else if (g.dx < -SWIPE_THRESHOLD) {
                    Animated.timing(pan, { toValue: { x: -screen.width * 1.5, y: 0 }, duration: 280, useNativeDriver: true }).start(() => onSwipeLeftRef.current());
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start();
                    Animated.timing(likeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                    Animated.timing(nopeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    const rotate = pan.x.interpolate({ inputRange: [-screen.width, 0, screen.width], outputRange: ['-12deg', '0deg', '12deg'] });

    const distText =
        myLocation && card.lastLocation
            ? calculateDistance(myLocation.lat, myLocation.lng, card.lastLocation.lat, card.lastLocation.lng)
            : "Nearby";

    // Cards below top are slightly scaled/offset
    const scale = isTop ? 1 : 1 - index * 0.04;
    const translateY = isTop ? 0 : index * 10;

    if (!isTop) {
        return (
            <Animated.View
                style={[
                    styles.cardWrapper,
                    { transform: [{ scale }, { translateY }], zIndex: 10 - index },
                ]}
                pointerEvents="none"
            >
                <View style={styles.card}>
                    {card.photoURL ? (
                        <Image source={{ uri: card.photoURL }} style={styles.cardPhoto} resizeMode="cover" />
                    ) : (
                        <View style={styles.cardPhotoFallback}>
                            <Avatar uri={null} name={card.displayName} size="xxl" />
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            style={[
                styles.cardWrapper,
                { transform: [{ translateX: pan.x }, { rotate }], zIndex: 20 },
            ]}
            {...panResponder.panHandlers}
        >
            {/* LIKE stamp */}
            <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
                <Text style={styles.stampTextLike}>CONNECT</Text>
            </Animated.View>
            {/* NOPE stamp */}
            <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
                <Text style={styles.stampTextNope}>PASS</Text>
            </Animated.View>

            <View style={styles.card}>
                {/* Photo takes top portion */}
                {card.photoURL ? (
                    <Image source={{ uri: card.photoURL }} style={styles.cardPhoto} resizeMode="cover" />
                ) : (
                    <View style={styles.cardPhotoFallback}>
                        <Avatar uri={null} name={card.displayName} size="xxl" />
                    </View>
                )}

                {/* Thin gradient at bottom of photo */}
                <View style={styles.photoGradient} />

                {/* Info panel — FULLY VISIBLE below photo */}
                <View style={styles.infoPanel}>
                    {/* Name + age row */}
                    <View style={styles.nameRow}>
                        <Text style={styles.cardName} numberOfLines={1}>{card.displayName}</Text>
                        <TouchableOpacity onPress={() => router.push(`/profile/${card.uid}` as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Info size={20} color={colors.primaryText} />
                        </TouchableOpacity>
                    </View>

                    {/* Pills: job + distance */}
                    <View style={styles.pillRow}>
                        {card.jobRole ? (
                            <View style={styles.pill}>
                                <Briefcase size={12} color={colors.primaryText} />
                                <Text style={styles.pillText} numberOfLines={1}>{card.jobRole}</Text>
                            </View>
                        ) : null}
                        <View style={styles.pill}>
                            <MapPin size={12} color={colors.success} />
                            <Text style={[styles.pillText, { color: colors.success }]}>{distText} away</Text>
                        </View>
                    </View>

                    {/* Bio */}
                    {card.bio ? (
                        <Text style={styles.cardBio} numberOfLines={3}>{card.bio}</Text>
                    ) : null}

                    {/* Interests */}
                    {card.interests && card.interests.length > 0 && (
                        <View style={styles.tagsRow}>
                            {card.interests.slice(0, 5).map(id => {
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
            </View>
        </Animated.View>
    );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { location: myLocation } = useUserLocation();
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [cardIndex, setCardIndex] = useState(0);

    useEffect(() => {
        const fetchDiscover = async () => {
            if (!user) return;
            try {
                const [allUsers, myProf] = await Promise.all([
                    api.profile.getAllWithLocation(user.uid),
                    api.profile.get(user.uid),
                ]);
                const maxDistMeters = (myProf?.discoveryRadius || 10) * 1000;
                
                let localSwiped: string[] = [];
                try {
                    const stored = await AsyncStorage.getItem(`swipedUsers_${user.uid}`);
                    if (stored) localSwiped = JSON.parse(stored);
                } catch (e) {}

                const excluded = new Set<string>([
                    user.uid,
                    ...(myProf?.friends || []),
                    ...(myProf?.outgoingRequests || []),
                    ...(myProf?.incomingRequests || []),
                    ...(myProf?.blockedUsers || []),
                    ...localSwiped,
                ]);
                const filtered = allUsers.filter((u: any) => {
                    if (excluded.has(u.uid) || u.isDiscoverable === false || !u.lastLocation || !myLocation) return false;
                    const R = 6371e3, rad = Math.PI / 180;
                    const [lat1, lng1, lat2, lng2] = [myLocation.lat, myLocation.lng, u.lastLocation.lat, u.lastLocation.lng];
                    const a =
                        Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
                        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
                    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= maxDistMeters;
                });
                setProfiles(filtered);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchDiscover();
    }, [user, myLocation]);

    const recordSwipe = async (targetUid: string) => {
        if (!user) return;
        try {
            const key = `swipedUsers_${user.uid}`;
            const stored = await AsyncStorage.getItem(key);
            const swipedIds = stored ? JSON.parse(stored) : [];
            swipedIds.push(targetUid);
            await AsyncStorage.setItem(key, JSON.stringify(swipedIds));
        } catch (e) {
            console.error("Failed to save swipe locally", e);
        }
    };

    const handleSwipeRight = () => {
        const target = profiles[cardIndex];
        if (user && target?.uid) {
            // Do not await to avoid blocking UI
            api.friends.sendRequest(user.uid, target.uid).catch(() => {});
            recordSwipe(target.uid);
        }
        setCardIndex(i => i + 1);
    };

    const handleSwipeLeft = () => {
        const target = profiles[cardIndex];
        if (target?.uid) {
            recordSwipe(target.uid);
        }
        setCardIndex(i => i + 1);
    };

    const remaining = profiles.slice(cardIndex, cardIndex + 3);
    const allSwiped = !loading && profiles.length > 0 && remaining.length === 0;
    const noneNearby = !loading && profiles.length === 0;

    if (loading || allSwiped || noneNearby) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Keep header visible on all states */}
                <View style={styles.header}>
                    <Text style={styles.title}>Discover</Text>
                    {!loading && (
                        <Text style={styles.subtitle}>
                            {noneNearby ? '0 people nearby' : 'All caught up!'}
                        </Text>
                    )}
                </View>
                <View style={styles.center}>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : allSwiped ? (
                        <EmptyState
                            icon={<Heart size={36} color={colors.textTertiary} />}
                            title="You're all caught up!"
                            subtitle="You've seen everyone nearby. Check back later or expand your discovery radius."
                            actionLabel="Open Settings"
                            onAction={() => router.push('/settings')}
                        />
                    ) : (
                        <EmptyState
                            icon={<SearchX size={36} color={colors.textTertiary} />}
                            title="No one nearby"
                            subtitle="Try expanding your discovery radius in Settings."
                            actionLabel="Open Settings"
                            onAction={() => router.push('/settings')}
                        />
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Discover</Text>
                <Text style={styles.subtitle}>{profiles.length - cardIndex} people nearby</Text>
            </View>

            {/* Card stack */}
            <View style={styles.deckArea}>
                {[...remaining].reverse().map((card, revIdx) => {
                    const actualIdx = remaining.length - 1 - revIdx; // 0 = top
                    return (
                        <SwipeCard
                            key={card.uid}
                            card={card}
                            isTop={actualIdx === 0}
                            index={actualIdx}
                            onSwipeLeft={handleSwipeLeft}
                            onSwipeRight={handleSwipeRight}
                        />
                    );
                })}
            </View>

            {/* Action buttons */}
            <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
                {/* Pass */}
                <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={handleSwipeLeft} activeOpacity={0.8}>
                    <X size={28} color={colors.danger} strokeWidth={2.5} />
                </TouchableOpacity>

                {/* Boost (super-like / future use) */}
                <View style={styles.actionBtnSmall}>
                    <Text style={styles.countText}>{profiles.length - cardIndex}</Text>
                    <Text style={styles.countLabel}>left</Text>
                </View>

                {/* Connect */}
                <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={handleSwipeRight} activeOpacity={0.8}>
                    <Heart size={28} color={colors.success} strokeWidth={2.5} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        paddingHorizontal: spacing.s5,
        paddingTop: spacing.s2,
        paddingBottom: spacing.s3,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.s3,
    },
    title: {
        color: colors.textPrimary,
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.extrabold,
        letterSpacing: -0.5,
    },
    subtitle: {
        color: colors.textTertiary,
        fontSize: typography.size.sm,
    },

    // ── Deck ──────────────────────────────────────────────────────────────────
    deckArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: spacing.s5,
    },

    cardWrapper: {
        position: 'absolute',
        width: CARD_WIDTH,
        borderRadius: radii.r6,
        // shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 12,
    },

    card: {
        width: '100%',
        backgroundColor: colors.bg2,
        borderRadius: radii.r6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border1,
    },

    cardPhoto: {
        width: '100%',
        height: CARD_HEIGHT,
    },
    cardPhotoFallback: {
        width: '100%',
        height: CARD_HEIGHT,
        backgroundColor: colors.bg3,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Subtle gradient at bottom of photo
    photoGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: CARD_HEIGHT - 60,
        height: 60,
        backgroundColor: colors.bg2, // hard stop — matches info panel perfectly
    },

    // ── Info panel — always fully visible ─────────────────────────────────────
    infoPanel: {
        backgroundColor: colors.bg2,
        paddingHorizontal: spacing.s5,
        paddingTop: spacing.s3,
        paddingBottom: spacing.s4,
        gap: spacing.s2,
    },

    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardName: {
        color: colors.textPrimary,
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.extrabold,
        letterSpacing: -0.4,
        flex: 1,
        marginRight: spacing.s2,
    },

    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s1,
        backgroundColor: colors.bg3,
        paddingHorizontal: spacing.s3,
        paddingVertical: 5,
        borderRadius: radii.rFull,
        borderWidth: 1,
        borderColor: colors.border1,
    },
    pillText: {
        color: colors.textSecondary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },

    cardBio: {
        color: colors.textSecondary,
        fontSize: typography.size.sm,
        lineHeight: 19,
    },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
    tag: {
        backgroundColor: colors.primaryGlow,
        paddingHorizontal: spacing.s3,
        paddingVertical: 5,
        borderRadius: radii.rFull,
        borderWidth: 1,
        borderColor: 'rgba(59,130,246,0.3)',
    },
    tagText: {
        color: colors.primaryText,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },

    // ── Swipe stamps ──────────────────────────────────────────────────────────
    stamp: {
        position: 'absolute',
        top: 36,
        zIndex: 99,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: radii.r3,
        borderWidth: 3,
    },
    stampLike: {
        left: 20,
        borderColor: colors.success,
        backgroundColor: 'rgba(34,197,94,0.1)',
        transform: [{ rotate: '-15deg' }],
    },
    stampNope: {
        right: 20,
        borderColor: colors.danger,
        backgroundColor: 'rgba(239,68,68,0.1)',
        transform: [{ rotate: '15deg' }],
    },
    stampTextLike: {
        color: colors.success,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.extrabold,
        letterSpacing: 1.5,
    },
    stampTextNope: {
        color: colors.danger,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.extrabold,
        letterSpacing: 1.5,
    },

    // ── Action buttons ────────────────────────────────────────────────────────
    actions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.s6,
        paddingTop: spacing.s4,
        paddingHorizontal: spacing.s6,
    },
    actionBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 8,
    },
    passBtn: {
        borderColor: colors.danger,
        backgroundColor: colors.dangerGlow,
    },
    likeBtn: {
        borderColor: colors.success,
        backgroundColor: colors.successGlow,
    },
    actionBtnSmall: {
        alignItems: 'center',
    },
    countText: {
        color: colors.textPrimary,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.extrabold,
    },
    countLabel: {
        color: colors.textTertiary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
    },
});
