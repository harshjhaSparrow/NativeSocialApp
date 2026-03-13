/* eslint-disable @typescript-eslint/no-extra-non-null-assertion */
/* eslint-disable react-hooks/exhaustive-deps */
import * as Haptics from 'expo-haptics';
import { useRouter } from "expo-router";
import { ChevronRight, LocateFixed, RefreshCw, User, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    LeafletView, MapLayer,
    MapLayerType,
    MapMarker,
    MapShape,
    MapShapeType,
    WebviewLeafletMessage
} from "react-native-leaflet-view";
import { useUserLocation } from "../../components/LocationGuard";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { UserProfile } from "../../types";
import { calculateDistance } from "../../util/location";

const { height } = Dimensions.get("window");

type NearbyUser = UserProfile & {
    distDisplay: string;
    distMeters: number;
};

const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const a =
        Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ── OSM tile layer ── */
const OSM_LAYER: MapLayer = {
    id: "osm",
    layerType: MapLayerType.TILE_LAYER,
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
};

/* ── Emoji / HTML icon helpers ── */
const myPositionIcon = `<div style="
  width:32px;height:32px;border-radius:50%;
  background:rgba(59,130,246,0.3);
  display:flex;align-items:center;justify-content:center;">
  <div style="width:16px;height:16px;border-radius:50%;
    background:#3b82f6;border:2px solid #fff;"></div>
</div>`;

const userIcon = (letter: string) => `<div style="
  width:40px;height:40px;border-radius:50%;
  background:#1e293b;border:2px solid #3b82f6;
  display:flex;align-items:center;justify-content:center;
  color:#94a3b8;font-weight:bold;font-size:16px;">
  ${letter}
</div>`;

