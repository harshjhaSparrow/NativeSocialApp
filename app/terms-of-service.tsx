import { useRouter } from 'expo-router';
import { ChevronLeft, FileText } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../constants/theme';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const Body = ({ children }: { children: any }) => (
    <Text style={styles.body}>{children}</Text>
);

const Bullet = ({ children }: { children: string }) => (
    <View style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{children}</Text>
    </View>
);

export default function TermsOfServiceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={26} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.title}>Terms of Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.iconBox}>
                        <FileText size={32} color={colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>Terms of Service</Text>
                    <Text style={styles.heroSub}>Last updated: March 2026</Text>
                </View>

                <Section title="1. Acceptance of Terms">
                    <Body>
                        By accessing or using Orbyt (&quot;the App&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App. We may update these terms at any time, and continued use constitutes acceptance of any changes.
                    </Body>
                </Section>

                <Section title="2. Eligibility">
                    <Body>You must be at least 18 years old to use Orbyt. By registering, you confirm that you meet this age requirement. We reserve the right to terminate accounts of users who misrepresent their age.</Body>
                </Section>

                <Section title="3. User Accounts">
                    <Bullet>You are responsible for maintaining the confidentiality of your account credentials.</Bullet>
                    <Bullet>You must provide accurate and truthful information when creating your profile.</Bullet>
                    <Bullet>You are responsible for all activity that occurs under your account.</Bullet>
                    <Bullet>You may not create multiple accounts or impersonate others.</Bullet>
                </Section>

                <Section title="4. Acceptable Use">
                    <Body>You agree NOT to use Orbyt to:</Body>
                    <Bullet>Post content that is illegal, abusive, harassing, threatening, or discriminatory.</Bullet>
                    <Bullet>Share explicit sexual content, nudity, or graphic violence.</Bullet>
                    <Bullet>Spam, scam, or mislead other users.</Bullet>
                    <Bullet>Collect or harvest other users&apos; personal data without consent.</Bullet>
                    <Bullet>Attempt to reverse engineer, hack, or disrupt the App or its servers.</Bullet>
                </Section>

                <Section title="5. User-Generated Content">
                    <Body>
                        You retain ownership of content you post on Orbyt. By posting, you grant Orbyt a non-exclusive, royalty-free licence to display your content within the App. You are solely responsible for ensuring your content does not violate any laws or third-party rights.
                    </Body>
                </Section>

                <Section title="6. Location Data">
                    <Body>
                        Orbyt&apos;s core features require access to your device&apos;s location. Your location is used solely to power nearby discovery, map features, and meetup coordination. You can pause location sharing at any time from Settings.
                    </Body>
                </Section>

                <Section title="7. Content Moderation">
                    <Body>
                        We reserve the right to remove any content that violates these Terms or that we deem harmful to the community, at our sole discretion and without prior notice. Repeated violations may result in permanent account suspension.
                    </Body>
                </Section>

                <Section title="8. Limitation of Liability">
                    <Body>
                        Orbyt is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the App, interactions with other users, or reliance on content posted by others. You use the App at your own risk.
                    </Body>
                </Section>

                <Section title="9. Termination">
                    <Body>
                        We may suspend or terminate your account at any time for violation of these Terms. You may delete your account at any time from Settings. Upon termination, your data will be permanently deleted.
                    </Body>
                </Section>

                <Section title="10. Contact Us">
                    <Body>{`For questions about these Terms, please contact us at:

legal@orbyt.app`}</Body>
                </Section>

                <Text style={styles.footer}>© 2026 Orbyt Inc. All rights reserved.</Text>
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
    title: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
    scroll: { padding: spacing.s5, paddingBottom: 60, gap: spacing.s5 },

    hero: { alignItems: 'center', paddingVertical: spacing.s6 },
    iconBox: {
        width: 72, height: 72, borderRadius: radii.r4,
        backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary,
        justifyContent: 'center', alignItems: 'center', marginBottom: spacing.s4,
    },
    heroTitle: { color: colors.textPrimary, fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, marginBottom: spacing.s2 },
    heroSub: { color: colors.textTertiary, fontSize: typography.size.sm },

    section: {
        backgroundColor: colors.bg2, borderRadius: radii.r4,
        borderWidth: 1, borderColor: colors.border0,
        padding: spacing.s4, gap: spacing.s3,
    },
    sectionTitle: { color: colors.textPrimary, fontSize: typography.size.base, fontWeight: typography.weight.bold, marginBottom: spacing.s1 },
    body: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: typography.size.sm * 1.7 },
    bulletRow: { flexDirection: 'row', gap: spacing.s2 },
    bulletDot: { color: colors.primary, fontSize: typography.size.base, lineHeight: typography.size.sm * 1.7 },
    bulletText: { flex: 1, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: typography.size.sm * 1.7 },

    footer: { color: colors.textTertiary, fontSize: typography.size.xs, textAlign: 'center', marginTop: spacing.s4 },
});
