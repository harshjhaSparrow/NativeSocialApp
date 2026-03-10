import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import * as LocationExpo from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Location } from '../types';

interface LocationContextType {
    location: Location | null;
}

export const LocationContext = createContext<LocationContextType>({ location: null });
export const useUserLocation = () => useContext(LocationContext);

interface LocationGuardProps {
    children: React.ReactNode;
}

const LocationGuard: React.FC<LocationGuardProps> = ({ children }) => {
    const { user } = useAuth();
    const [hasPermission, setHasPermission] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

    const requestAndSaveLocation = async () => {
        setLoading(true);
        try {
            const { status } = await LocationExpo.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setHasPermission(false);
                setLoading(false);
                return;
            }

            const location = await LocationExpo.getCurrentPositionAsync({});
            const loc: Location = {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            };
            setCurrentLocation(loc);
            setHasPermission(true);

            if (user) {
                try {
                    await api.profile.createOrUpdate(user.uid, { lastLocation: loc });
                } catch (e) {
                    console.error("Failed to sync location array", e);
                }
            }
        } catch (e) {
            console.error(e);
            setHasPermission(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const checkPermissions = async () => {
            const { status } = await LocationExpo.getForegroundPermissionsAsync();
            if (status === 'granted') {
                requestAndSaveLocation();
            } else {
                setLoading(false);
            }
        };
        checkPermissions();
    }, [user]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Checking permissions...</Text>
            </View>
        );
    }

    if (!hasPermission) {
        return (
            <View style={styles.center}>
                <MapPin size={48} color="#3b82f6" />
                <Text style={styles.title}>Enable Location</Text>
                <Text style={styles.subtitle}>
                    Orbyt collects your location data to enable finding nearby people, local meetups, and displaying distance to others.
                </Text>
                <TouchableOpacity style={styles.button} onPress={requestAndSaveLocation}>
                    <Text style={styles.buttonText}>Allow Location Access</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <LocationContext.Provider value={{ location: currentLocation }}>
            {children}
        </LocationContext.Provider>
    );
};

const styles = StyleSheet.create({
    center: {
        flex: 1,
        backgroundColor: '#020617', // slate-950
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        color: '#64748b', // slate-500
        marginTop: 16,
        fontSize: 16,
    },
    title: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
    },
    subtitle: {
        color: '#94a3b8', // slate-400
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    button: {
        backgroundColor: '#3b82f6', // primary-500
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    }
});

export default LocationGuard;
