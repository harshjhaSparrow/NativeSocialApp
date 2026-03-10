import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { api } from '../services/api';

function RootNavigation() {
  const { status, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (user) {
        try {
          const profile = await api.profile.get(user.uid);
          const isOnboarded = !!profile && Array.isArray(profile.interests) && profile.interests.length > 0;
          setHasProfile(isOnboarded);
        } catch (e) {
          console.error("Error checking profile", e);
        } finally {
          setProfileChecked(true);
        }
      } else {
        setProfileChecked(true);
      }
    };

    if (status === 'authenticated') {
      checkProfile();
    } else if (status === 'unauthenticated') {
      setProfileChecked(true);
    }
  }, [user, status]);

  useEffect(() => {
    if (status === 'loading' || (status === 'authenticated' && !profileChecked)) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated') {
      if (!hasProfile && !inOnboardingGroup) {
        router.replace('/(onboarding)');
      } else if (hasProfile && (inAuthGroup || inOnboardingGroup)) {
        router.replace('/(tabs)');
      }
    }
  }, [status, profileChecked, hasProfile, segments]);

  if (status === 'loading' || (status === 'authenticated' && !profileChecked)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="edit-post/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="create-post" options={{ presentation: 'modal', headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <NotificationProvider>
          <RootNavigation />
        </NotificationProvider>
      </AuthProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
