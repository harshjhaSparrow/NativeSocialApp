import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Home, Map as MapIcon, PlusSquare, MessageCircle, User } from 'lucide-react-native';
import LocationGuard from '../../components/LocationGuard';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Tabs, useRouter } from 'expo-router';

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const checkUnread = async () => {
      if (!user) return;
      try {
        const count = await api.chat.getUnreadCount(user.uid);
        setUnreadMessages(count);
      } catch (e) {
        console.error(e);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <LocationGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)', // slate-900
            borderTopWidth: 1,
            borderTopColor: '#1e293b', // slate-800
            height: 60,
            paddingBottom: 5,
            paddingTop: 5,
            position: 'absolute',
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#64748b',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color }) => <MapIcon size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="create-post-tab"
          options={{
            title: 'Create',
            tabBarIcon: ({ color }) => (
              <View style={styles.createButton}>
                <PlusSquare size={24} color="#fff" />
              </View>
            ),
            tabBarLabel: () => null,
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              router.push('/create-post');
            },
          })}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => (
              <View>
                <MessageCircle size={24} color={color} />
                {unreadMessages > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
                  </View>
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
          }}
        />
      </Tabs>
    </LocationGuard>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#020617',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
