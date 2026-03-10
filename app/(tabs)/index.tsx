import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Bell, Settings } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { api } from "../../services/api";
import { useUserLocation } from "../../components/LocationGuard";
import { Post, UserProfile } from "../../types";
import PostItem from "../../components/PostItem";
import { calculateDistance } from "../../util/location";

// Simplified distance in meters
const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function Feed() {
  const { user } = useAuth();
  const router = useRouter();
  const { location: myLocation } = useUserLocation();
  const { unreadCount: notifUnreadCount } = useNotifications();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchPosts = async () => {
    if (!user) return;
    try {
      const [allPosts, profile] = await Promise.all([
        api.posts.getAll(user.uid),
        api.profile.get(user.uid),
      ]);
      setUserProfile(profile);

      let filteredPosts = allPosts;
      if (myLocation && profile && profile.discoveryRadius) {
        const maxDistMeters = profile.discoveryRadius * 1000;
        filteredPosts = allPosts.filter((p: any) => {
          if (p.uid === user.uid) return true;
          if (p.location) {
            const dist = getDistanceMeters(myLocation.lat, myLocation.lng, p.location.lat, p.location.lng);
            return dist <= maxDistMeters;
          }
          return true;
        });
      }
      setPosts(filteredPosts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user, myLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [user, myLocation]);

  const handleLike = async (post: Post) => {
    if (!user || !post._id) return;
    const isLiked = post.likedBy?.includes(user.uid);
    const newLikes = isLiked ? post.likes - 1 : post.likes + 1;
    const newLikedBy = isLiked
      ? post.likedBy?.filter((id) => id !== user.uid) || []
      : [...(post.likedBy || []), user.uid];

    setPosts((current) => current.map((p) => p._id === post._id ? { ...p, likes: newLikes, likedBy: newLikedBy } : p));
    try {
      const updated = await api.posts.toggleLike(post._id, user.uid);
      setPosts((current) => current.map((p) => p._id === post._id ? { ...p, likes: updated.likes, likedBy: updated.likedBy } : p));
    } catch (e) {
      fetchPosts(); // revert on fail
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!user) return;
    try {
      const newComment = await api.posts.addComment(postId, user.uid, text);
      setPosts((current) => current.map((p) => p._id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p));
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/MainLogoONLY.png')} style={{ width: 32, height: 32, borderRadius: 8 }} />
        <Text style={styles.logoText}>Orbyt</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
          <Settings size={24} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications')}>
          <Bell size={24} color="#94a3b8" />
          {notifUnreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifUnreadCount > 9 ? '9+' : notifUnreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : posts.length === 0 ? (
        <ScrollView contentContainerStyle={styles.center} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
          <Text style={styles.emptyText}>No posts found nearby. Try increasing your discovery radius in settings!</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={({ item }) => (
            <PostItem
              post={item}
              currentUserId={user?.uid}
              onLike={handleLike}
              onAddComment={handleAddComment}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0f172a' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginLeft: 8, borderWidth: 1, borderColor: '#334155' },
  avatarText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#64748b', textAlign: 'center', fontSize: 16, lineHeight: 24 },
  listContent: { padding: 16, paddingBottom: 100 }
});
