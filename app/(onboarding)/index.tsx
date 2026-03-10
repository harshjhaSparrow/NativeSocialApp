import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { Camera, Instagram, Sparkles, ChevronLeft, User as UserIcon, Calendar, Shield, CheckCircle, Briefcase } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { UserProfile, POPULAR_INTERESTS, InterestTag } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const STEPS = ['Legal', 'Basic Info', 'Socials', 'Interests'];

export default function Onboarding() {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Legal Step State
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [agreedLocation, setAgreedLocation] = useState(false);
    const [agreedAge, setAgreedAge] = useState(false);

    // Profile Data State
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [dob, setDob] = useState('');
    const [jobRole, setJobRole] = useState('');
    const [instagram, setInstagram] = useState('');
    const [bio, setBio] = useState('');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    useEffect(() => {
        if (user?.email && !displayName) {
            setDisplayName(user.email.split('@')[0]);
        }
    }, [user]);

    const handleImageUpload = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setPhotoURL(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const toggleInterest = (id: string) => {
        setSelectedInterests(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleNext = () => {
        setError(null);

        // Step 0: Legal & Privacy
        if (currentStep === 0) {
            if (!agreedTerms || !agreedLocation || !agreedAge) {
                setError("You must agree to all policies to continue.");
                return;
            }
        }

        // Step 1: Basic Info
        if (currentStep === 1) {
            if (!displayName.trim()) {
                setError("Please enter your name.");
                return;
            }
            if (!dob) {
                setError("Date of birth is required. Format: YYYY-MM-DD");
                return;
            }
        }

        // Step 2: Socials
        if (currentStep === 2 && instagram.trim()) {
            const instagramRegex = /^[a-zA-Z0-9._]+$/;
            if (!instagramRegex.test(instagram)) {
                setError("Invalid Instagram handle.");
                return;
            }
        }

        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        setError(null);
        setCurrentStep(prev => prev - 1);
    };

    const handleFinish = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const profileData: Partial<UserProfile> = {
                uid: user.uid,
                email: user.email,
                displayName,
                photoURL,
                dob,
                jobRole: jobRole.trim(),
                instagramHandle: instagram,
                bio: bio.trim(),
                interests: selectedInterests,
                createdAt: Date.now(),
            };

            await api.profile.createOrUpdate(user.uid, profileData);
            // Wait for auth context to re-trigger route push naturally by changing `hasProfile`
        } catch (err) {
            console.error(err);
            setError("Failed to save profile. Check connection.");
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0: // Legal
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.headerIconBox}>
                            <Shield size={40} color="#3b82f6" />
                        </View>
                        <Text style={styles.title}>Welcome to Orbyt</Text>
                        <Text style={styles.subtitle}>Please review and accept our community policies to continue.</Text>

                        <View style={styles.legalBox}>
                            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreedTerms(!agreedTerms)} activeOpacity={0.8}>
                                <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                                    {agreedTerms && <CheckCircle size={16} color="#fff" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.checkboxTitle}>Terms & Privacy</Text>
                                    <Text style={styles.checkboxDesc}>I agree to the Terms of Service and Privacy Policy.</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreedLocation(!agreedLocation)} activeOpacity={0.8}>
                                <View style={[styles.checkbox, agreedLocation && styles.checkboxChecked]}>
                                    {agreedLocation && <CheckCircle size={16} color="#fff" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.checkboxTitle}>Location Access</Text>
                                    <Text style={styles.checkboxDesc}>I consent to sharing my location to find people nearby.</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreedAge(!agreedAge)} activeOpacity={0.8}>
                                <View style={[styles.checkbox, agreedAge && styles.checkboxChecked]}>
                                    {agreedAge && <CheckCircle size={16} color="#fff" />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.checkboxTitle}>Age Confirmation</Text>
                                    <Text style={styles.checkboxDesc}>I confirm that I am at least 18 years old.</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            case 1: // Basic Info
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.avatarPickerContainer}>
                            <TouchableOpacity onPress={handleImageUpload} style={styles.avatarPicker}>
                                {photoURL ? (
                                    <Image source={{ uri: photoURL }} style={styles.avatarImage} />
                                ) : (
                                    <UserIcon size={64} color="#64748b" />
                                )}
                                <View style={styles.cameraIconBadge}>
                                    <Camera size={20} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.avatarPickerTitle}>Profile Photo</Text>
                            <Text style={styles.avatarPickerDesc}>Make a great first impression</Text>
                        </View>

                        <Input
                            label="Display Name"
                            placeholder="e.g. Alex Rivera"
                            value={displayName}
                            onChangeText={setDisplayName}
                        />
                        <Input
                            label="Job Role / Profession"
                            placeholder="e.g. Designer, Engineer"
                            icon={<Briefcase size={20} color="#64748b" />}
                            value={jobRole}
                            onChangeText={setJobRole}
                        />
                        <Input
                            label="Date of Birth (YYYY-MM-DD)"
                            placeholder="YYYY-MM-DD"
                            icon={<Calendar size={20} color="#64748b" />}
                            value={dob}
                            onChangeText={setDob}
                        />
                    </View>
                );

            case 2: // Socials
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.headerIconBoxSocial}>
                            <Instagram size={40} color="#fff" />
                        </View>
                        <Text style={styles.title}>Instagram</Text>
                        <Text style={styles.subtitle}>Let others find you on socials</Text>

                        <Input
                            label="Username"
                            placeholder="username"
                            icon={<Text style={{ color: '#64748b', fontWeight: 'bold' }}>@</Text>}
                            value={instagram}
                            onChangeText={setInstagram}
                            autoCapitalize="none"
                        />
                    </View>
                );

            case 3: // Interests
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Your Vibe</Text>
                        <Text style={styles.subtitle}>Select at least 3 interests</Text>

                        <View style={styles.interestsGrid}>
                            {POPULAR_INTERESTS.map((interest: InterestTag) => {
                                const isSelected = selectedInterests.includes(interest.id);
                                return (
                                    <TouchableOpacity
                                        key={interest.id}
                                        onPress={() => toggleInterest(interest.id)}
                                        style={[styles.interestButton, isSelected && styles.interestButtonSelected]}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.interestEmoji, isSelected && styles.interestEmojiSelected]}>{interest.emoji}</Text>
                                        <Text style={[styles.interestText, isSelected && styles.interestTextSelected]}>{interest.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                {currentStep > 0 ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ChevronLeft size={28} color="#94a3b8" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backButtonPlaceholder} />
                )}
                <Text style={styles.topBarText}>Step {currentStep + 1} of {STEPS.length}</Text>
                <View style={styles.backButtonPlaceholder} />
            </View>

            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex1}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {renderStep()}

                    {error && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                {currentStep < STEPS.length - 1 ? (
                    <Button onPress={handleNext} fullWidth>
                        {currentStep === 0 ? 'Accept & Continue' : 'Continue'}
                    </Button>
                ) : (
                    <Button
                        onPress={handleFinish}
                        fullWidth
                        isLoading={loading}
                        disabled={selectedInterests.length < 3}
                    >
                        Complete Profile
                    </Button>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    flex1: { flex: 1 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, backgroundColor: '#0f172a' },
    backButton: { padding: 8, marginLeft: -8 },
    backButtonPlaceholder: { width: 44, height: 44 },
    topBarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    progressBarBg: { backgroundColor: '#1e293b', height: 6 },
    progressBarFill: { backgroundColor: '#3b82f6', height: '100%' },
    scrollContent: { padding: 24, paddingBottom: 100 },
    stepContainer: { flex: 1 },
    headerIconBox: { width: 80, height: 80, backgroundColor: '#0f172a', borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24, transform: [{ rotate: '-3deg' as any }], borderWidth: 1, borderColor: '#1e293b' },
    headerIconBoxSocial: { width: 80, height: 80, backgroundColor: '#ec4899', borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24, transform: [{ rotate: '-3deg' as any }] },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
    legalBox: { backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1e293b' },
    checkboxRow: { flexDirection: 'row', marginBottom: 24 },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#475569', marginRight: 16, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    checkboxChecked: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    checkboxTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
    checkboxDesc: { color: '#64748b', fontSize: 14, marginTop: 4, lineHeight: 20 },
    avatarPickerContainer: { alignItems: 'center', marginBottom: 32 },
    avatarPicker: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1e293b', borderWidth: 4, borderColor: '#0f172a', justifyContent: 'center', alignItems: 'center', position: 'relative' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 60 },
    cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1e293b', padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
    avatarPickerTitle: { color: '#fff', fontWeight: '600', fontSize: 16, marginTop: 16 },
    avatarPickerDesc: { color: '#64748b', fontSize: 14, marginTop: 4 },
    interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    interestButton: { width: '48%', backgroundColor: '#0f172a', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#1e293b', flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    interestButtonSelected: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
    interestEmoji: { fontSize: 24, marginRight: 12 },
    interestEmojiSelected: {},
    interestText: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold' },
    interestTextSelected: { color: '#60a5fa' },
    errorBox: { marginTop: 24, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
    errorText: { color: '#f87171', textAlign: 'center', fontSize: 14, fontWeight: '500' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#0f172a', backgroundColor: '#020617' }
});
