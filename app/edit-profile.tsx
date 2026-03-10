import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Calendar, Camera, ChevronLeft, User as UserIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { InterestTag, POPULAR_INTERESTS, UserProfile } from '../types';

export default function EditProfileScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [instagram, setInstagram] = useState('');
    const [bio, setBio] = useState('');
    const [dob, setDob] = useState('');
    const [jobRole, setJobRole] = useState('');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateObj, setDateObj] = useState(new Date());

    useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                try {
                    const profile = await api.profile.get(user.uid);
                    if (profile) {
                        setDisplayName(profile.displayName || '');
                        setPhotoURL(profile.photoURL || '');
                        setInstagram(profile.instagramHandle || '');
                        setBio(profile.bio || '');
                        if (profile.dob) {
                            setDob(profile.dob);
                            setDateObj(new Date(profile.dob));
                        }
                        setJobRole(profile.jobRole || '');
                        setSelectedInterests(profile.interests || []);
                    }
                } catch (err) {
                    console.error(err);
                    setError("Failed to load profile.");
                } finally {
                    setInitialLoading(false);
                }
            }
        };
        fetchProfile();
    }, [user]);

    const handleImageUpload = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            alert("You've refused to allow this app to access your photos!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets[0]?.base64) {
            setPhotoURL(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const toggleInterest = (id: string) => {
        setSelectedInterests(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDateObj(selectedDate);
            setDob(selectedDate.toISOString().split('T')[0]);
        }
    };

    const calculateAge = (dateString: string) => {
        const birthDate = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleSave = async () => {
        if (!user) return;

        if (!displayName.trim()) {
            setError("Display Name is required.");
            return;
        }

        if (dob) {
            const age = calculateAge(dob);
            if (age < 18) {
                setError("You must be at least 18 years old.");
                return;
            }
        }

        if (instagram.trim()) {
            const instagramRegex = /^[a-zA-Z0-9._]+$/;
            if (!instagramRegex.test(instagram)) {
                setError("Invalid Instagram handle.");
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const profileData: Partial<UserProfile> = {
                uid: user.uid,
                email: user.email,
                displayName,
                photoURL,
                instagramHandle: instagram,
                bio: bio.trim(),
                dob,
                jobRole: jobRole.trim(),
                interests: selectedInterests,
            };

            await api.profile.createOrUpdate(user.uid, profileData);
            router.back();
        } catch (err) {
            console.error(err);
            setError("Failed to save profile. Check connection.");
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <ChevronLeft size={28} color="#94a3b8" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={loading}
                    style={[styles.headerBtn, { alignItems: 'flex-end', opacity: loading ? 0.5 : 1 }]}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                        <Text style={styles.headerAction}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Photo */}
                <View style={styles.photoSection}>
                    <TouchableOpacity onPress={handleImageUpload} style={styles.photoContainer}>
                        <View style={styles.avatar}>
                            {photoURL ? (
                                <Image source={{ uri: photoURL }} style={styles.avatarImage} />
                            ) : (
                                <UserIcon size={64} color="#64748b" />
                            )}
                        </View>
                        <View style={styles.cameraIconBadge}>
                            <Camera size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.photoHint}>Tap icon to change photo</Text>
                </View>

                {/* Form Fields */}
                <View style={styles.formSection}>
                    <Input
                        placeholder="Display Name"
                        value={displayName}
                        onChangeText={setDisplayName}
                    />
                    <Input
                        placeholder="Job Role / Profession"
                        value={jobRole}
                        onChangeText={setJobRole}
                    />
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ width: '100%' }}>
                        <View pointerEvents="none">
                            <Input
                                placeholder="Date of Birth (YYYY-MM-DD)"
                                value={dob}
                                icon={<Calendar size={20} color="#64748b" />}
                                onChangeText={() => { }}
                                editable={false}
                            />
                        </View>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={dateObj}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleDateChange}
                            maximumDate={new Date()} // Can't be born in the future
                        />
                    )}

                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>BIO</Text>
                        <TextInput
                            style={styles.bioInput}
                            placeholder="Tell us about yourself..."
                            placeholderTextColor="#64748b"
                            value={bio}
                            onChangeText={setBio}
                            multiline
                        />
                    </View>

                    <Input
                        placeholder="Instagram (@username)"
                        value={instagram}
                        onChangeText={(t) => setInstagram(t.replace('@', ''))}
                        autoCapitalize="none"
                    />
                </View>

                {/* Interests */}
                <View style={styles.interestsSection}>
                    <Text style={styles.fieldLabel}>EDIT INTERESTS</Text>
                    <View style={styles.tagsContainer}>
                        {POPULAR_INTERESTS.map((interest: InterestTag) => {
                            const isSelected = selectedInterests.includes(interest.id);
                            return (
                                <TouchableOpacity
                                    key={interest.id}
                                    onPress={() => toggleInterest(interest.id)}
                                    style={[styles.tag, isSelected ? styles.tagSelected : null]}
                                >
                                    <Text style={[styles.tagText, isSelected ? styles.tagTextSelected : null]}>
                                        {interest.emoji} {interest.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    headerBtn: { width: 80, justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerAction: { color: '#3b82f6', fontSize: 16, fontWeight: 'bold' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    photoSection: { alignItems: 'center', marginVertical: 24 },
    photoContainer: { position: 'relative' },
    avatar: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#1e293b', borderWidth: 4, borderColor: '#0f172a', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    cameraIconBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#1e293b', padding: 12, borderRadius: 24, borderWidth: 1, borderColor: '#475569' },
    photoHint: { color: '#64748b', fontSize: 14, marginTop: 16 },
    formSection: { gap: 16 },
    fieldGroup: { gap: 8 },
    fieldLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    bioInput: { backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#1e293b', borderRadius: 16, color: '#fff', fontSize: 16, padding: 16, minHeight: 120, textAlignVertical: 'top' },
    interestsSection: { marginTop: 24, gap: 12 },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tag: { backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
    tagSelected: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
    tagText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14 },
    tagTextSelected: { color: '#60a5fa' },
    errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', padding: 16, borderRadius: 16, marginTop: 24, alignItems: 'center' },
    errorText: { color: '#f87171', fontWeight: 'bold' }
});
