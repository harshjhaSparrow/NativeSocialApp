import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from "expo-router";
import { AlertCircle, Calendar, ChevronDown, ChevronLeft, Clock, DollarSign, Image as ImageIcon, Link as LinkIcon, MapPin, PartyPopper, Type, Users, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import DropdownPicker from "../components/ui/DropdownPicker";
import { useUserLocation } from "../components/LocationGuard";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { FEE_TYPES, MEETUP_ACTIVITIES } from "../types";


export default function CreatePostScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { location: gpsLocation } = useUserLocation();
    const [postType, setPostType] = useState<"regular" | "meetup">("regular");
    const [content, setContent] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [locationName, setLocationName] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Meetup Specific State
    const [meetupTitle, setMeetupTitle] = useState("");
    const [activity, setActivity] = useState(MEETUP_ACTIVITIES[0]);
    const [feeType, setFeeType] = useState(FEE_TYPES[0]);
    const [feeAmount, setFeeAmount] = useState("");
    // Use strings for simplicity in mobile to avoid dealing with complex DatePickers if not strictly necessary right now
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [maxGuests, setMaxGuests] = useState("");
    const [meetupUrl, setMeetupUrl] = useState("");

    // Date/Time Picker States
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateObj, setDateObj] = useState(new Date());

    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [startTimeObj, setStartTimeObj] = useState(new Date());

    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [endTimeObj, setEndTimeObj] = useState(new Date());
    useEffect(() => {
        (async () => {
            if (gpsLocation) {
                try {
                    const reverseGeocode = await Location.reverseGeocodeAsync({
                        latitude: gpsLocation.lat,
                        longitude: gpsLocation.lng,
                    });
                    if (reverseGeocode.length > 0) {
                        const addr = reverseGeocode[0];
                        const city = addr.city || addr.subregion || addr.region || "Unknown Location";
                        const state = addr.region || "";
                        setLocationName(state ? `${city}, ${state}` : city);
                    }
                } catch (err) {
                    setLocationName("Nearby");
                }
            }
        })();
    }, [gpsLocation]);

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
            setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;

        if (postType === "regular" && !content.trim() && !image) return;
        if (postType === "meetup") {
            if (!meetupTitle.trim() || !date || !startTime || !endTime) {
                setError("Please fill in all required meetup fields (Title, Date, Time).");
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            let profile = null;
            try {
                profile = await api.profile.get(user.uid);
            } catch (e) {
                console.warn("Could not fetch profile", e);
            }

            const payload: any = {
                uid: user.uid,
                authorName: profile?.displayName || user.email?.split("@")[0] || "User",
                authorPhoto: profile?.photoURL || "",
                content: postType === "regular" ? content : content || meetupTitle,
                imageURL: image || undefined,
                location: gpsLocation ? { ...gpsLocation, name: locationName } : undefined,
                type: postType,
            };

            if (postType === "meetup") {
                payload.meetupDetails = {
                    title: meetupTitle,
                    activity,
                    feeType,
                    feeAmount: feeType === 'Attendance fee applicable' ? feeAmount : undefined,
                    date,
                    startTime,
                    endTime,
                    maxGuests: maxGuests ? parseInt(maxGuests) : undefined,
                    meetingUrl: meetupUrl || undefined,
                };
                payload.content = content || "Join my meetup!";
            }

            await api.posts.create(payload);
            router.replace("/(tabs)");
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to post. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = () => {
        if (loading) return false;
        if (postType === "regular") return (content.trim() || image) ? true : false;
        if (postType === "meetup") return (meetupTitle.trim() && date && startTime && endTime) ? true : false;
        return false;
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDateObj(selectedDate);
            setDate(selectedDate.toISOString().split('T')[0]);
        }
    };

    const handleStartTimeChange = (event: any, selectedTime?: Date) => {
        setShowStartTimePicker(false);
        if (selectedTime) {
            setStartTimeObj(selectedTime);
            const hh = String(selectedTime.getHours()).padStart(2, '0');
            const mm = String(selectedTime.getMinutes()).padStart(2, '0');
            setStartTime(`${hh}:${mm}`);
        }
    };

    const handleEndTimeChange = (event: any, selectedTime?: Date) => {
        setShowEndTimePicker(false);
        if (selectedTime) {
            setEndTimeObj(selectedTime);
            const hh = String(selectedTime.getHours()).padStart(2, '0');
            const mm = String(selectedTime.getMinutes()).padStart(2, '0');
            setEndTime(`${hh}:${mm}`);
        }
    };

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
                <Text style={styles.headerTitle}>Create</Text>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!isFormValid() || loading}
                    style={[styles.headerBtn, { alignItems: 'flex-end', opacity: (!isFormValid() || loading) ? 0.5 : 1 }]}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                        <Text style={styles.headerAction}>{postType === "meetup" ? "Create" : "Post"}</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Toggle Switch */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabBtn, postType === 'regular' && styles.tabBtnActive]}
                        onPress={() => setPostType('regular')}
                    >
                        <Type size={16} color={postType === 'regular' ? '#fff' : '#64748b'} />
                        <Text style={[styles.tabText, postType === 'regular' && styles.tabTextActive]}>Post</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, postType === 'meetup' && styles.tabBtnMeetupActive]}
                        onPress={() => setPostType('meetup')}
                    >
                        <PartyPopper size={16} color={postType === 'meetup' ? '#fff' : '#64748b'} />
                        <Text style={[styles.tabText, postType === 'meetup' && styles.tabTextActive]}>Meet Up</Text>
                    </TouchableOpacity>
                </View>

                {postType === "regular" ? (
                    <TextInput
                        style={styles.textArea}
                        placeholder="What's on your mind?"
                        placeholderTextColor="#64748b"
                        value={content}
                        onChangeText={(txt) => { setContent(txt); setError(null); }}
                        multiline
                        autoFocus
                    />
                ) : (
                    <View style={styles.meetupForm}>
                        <TextInput
                            style={styles.meetupTitleInput}
                            placeholder="Event Title (e.g. Sunday Morning Run)"
                            placeholderTextColor="#64748b"
                            value={meetupTitle}
                            onChangeText={setMeetupTitle}
                        />

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>ACTIVITY</Text>
                            <DropdownPicker
                                value={activity}
                                options={MEETUP_ACTIVITIES}
                                onSelect={setActivity}
                                placeholder="Select Activity"
                            />
                        </View>


                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>DATE (YYYY-MM-DD)</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.inputWithIcon, { paddingVertical: 14 }]}>
                                <Calendar size={18} color="#64748b" />
                                <Text style={[styles.inlineInput, { color: date ? '#fff' : '#64748b' }]}>{date || 'Select Date'}</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={dateObj}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleDateChange}
                                    minimumDate={new Date()} // Can't schedule meetups in the past
                                />
                            )}
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>TIME (HH:MM)</Text>
                            <View style={[styles.inputWithIcon, { paddingVertical: 14 }]}>
                                <Clock size={18} color="#64748b" />

                                <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={{ flex: 1 }}>
                                    <Text style={[styles.inlineInput, { color: startTime ? '#fff' : '#64748b' }]}>{startTime || 'Start'}</Text>
                                </TouchableOpacity>
                                {showStartTimePicker && (
                                    <DateTimePicker
                                        value={startTimeObj}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleStartTimeChange}
                                    />
                                )}

                                <Text style={{ color: '#64748b', marginHorizontal: 8 }}>-</Text>

                                <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={{ flex: 1 }}>
                                    <Text style={[styles.inlineInput, { color: endTime ? '#fff' : '#64748b' }]}>{endTime || 'End'}</Text>
                                </TouchableOpacity>
                                {showEndTimePicker && (
                                    <DateTimePicker
                                        value={endTimeObj}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleEndTimeChange}
                                    />
                                )}
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.fieldLabel}>MAX GUESTS</Text>
                                <View style={styles.inputWithIcon}>
                                    <Users size={18} color="#64748b" />
                                    <TextInput style={styles.inlineInput} placeholder="Unlimited" placeholderTextColor="#64748b" value={maxGuests} onChangeText={setMaxGuests} keyboardType="numeric" />
                                </View>
                            </View>
                            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.fieldLabel}>FEE TYPE</Text>
                                <DropdownPicker
                                    value={feeType}
                                    options={FEE_TYPES}
                                    onSelect={setFeeType}
                                    placeholder="Select Fee Type"
                                />
                            </View>
                        </View>

                        {feeType === 'Attendance fee applicable' && (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>FEE AMOUNT</Text>
                                <View style={styles.inputWithIcon}>
                                    <DollarSign size={18} color="#64748b" />
                                    <TextInput style={styles.inlineInput} placeholder="Amount" placeholderTextColor="#64748b" value={feeAmount} onChangeText={setFeeAmount} keyboardType="numeric" />
                                </View>
                            </View>
                        )}

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>DETAILS</Text>
                            <TextInput
                                style={styles.detailsArea}
                                placeholder="Describe the plan, meeting point details, etc..."
                                placeholderTextColor="#64748b"
                                value={content}
                                onChangeText={setContent}
                                multiline
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>LINK (OPTIONAL)</Text>
                            <View style={styles.inputWithIcon}>
                                <LinkIcon size={18} color="#64748b" />
                                <TextInput style={styles.inlineInput} placeholder="https://" placeholderTextColor="#64748b" value={meetupUrl} onChangeText={setMeetupUrl} autoCapitalize="none" />
                            </View>
                        </View>

                    </View>
                )}

                {/* Image Preview */}
                {image && (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: image }} style={styles.imagePreview} resizeMode="cover" />
                        <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setImage(null)}>
                            <X size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Error */}
                {error && (
                    <View style={styles.errorBox}>
                        <AlertCircle size={20} color="#f87171" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Footer Tools */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.addPhotoBtn} onPress={handleImageUpload}>
                    <ImageIcon size={20} color="#3b82f6" />
                    <Text style={styles.addPhotoText}>{image ? "Change Photo" : "Add Photo"}</Text>
                </TouchableOpacity>

                {locationName && (
                    <View style={styles.locationBadge}>
                        <MapPin size={12} color="#94a3b8" />
                        <Text style={styles.locationBadgeText}>{locationName}</Text>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    headerBtn: { width: 80, justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerAction: { color: '#3b82f6', fontSize: 16, fontWeight: 'bold' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    tabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 24 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#1e293b' },
    tabBtnMeetupActive: { backgroundColor: '#2563eb' },
    tabText: { color: '#64748b', fontWeight: 'bold' },
    tabTextActive: { color: '#fff' },
    textArea: { color: '#fff', fontSize: 18, minHeight: 160, textAlignVertical: 'top' },
    meetupForm: { gap: 16 },
    meetupTitleInput: { color: '#fff', fontSize: 18, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingBottom: 12, marginBottom: 8 },
    fieldGroup: { gap: 8 },
    fieldLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginLeft: 4 },
    pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#1e293b', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
    pickerText: { color: '#fff', fontSize: 16 },
    row: { flexDirection: 'row', alignItems: 'center' },
    inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#1e293b', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 },
    inlineInput: { color: '#fff', fontSize: 14, flex: 1, marginLeft: 8 },
    detailsArea: { backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#1e293b', borderRadius: 16, color: '#fff', fontSize: 16, padding: 16, minHeight: 120, textAlignVertical: 'top' },
    imagePreviewContainer: { marginTop: 24, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b' },
    imagePreview: { width: '100%', aspectRatio: 4 / 5, backgroundColor: '#1e293b' },
    imageRemoveBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 16 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 12, marginTop: 16 },
    errorText: { color: '#f87171', fontSize: 14, flex: 1 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#020617', borderTopWidth: 1, borderTopColor: '#1e293b', paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
    addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    addPhotoText: { color: '#3b82f6', fontWeight: 'bold' },
    locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
    locationBadgeText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' }
});