export default function MapScreen() {
    const { location: myLocation } = useUserLocation();
    const { user: currentUser } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
    const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
    const [isListOpen, setIsListOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    /* centre the view when user taps "Locate Me" — trigger re-render with new center */
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

    const fetchData = async () => {
        try {
            if (currentUser?.uid) {
                const [allUsers, profile] = await Promise.all([
                    api.profile.getAllWithLocation(currentUser?.uid),
                    api.profile.get(currentUser?.uid),
                ]);
                setUsers(allUsers);
                setCurrentUserProfile(profile);
            }
        } catch (e) {
            console.error("Failed to load map data", e);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, [currentUser]);

    const handleRefresh = () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle?.Light);
        fetchData();
    };

    const nearbyUsers = useMemo<NearbyUser[]>(() => {
        if (!myLocation) return [];
        const maxDistanceMeters = (currentUserProfile?.discoveryRadius || 10) * 1000;
        return users
            .filter((u) => u.uid !== currentUser?.uid && u.lastLocation)
            .map((u) => {
                const distMeters = getDistanceMeters(
                    myLocation.lat, myLocation.lng,
                    u.lastLocation!.lat, u.lastLocation!.lng,
                );
                const distDisplay = calculateDistance(
                    myLocation.lat, myLocation.lng,
                    u.lastLocation!.lat, u.lastLocation!.lng,
                );
                return { ...u, distMeters, distDisplay };
            })
            .filter((u) => u.distMeters <= maxDistanceMeters)
            .sort((a, b) => a?.distMeters - b?.distMeters);
    }, [users, myLocation, currentUser, currentUserProfile]);

    /* ── Build markers for LeafletView ── */
    const mapMarkers = useMemo<MapMarker[]>(() => {
        if (!myLocation) return [];

        const markers: MapMarker[] = [
            {
                id: "me",
                position: { lat: myLocation?.lat, lng: myLocation?.lng } as any,
                icon: myPositionIcon,
                size: [32, 32] as any,
                title: "You",
            },
        ];

        nearbyUsers.forEach((u) => {
            markers.push({
                id: u?.uid,
                position: { lat: u?.lastLocation!?.lat, lng: u?.lastLocation!?.lng } as any,
                icon: userIcon(u?.displayName?.[0] ?? "?"),
                size: [40, 40] as any,
                title: u?.displayName ?? "",
            });
        });

        return markers;
    }, [myLocation, nearbyUsers]);

    /* ── Discovery radius circle ── */
    const mapShapes = useMemo<MapShape[]>(() => {
        if (!myLocation) return [];
        return [
            {
                id: "radius",
                shapeType: MapShapeType.CIRCLE,
                center: { lat: myLocation?.lat, lng: myLocation?.lng } as any,
                radius: (currentUserProfile?.discoveryRadius || 10) * 1000,
                color: "rgba(139,92,246,0.5)",
            },
        ];
    }, [myLocation, currentUserProfile]);

    const handleMapMessage = (message: WebviewLeafletMessage) => {
        if (message?.event === "onMapMarkerClicked" && message?.payload?.mapMarkerID) {
            const uid = message?.payload?.mapMarkerID;
            if (uid === "me") return;
            const found = nearbyUsers.find((u) => u?.uid === uid);
            if (found) {
                setSelectedUser(found);
                setIsListOpen(false);
            }
        } else if (message?.event === "onMapClicked") {
            setSelectedUser(null);
        }
    };

    if (!myLocation) {
        return (
            <View style={[styles?.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator color="#3b82f6" size="large" />
            </View>
        );
    }

    const centerPosition = mapCenter ?? myLocation;

    return (
        <View style={styles?.container}>
            <LeafletView
                mapLayers={[OSM_LAYER]}
                mapMarkers={mapMarkers}
                mapShapes={mapShapes}
                mapCenterPosition={{ lat: centerPosition?.lat, lng: centerPosition?.lng } as any}
                zoom={13}
                onMessageReceived={handleMapMessage}
                androidHardwareAccelerationDisabled={false}
                zoomControl
                attributionControl={false}
            />

            {/* Locate Me */}
            <TouchableOpacity
                style={styles?.locateButton}
                onPress={() => setMapCenter({ lat: myLocation?.lat, lng: myLocation?.lng })}
            >
                <LocateFixed size={24} color="#3b82f6" />
            </TouchableOpacity>

            {/* Refresh */}
            <TouchableOpacity
                style={styles?.refreshButton}
                onPress={handleRefresh}
                disabled={refreshing}
            >
                <RefreshCw size={24} color="#3b82f6" style={refreshing ? { opacity: 0.5 } : {}} />
            </TouchableOpacity>

            {/* Selected User Popup */}
            {selectedUser && (
                <View style={styles?.selectedUserCard}>
                    <View style={styles?.selectedUserRow}>
                        <View style={styles?.selectedUserAvatar}>
                            {selectedUser?.photoURL ? (
                                <Image source={{ uri: selectedUser?.photoURL }} style={styles?.selectedUserImage} />
                            ) : (
                                <User size={32} color="#64748b" />
                            )}
                        </View>
                        <View style={styles?.selectedUserInfo}>
                            <Text style={styles?.selectedUserName}>{selectedUser?.displayName}</Text>
                            <Text style={styles?.selectedUserDist}>{selectedUser?.distDisplay} away</Text>
                        </View>
                        <TouchableOpacity
                            style={styles?.selectedUserNavInfo}
                            onPress={() => router.push(`/profile/${selectedUser?.uid}`)}
                        >
                            <ChevronRight size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Floating Nearby Button */}
            {!isListOpen && !selectedUser && nearbyUsers?.length > 0 && (
                <TouchableOpacity style={styles?.nearbyButton} onPress={() => setIsListOpen(true)}>
                    <View style={styles?.nearbyAvatarsRow}>
                        {nearbyUsers.slice(0, 3).map((u, i) => (
                            <View
                                key={u?.uid}
                                style={[styles?.nearbyAvatarSmall, { zIndex: 3 - i, marginLeft: i === 0 ? 0 : -10 }]}
                            >
                                {u?.photoURL ? (
                                    <Image source={{ uri: u?.photoURL }} style={{ width: "100%", height: "100%" }} />
                                ) : (
                                    <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "bold" }}>
                                        {u?.displayName?.[0]}
                                    </Text>
                                )}
                            </View>
                        ))}
                        {nearbyUsers?.length > 3 && (
                            <View style={[styles?.nearbyAvatarSmall, { zIndex: 0, marginLeft: -10, backgroundColor: "#334155" }]}>
                                <Text style={styles?.nearbyMoreText}>+{nearbyUsers?.length - 3}</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles?.nearbyCountTitle}>{nearbyUsers?.length} Nearby</Text>
                        <Text style={styles?.nearbySubtitle}>Tap to view list</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Bottom Drawer */}
            {isListOpen && (
                <View style={styles?.drawerOverlay}>
                    <TouchableOpacity style={styles?.drawerBackdrop} onPress={() => setIsListOpen(false)} />
                    <View style={styles?.drawerContent}>
                        <View style={styles?.drawerHeader}>
                            <Text style={styles?.drawerTitle}>People Nearby</Text>
                            <TouchableOpacity onPress={() => setIsListOpen(false)}>
                                <X size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles?.drawerScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                            {nearbyUsers.map((u) => (
                                <View key={u?.uid} style={styles?.drawerUserItem}>
                                    <View style={styles?.drawerUserRow}>
                                        <View style={styles?.drawerUserAvatar}>
                                            {u?.photoURL ? (
                                                <Image source={{ uri: u?.photoURL }} style={{ width: "100%", height: "100%" }} />
                                            ) : (
                                                <Text style={{ color: "#64748b", fontWeight: "bold" }}>{u?.displayName?.[0]}</Text>
                                            )}
                                        </View>
                                        <View style={styles?.drawerUserInfo}>
                                            <TouchableOpacity onPress={() => router.push(`/profile/${u?.uid}`)}>
                                                <Text style={styles?.drawerUserName}>{u?.displayName}</Text>
                                            </TouchableOpacity>
                                            <Text style={styles?.drawerUserDist}>{u?.lastLocation?.name || u?.distDisplay}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles?.drawerUserBio} numberOfLines={2}>{u?.bio || "No bio available."}</Text>
                                    <TouchableOpacity
                                        style={styles?.drawerProfileButton}
                                        onPress={() => router.push(`/profile/${u?.uid}`)}
                                    >
                                        <Text style={styles?.drawerProfileButtonText}>View Full Profile</Text>
                                        <ChevronRight size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
    );
}

/* ── Styles ── */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#020617" },
    locateButton: {
        position: "absolute", right: 16, bottom: 90,
        backgroundColor: "rgba(15,23,42,0.9)", padding: 12, borderRadius: 24,
        borderWidth: 1, borderColor: "#1e293b", elevation: 5,
    },
    refreshButton: {
        position: "absolute", right: 16, bottom: 154,
        backgroundColor: "rgba(15,23,42,0.9)", padding: 12, borderRadius: 24,
        borderWidth: 1, borderColor: "#1e293b", elevation: 5,
    },
    selectedUserCard: {
        position: "absolute", bottom: 90, left: 16, right: 16,
        backgroundColor: "#0f172a", borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: "#1e293b", elevation: 5,
    },
    selectedUserRow: { flexDirection: "row", alignItems: "center" },
    selectedUserAvatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: "#1e293b",
        overflow: "hidden", justifyContent: "center", alignItems: "center",
        borderWidth: 1, borderColor: "#334155",
    },
    selectedUserImage: { width: "100%", height: "100%" },
    selectedUserInfo: { flex: 1, marginLeft: 16 },
    selectedUserName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    selectedUserDist: { color: "#60a5fa", fontSize: 14, marginTop: 2 },
    selectedUserNavInfo: {
        width: 48, height: 48, backgroundColor: "#2563eb",
        borderRadius: 12, justifyContent: "center", alignItems: "center",
    },
    nearbyButton: {
        position: "absolute", bottom: 90, left: 16,
        backgroundColor: "rgba(15,23,42,0.95)", padding: 12, paddingRight: 16,
        borderRadius: 24, borderWidth: 1, borderColor: "#1e293b",
        flexDirection: "row", alignItems: "center",
    },
    nearbyAvatarsRow: { flexDirection: "row", alignItems: "center" },
    nearbyAvatarSmall: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: "#1e293b",
        borderWidth: 2, borderColor: "#0f172a", overflow: "hidden",
        justifyContent: "center", alignItems: "center",
    },
    nearbyMoreText: { color: "#94a3b8", fontSize: 10, fontWeight: "bold" },
    nearbyCountTitle: { color: "#fff", fontSize: 14, fontWeight: "bold" },
    nearbySubtitle: { color: "#60a5fa", fontSize: 10, fontWeight: "500" },
    drawerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, justifyContent: "flex-end" },
    drawerBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
    drawerContent: {
        backgroundColor: "#0f172a", borderTopLeftRadius: 24,
        borderTopRightRadius: 24, maxHeight: height * 0.8,
    },
    drawerHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        padding: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b",
    },
    drawerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
    drawerScroll: { backgroundColor: "#020617" },
    drawerUserItem: {
        backgroundColor: "#0f172a", padding: 16, borderRadius: 16,
        borderWidth: 1, borderColor: "#1e293b", marginBottom: 12,
    },
    drawerUserRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    drawerUserAvatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: "#1e293b",
        overflow: "hidden", justifyContent: "center", alignItems: "center",
    },
    drawerUserInfo: { flex: 1, marginLeft: 12 },
    drawerUserName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    drawerUserDist: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
    drawerUserBio: { color: "#94a3b8", fontSize: 14, lineHeight: 20 },
    drawerProfileButton: {
        marginTop: 12, backgroundColor: "#1e293b", paddingVertical: 10,
        borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center",
    },
    drawerProfileButtonText: { color: "#fff", fontSize: 12, fontWeight: "bold", marginRight: 4 },
});
