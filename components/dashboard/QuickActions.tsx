import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Download, Mail, Send, Users } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize } from '@/constants/designSystem';

const actions = [
  { label: 'Invite Beta Users', icon: Send },
  { label: 'Export Users', icon: Download },
  { label: 'Export Waitlist', icon: Download },
  { label: 'Send Email', icon: Mail },
  { label: 'Open CRM', icon: Users },
];

export function QuickActions() {
  return (
    <View style={styles.section}>
      <View>
        <AppText variant="sectionTitle">Quick Actions</AppText>
        <AppText variant="body" color={Colors.gray}>
          Placeholder actions for future CRM workflows.
        </AppText>
      </View>

      <View style={styles.card}>
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <View key={action.label} style={styles.action}>
              <Icon size={IconSize.sm} color={Colors.gray} />
              <AppText variant="label" color={Colors.gray} numberOfLines={1}>
                {action.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  action: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
    opacity: 0.68,
  },
});
