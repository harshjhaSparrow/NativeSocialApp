import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, spacing, typography } from "../../constants/theme";
import Button from "./Button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="md"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.s8,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bg3,
    borderWidth: 1,
    borderColor: colors.border0,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.s4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    textAlign: "center",
    marginBottom: spacing.s2,
  },
  subtitle: {
    color: colors.textTertiary,
    fontSize: typography.size.sm,
    textAlign: "center",
    lineHeight: typography.size.sm * typography.leading.relaxed,
  },
  action: {
    marginTop: spacing.s5,
    alignSelf: "center",
  },
});
