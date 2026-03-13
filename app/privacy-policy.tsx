import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield } from 'lucide-react-native';
import { colors, typography, spacing, radii } from '../constants/theme';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles?.section}>
        <Text style={styles?.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const Body = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.body}>{children}</Text>
);

const Bullet = ({ children }: { children: string }) => (
    <View style={styles?.bulletRow}>
        <Text style={styles?.bulletDot}>•</Text>
        <Text style={styles?.bulletText}>{children}</Text>
    </View>
);

export default function PrivacyPolicyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles?.container, { paddingTop: insets?.top }]}>
            {/* Header */}
            <View style={styles?.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles?.backBtn}>
                    <ChevronLeft size={26} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles?.title}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles?.scroll} showsVerticalScrollIndicator={false}>
                {/* Hero */}
                <View style={styles?.hero}>
                    <View style={styles?.iconBox}>
                        <Shield size={32} color={colors.primary} />
                    </View>
                    <Text style={styles?.heroTitle}>Your Privacy Matters</Text>
                    <Text style={styles?.heroSub}>Last updated: March 2026</Text>
                </View>

                <Section title="1. Introduction">
                    <Body>
                        Welcome to Orbyt (&quot;We&quot;, &quot;Us&quot;, or &quot;Our&quot;). We are committed to protecting your privacy and ensuring your personal data is handled securely and responsibly. This Privacy Policy explains how we collect, use, and share information when you use the Orbyt application.
                    </Body>
                </Section>

                <Section title="2. Information We Collect">
                    <Bullet>Account Information: Your email address, display name, and optional profile photo when you register.</Bullet>
                    <Bullet>Location Data: Your precise geographic location to power the map, nearby discovery, and distance features. You can pause discoverability at any time from Settings.</Bullet>
                    <Bullet>User Content: Posts, comments, photos, and messages you choose to share through the app.</Bullet>
                    <Bullet>Usage Data: App interactions and device information to improve performance and prevent abuse.</Bullet>
                    <Bullet>Push Token: A device token used to deliver push notifications to you.</Bullet>
                </Section>

                <Section title="3. How We Use Your Information">
                    <Bullet>To provide, personalise, and improve the Orbyt experience.</Bullet>
                    <Bullet>To calculate distances between users for local discovery.</Bullet>
                    <Bullet>To send notifications for messages, friend requests, and meetup updates.</Bullet>
                    <Bullet>To enforce our Terms of Service and protect the community.</Bullet>
                </Section>

                <Section title="4. Sharing Your Information">
                    <Body>We do not sell your personal data to third parties.</Body>
                    <Bullet>With other users: Your profile and approximate location may be visible to nearby users based on your discoverability settings.</Bullet>
                    <Bullet>For legal reasons: If required by law or to protect the safety of our users and platform.</Bullet>
                </Section>

                <Section title="5. Data Retention & Deletion">
                    <Body>
                        We retain your data for as long as your account is active. You can permanently delete your account and all associated data at any time from Settings → Delete Account. Upon deletion, your profile, posts, messages, and location history are permanently removed.
                    </Body>
                </Section>

                <Section title="6. Security">
                    <Body>
                        We implement industry-standard security measures including HTTPS encryption for all data in transit. However, no electronic system is 100% secure and you use the Service at your own risk.
                    </Body>
                </Section>

                <Section title="7. Children's Privacy">
                    <Body>
                        Orbyt is intended for users aged 18 and above. We do not knowingly collect personal information from anyone under 18. If we become aware that a minor has registered, we will immediately delete their account.
                    </Body>
                </Section>

                <Section title="8. Contact Us">
                    <Body>
                        If you have any questions or concerns about this Privacy Policy, please contact us at:{'\n\n'}privacy@orbyt.app
                    </Body>
                </Section>

                <Text style={styles?.footer}>© 2026 Orbyt Inc. All rights reserved.</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.s4,
        paddingVertical: spacing.s3,
        borderBottomWidth: 1,
        borderBottomColor: colors.border0,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: { color: colors.textPrimary, fontSize: typography.size?.lg, fontWeight: typography.weight?.bold },
    scroll: { padding: spacing.s5, paddingBottom: 60, gap: spacing.s5 },

    // Hero block
    hero: { alignItems: 'center', paddingVertical: spacing.s6 },
    iconBox: {
        width: 72,
        height: 72,
        borderRadius: radii.r4,
        backgroundColor: colors.primaryGlow,
        borderWidth: 1,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.s4,
    },
    heroTitle: { color: colors.textPrimary, fontSize: typography.size?.['2xl'], fontWeight: typography.weight?.extrabold, marginBottom: spacing.s2 },
    heroSub: { color: colors.textTertiary, fontSize: typography.size?.sm },

    // Sections
    section: {
        backgroundColor: colors.bg2,
        borderRadius: radii.r4,
        borderWidth: 1,
        borderColor: colors.border0,
        padding: spacing.s4,
        gap: spacing.s3,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontSize: typography.size?.base,
        fontWeight: typography.weight?.bold,
        marginBottom: spacing.s1,
    },
    body: {
        color: colors.textSecondary,
        fontSize: typography.size?.sm,
        lineHeight: typography.size?.sm * 1.7,
    },
    bulletRow: { flexDirection: 'row', gap: spacing.s2 },
    bulletDot: { color: colors.primary, fontSize: typography.size?.base, lineHeight: typography.size?.sm * 1.7 },
    bulletText: { flex: 1, color: colors.textSecondary, fontSize: typography.size?.sm, lineHeight: typography.size?.sm * 1.7 },

    footer: { color: colors.textTertiary, fontSize: typography.size?.xs, textAlign: 'center', marginTop: spacing.s4 },
});
