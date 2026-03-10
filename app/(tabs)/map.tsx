import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ScrollView } from "react-native";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';
import { LocateFixed, ChevronRight, Instagram, User, X, RefreshCw } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useUserLocation } from "../../components/LocationGuard";
import { calculateDistance } from "../../util/location";
import { POPULAR_INTERESTS, UserProfile } from "../../types";

const { width, height } = Dimensions.get("window");

type NearbyUser = UserProfile & {
    distDisplay: string;
    distMeters: number;
};

const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function MapScreen() {
    const { location: myLocation } = useUserLocation();
    const { user: currentUser } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
    const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
    const [isListOpen, setIsListOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            if (currentUser?.uid) {
                const [allUsers, profile] = await Promise.all([
                    api.profile.getAllWithLocation(currentUser.uid),
                    api.profile.get(currentUser.uid),
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

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    const handleRefresh = () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchData();
    };

    const nearbyUsers = useMemo(() => {
        if (!myLocation) return [];
        const maxDistanceMeters = (currentUserProfile?.discoveryRadius || 10) * 1000;

        return users
            .filter((u) => u.uid !== currentUser?.uid && u.lastLocation)
            .map((u) => {
                const distMeters = getDistanceMeters(myLocation.lat, myLocation.lng, u.lastLocation!.lat, u.lastLocation!.lng);
                const distDisplay = calculateDistance(myLocation.lat, myLocation.lng, u.lastLocation!.lat, u.lastLocation!.lng);
                return { ...u, distMeters, distDisplay };
            })
            .filter((u) => u.distMeters <= maxDistanceMeters)
            .sort((a, b) => a.distMeters - b.distMeters);
    }, [users, myLocation, currentUser, currentUserProfile]);

    const mapRef = React.useRef<MapView>(null);

    const handleLocateMe = () => {
        if (myLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: myLocation.lat,
                longitude: myLocation.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        }
    };

    if (!myLocation) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                    latitude: myLocation.lat,
                    longitude: myLocation.lng,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                customMapStyle={mapStyle} // Dark mode map
                onPress={() => setSelectedUser(null)}
                showsUserLocation={false}
                showsMyLocationButton={false}
            >
                <Circle
                    center={{ latitude: myLocation.lat, longitude: myLocation.lng }}
                    radius={(currentUserProfile?.discoveryRadius || 10) * 1000}
                    strokeColor="rgba(139, 92, 246, 0.5)"
                    fillColor="rgba(139, 92, 246, 0.1)"
                />

                <Marker
                    coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}
                    title="You"
                >
                    <View style={styles.myMarkerContainer}>
                        <View style={styles.myMarkerCore} />
                    </View>
                </Marker>

                {nearbyUsers.map((u) => (
                    <Marker
                        key={u.uid}
                        coordinate={{ latitude: u.lastLocation!.lat, longitude: u.lastLocation!.lng }}
                        onPress={() => {
                            setSelectedUser(u);
                            setIsListOpen(false);
                        }}
                    >
                        <View style={styles.userMarker}>
                            {u.photoURL ? (
                                <Image source={{ uri: u.photoURL }} style={styles.userMarkerImage} />
                            ) : (
                                <Text style={styles.userMarkerText}>{u.displayName?.[0]}</Text>
                            )}
                        </View>
                    </Marker>
                ))}
            </MapView>

            <TouchableOpacity style={styles.locateButton} onPress={handleLocateMe}>
                <LocateFixed size={24} color="#3b82f6" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
                <RefreshCw size={24} color="#3b82f6" style={refreshing ? { opacity: 0.5 } : {}} />
            </TouchableOpacity>

            {/* Selected User Popup */}
            {selectedUser && (
                <View style={styles.selectedUserCard}>
                    <View style={styles.selectedUserRow}>
                        <View style={styles.selectedUserAvatar}>
                            {selectedUser.photoURL ? (
                                <Image source={{ uri: selectedUser.photoURL }} style={styles.selectedUserImage} />
                            ) : (
                                <User size={32} color="#64748b" />
                            )}
                        </View>
                        <View style={styles.selectedUserInfo}>
                            <Text style={styles.selectedUserName}>{selectedUser.displayName}</Text>
                            <Text style={styles.selectedUserDist}>{selectedUser.distDisplay} away</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.selectedUserNavInfo}
                            onPress={() => router.push(`/profile/${selectedUser.uid}`)}
                        >
                            <ChevronRight size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Floating Nearby Button */}
            {!isListOpen && !selectedUser && nearbyUsers.length > 0 && (
                <TouchableOpacity style={styles.nearbyButton} onPress={() => setIsListOpen(true)}>
                    <View style={styles.nearbyAvatarsRow}>
                        {nearbyUsers.slice(0, 3).map((u, i) => (
                            <View key={u.uid} style={[styles.nearbyAvatarSmall, { zIndex: 3 - i, marginLeft: i === 0 ? 0 : -10 }]}>
                                {u.photoURL ? (
                                    <Image source={{ uri: u.photoURL }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}>{u.displayName?.[0]}</Text>
                                )}
                            </View>
                        ))}
                        {nearbyUsers.length > 3 && (
                            <View style={[styles.nearbyAvatarSmall, { zIndex: 0, marginLeft: -10, backgroundColor: '#334155' }]}>
                                <Text style={styles.nearbyMoreText}>+{nearbyUsers.length - 3}</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.nearbyCountTitle}>{nearbyUsers.length} Nearby</Text>
                        <Text style={styles.nearbySubtitle}>Tap to view list</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Bottom Drawer */}
            {isListOpen && (
                <View style={styles.drawerOverlay}>
                    <TouchableOpacity style={styles.drawerBackdrop} onPress={() => setIsListOpen(false)} />
                    <View style={styles.drawerContent}>
                        <View style={styles.drawerHeader}>
                            <Text style={styles.drawerTitle}>People Nearby</Text>
                            <TouchableOpacity onPress={() => setIsListOpen(false)}>
                                <X size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.drawerScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                            {nearbyUsers.map(u => (
                                <View key={u.uid} style={styles.drawerUserItem}>
                                    <View style={styles.drawerUserRow}>
                                        <View style={styles.drawerUserAvatar}>
                                            {u.photoURL ? (
                                                <Image source={{ uri: u.photoURL }} style={{ width: '100%', height: '100%' }} />
                                            ) : (
                                                <Text style={{ color: '#64748b', fontWeight: 'bold' }}>{u.displayName?.[0]}</Text>
                                            )}
                                        </View>
                                        <View style={styles.drawerUserInfo}>
                                            <TouchableOpacity onPress={() => router.push(`/profile/${u.uid}`)}>
                                                <Text style={styles.drawerUserName}>{u.displayName}</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.drawerUserDist}>{u.lastLocation?.name || u.distDisplay}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.drawerUserBio} numberOfLines={2}>{u.bio || "No bio available."}</Text>
                                    <TouchableOpacity
                                        style={styles.drawerProfileButton}
                                        onPress={() => router.push(`/profile/${u.uid}`)}
                                    >
                                        <Text style={styles.drawerProfileButtonText}>View Full Profile</Text>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    myMarkerContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(59, 130, 246, 0.3)', justifyContent: 'center', alignItems: 'center' },
    myMarkerCore: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#3b82f6', borderWidth: 2, borderColor: '#fff' },
    userMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#3b82f6', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    userMarkerImage: { width: '100%', height: '100%' },
    userMarkerText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 16 },
    locateButton: { position: 'absolute', right: 16, bottom: 90, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
    refreshButton: { position: 'absolute', right: 16, bottom: 154, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
    selectedUserCard: { position: 'absolute', bottom: 90, left: 16, right: 16, backgroundColor: '#0f172a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e293b', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 },
    selectedUserRow: { flexDirection: 'row', alignItems: 'center' },
    selectedUserAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e293b', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    selectedUserImage: { width: '100%', height: '100%' },
    selectedUserInfo: { flex: 1, marginLeft: 16 },
    selectedUserName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    selectedUserDist: { color: '#60a5fa', fontSize: 14, marginTop: 2 },
    selectedUserNavInfo: { width: 48, height: 48, backgroundColor: '#2563eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    nearbyButton: { position: 'absolute', bottom: 90, left: 16, backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 12, paddingRight: 16, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
    nearbyAvatarsRow: { flexDirection: 'row', alignItems: 'center' },
    nearbyAvatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#0f172a', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    nearbyMoreText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
    nearbyCountTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    nearbySubtitle: { color: '#60a5fa', fontSize: 10, fontWeight: '500' },
    drawerOverlay: { position: 'absolute', inset: 0, zIndex: 1000, justifyContent: 'flex-end' },
    drawerBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
    drawerContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.8 },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    drawerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    drawerScroll: { backgroundColor: '#020617' },
    drawerUserItem: { backgroundColor: '#0f172a', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
    drawerUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    drawerUserAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e293b', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    drawerUserInfo: { flex: 1, marginLeft: 12 },
    drawerUserName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    drawerUserDist: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    drawerUserBio: { color: '#94a3b8', fontSize: 14, lineHeight: 20 },
    drawerProfileButton: { marginTop: 12, backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    drawerProfileButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginRight: 4 }
});

const mapStyle = [
    {
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#1d2c4d"
            }
        ]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#8ec3b9"
            }
        ]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#1a3646"
            }
        ]
    },
    {
        "featureType": "administrative.country",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#4b6878"
            }
        ]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#64779e"
            }
        ]
    },
    {
        "featureType": "administrative.province",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#4b6878"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#334e87"
            }
        ]
    },
    {
        "featureType": "landscape.natural",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#023e58"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#283d6a"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#6f9ba5"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#1d2c4d"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#023e58"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#3C7680"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#304a7d"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#98a5be"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#1d2c4d"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#2c6675"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#255763"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#b0d5ce"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#023e58"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#98a5be"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#1d2c4d"
            }
        ]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#283d6a"
            }
        ]
    },
    {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#3a4762"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#0e1626"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#4e6d70"
            }
        ]
    }
];
