import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Image } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import { ChevronLeft, Instagram, Code, Briefcase, Coffee, Heart, Linkedin } from "lucide-react-native";
import { colors, typography, spacing, radii } from "../constants/theme";

export default function DeveloperProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const openInstagram = () => {
        Linking.openURL("https://instagram.com/_harsh_jha_");
    };

    const openLinkedIn = () => {
        Linking.openURL("https://www.linkedin.com/notifications/?filter=all");
    };

    const openCoffee = () => {
        // You can replace this with your actual buy me a coffee link
        Linking.openURL("https://www.buymeacoffee.com/");
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={26} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.title}>Developer Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: "https://via.placeholder.com/150" }} 
                            style={styles.avatarImage} 
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={styles.name}>Harsh Jha</Text>
                    
                    <View style={styles.roleContainer}>
                        <Briefcase size={16} color={colors.primary} />
                        <Text style={styles.roleText}>Software Engineer</Text>
                    </View>

                    <Text style={styles.bioText}>
                        Passionate about building beautiful, high-performance mobile applications and scalable backend systems. Let's create something amazing together!
                    </Text>
                </View>

                <Text style={styles.sectionLabel}>TECH STACK</Text>
                <View style={styles.card}>
                    <View style={styles.techRow}>
                        <Code size={20} color={colors.textSecondary} />
                        <Text style={styles.techText}>React</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.techRow}>
                        <Code size={20} color={colors.textSecondary} />
                        <Text style={styles.techText}>React Native</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.techRow}>
                        <Code size={20} color={colors.textSecondary} />
                        <Text style={styles.techText}>Node.js</Text>
                    </View>
                </View>

                <Text style={styles.sectionLabel}>CONNECT WITH ME</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.actionRow} onPress={openInstagram}>
                        <Instagram size={20} color="#e1306c" />
                        <Text style={styles.actionText}>Follow on Instagram</Text>
                        <Text style={styles.actionSubtext}>@_harsh_jha_</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.actionRow} onPress={openLinkedIn}>
                        <Linkedin size={20} color="#0077b5" />
                        <Text style={styles.actionText}>Connect on LinkedIn</Text>
                        <Text style={styles.actionSubtext}>Harsh Jha</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>SUPPORT</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.actionRow} onPress={openCoffee}>
                        <Coffee size={20} color="#ffdd00" />
                        <Text style={styles.actionText}>Buy me a coffee</Text>
                        <Heart size={16} color={colors.danger} />
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.footerText}>Made with ❤️ by Harsh Jha</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.s4, paddingVertical: spacing.s3, borderBottomWidth: 1, borderBottomColor: colors.border0 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    title: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
    scroll: { padding: spacing.s4, paddingBottom: 80 },
    
    profileCard: {
        alignItems: 'center',
        paddingVertical: spacing.s6,
        marginBottom: spacing.s4,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.bg2,
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.s4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.s2,
    },
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg2,
        paddingHorizontal: spacing.s3,
        paddingVertical: spacing.s2,
        borderRadius: radii.rFull,
        borderWidth: 1,
        borderColor: colors.border0,
        gap: spacing.s2,
        marginBottom: spacing.s4,
    },
    roleText: {
        color: colors.textSecondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    bioText: {
        color: colors.textSecondary,
        fontSize: typography.size.sm,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: spacing.s4,
    },

    sectionLabel: { color: colors.textTertiary, fontSize: typography.size.xs, fontWeight: typography.weight.bold, letterSpacing: typography.tracking.widest, marginTop: spacing.s2, marginBottom: spacing.s2, paddingHorizontal: spacing.s1 },
    card: { backgroundColor: colors.bg2, borderRadius: radii.r4, borderWidth: 1, borderColor: colors.border0, padding: spacing.s4, marginBottom: spacing.s4 },
    divider: { height: 1, backgroundColor: colors.border0, marginVertical: spacing.s3 },
    
    techRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s3,
    },
    techText: {
        color: colors.textPrimary,
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
    },

    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s3,
        paddingVertical: spacing.s1,
    },
    actionText: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
    },
    actionSubtext: {
        color: colors.textTertiary,
        fontSize: typography.size.sm,
    },
    
    footerText: {
        textAlign: 'center',
        color: colors.textTertiary,
        fontSize: typography.size.sm,
        marginTop: spacing.s6,
        marginBottom: spacing.s4,
    }
});
