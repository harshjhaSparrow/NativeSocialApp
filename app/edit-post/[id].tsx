import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Post } from '../../types';

export default function EditPostScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();

    const [post, setPost] = useState<Post | null>(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            if (!id) return;
            try {
                const data = await api.posts.getPost(id as string);
                if (data) {
                    setPost(data);
                    setContent(data.content || '');
                }
            } catch (err) {
                console.error(err);
                Alert.alert("Error", "Could not load post for editing.");
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [id]);

    const handleSave = async () => {
        if (!content.trim()) return;
        if (!user || !post?._id) return;

        setSaving(true);
        try {
            await api.posts.updatePost(post._id, user.uid, content, post.imageURL);
            router.back();
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to update your post.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    if (!post || post.uid !== user?.uid) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={styles.errorText}>Post not found or you are not authorized to edit it.</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <ArrowLeft size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Post</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving || !content.trim()} style={[styles.headerBtn, (!content.trim() || saving) && { opacity: 0.5 }]}>
                    {saving ? <ActivityIndicator size="small" color="#3b82f6" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {post.imageURL && (
                    <Image source={{ uri: post.imageURL }} style={styles.imagePreview} resizeMode="cover" />
                )}

                <TextInput
                    style={styles.textInput}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Update your post..."
                    placeholderTextColor="#64748b"
                    multiline
                    autoFocus
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    headerBtn: { padding: 8 },
    headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
    saveBtnText: { color: '#3b82f6', fontSize: 16, fontWeight: 'bold' },
    content: { padding: 16, flex: 1 },
    imagePreview: { width: '100%', aspectRatio: 4 / 5, borderRadius: 16, marginBottom: 16, backgroundColor: '#1e293b' },
    textInput: { color: '#f8fafc', fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
    errorText: { color: '#ef4444', fontSize: 16, textAlign: 'center', marginBottom: 16 },
    backBtn: { backgroundColor: '#1e293b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    backBtnText: { color: '#f8fafc', fontSize: 14 }
});
