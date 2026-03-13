import { Tabs, useRouter } from 'expo-router';
import { Compass, Home, Map as MapIcon, MessageCircle, PlusSquare, User } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import LocationGuard from '../../components/LocationGuard';
import { animation, colors, radii, shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

// Individual tab icon with spring animation
function AnimatedTabIcon({ focused, icon, badge }: { focused: boolean; icon: (color: string, size: number) => React.ReactNode; badge?: number | string }) {
  const scale = useRef(new Animated.Value(1))?.current;
  const opacity = useRef(new Animated.Value(0))?.current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      ...animation.spring.bounce,
    }).start();
    Animated.timing(opacity, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  const color = focused ? colors.primary : colors.textTertiary;

  return (
    <View style={styles?.iconWrapper}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {icon(color, 24)}
      </Animated.View>
      {/* Active dot indicator */}
      <Animated.View style={[styles?.activeDot, { opacity }]} />
      {/* Badge */}
      {!!badge && Number(badge) > 0 && (
        <View style={styles?.badge}>
          <Text style={styles?.badgeText}>{Number(badge) > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

// Floating Create button
function CreateButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1))?.current;

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, ...animation.spring.press }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animation.spring.press }).start();

  return (
    <TouchableWithoutFeedback onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles?.createBtn, { transform: [{ scale }] }]}>
        <PlusSquare size={26} color={colors.white} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const checkUnread = async () => {
      if (!user) return;
      try {
        const count = await api.chat.getUnreadCount(user?.uid);
        setUnreadMessages(count);
      } catch (e) { }
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
            backgroundColor: colors.bg1,
            borderTopWidth: 1,
            borderTopColor: colors.border0,
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            paddingTop: 8,
            position: 'absolute',
            ...(shadows.md as any),
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarShowLabel: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon focused={focused} icon={(c, s) => <Home size={s} color={c} />} />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon focused={focused} icon={(c, s) => <MapIcon size={s} color={c} />} />
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon focused={focused} icon={(c, s) => <Compass size={s} color={c} />} />
            ),
          }}
        />
        <Tabs.Screen
          name="create-post-tab"
          options={{
            tabBarIcon: () => <CreateButton onPress={() => router.push('/create-post')} />,
            tabBarLabel: () => null,
          }}
          listeners={() => ({
            tabPress: (e) => { e.preventDefault(); router.push('/create-post'); },
          })}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon focused={focused} icon={(c, s) => <MessageCircle size={s} color={c} />} badge={unreadMessages} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon focused={focused} icon={(c, s) => <User size={s} color={c} />} />
            ),
          }}
        />
      </Tabs>
    </LocationGuard>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.danger,
    borderRadius: radii.rFull,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: colors.bg1,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  createBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.bg1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
