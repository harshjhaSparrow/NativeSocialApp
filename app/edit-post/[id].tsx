import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Image as ImageIcon, X, AlertCircle } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

export default function EditPostScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [content, setContent] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPost = async () => {
            if (!id || !user) return;
            try {
                const post = await api.posts.getPost(id);
                if (post) {
                    if (post.uid !== user.uid) {
                        router.back();
                        return;
                    }
                    setContent(post.content);
                    setImage(post.imageURL || null);
                } else {
                    setError("Post not found");
                }
            } catch (err) {
                setError("Failed to fetch post");
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [id, user]);

    const handleImageUpload = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            alert("You've refused to allow this app to access your photos!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0]?.base64) {
            if (result.assets[0].fileSize && result.assets[0].fileSize > 20 * 1024 * 1024) {
                setError("Image is too large (Max 20MB)");
                return;
            }
            setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && !image) return;
        if (!user || !id) return;

        setSaving(true);
        setError(null);

        try {
            await api.posts.updatePost(id, user.uid, content, image || undefined);
            router.back();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to update post.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
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
                <Text style={styles.headerTitle}>Edit</Text>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={saving || (!content.trim() && !image)}
                    style={[styles.headerBtn, { alignItems: 'flex-end', opacity: (saving || (!content.trim() && !image)) ? 0.5 : 1 }]}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                        <Text style={styles.headerAction}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Text Area */}
                <TextInput
                    style={styles.textArea}
                    placeholder="What's on your mind?"
                    placeholderTextColor="#64748b"
                    value={content}
                    onChangeText={(txt) => { setContent(txt); setError(null); }}
                    multiline
                    autoFocus
                />

                {/* Image Preview */}
                {image && (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: image }} style={styles.imagePreview} />
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
                <TouchableOpacity style={styles.actionBtn} onPress={handleImageUpload}>
                    <ImageIcon size={20} color="#3b82f6" />
                    <Text style={styles.actionBtnText}>Photo</Text>
                </TouchableOpacity>
            </View>
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
    textArea: { color: '#fff', fontSize: 18, minHeight: 160, textAlignVertical: 'top' },
    imagePreviewContainer: { marginTop: 24, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b', position: 'relative' },
    imagePreview: { width: '100%', aspectRatio: 16 / 9 },
    imageRemoveBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 16 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 12, marginTop: 16 },
    errorText: { color: '#f87171', fontSize: 14, flex: 1 },
    footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#020617', borderTopWidth: 1, borderTopColor: '#1e293b', paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    actionBtnText: { color: '#3b82f6', fontWeight: 'bold' }
});
