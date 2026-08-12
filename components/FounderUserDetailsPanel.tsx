import React, { useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  Mail,
  PackageCheck,
  Phone,
  Route,
  UserRound,
  X,
} from 'lucide-react-native';
import { FounderErrorState, FounderLoadingState } from '@/components/founder/FounderStates';
import { AppButton, AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { Elevation, IconSize, StatusTone } from '@/constants/designSystem';
import { getFounderUserDetails } from '@/lib/founderUsers';
import type { FounderUserDetails, FounderUserStatus } from '@/types/founderUsers';

interface FounderUserDetailsPanelProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const NOT_AVAILABLE = 'Not available';

function formatDate(value: string): string {
  if (!value) return NOT_AVAILABLE;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return NOT_AVAILABLE;

  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value: string): string {
  if (!value) return NOT_AVAILABLE;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value || NOT_AVAILABLE;

  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatNumber(value: number | null): string {
  if (value == null) return NOT_AVAILABLE;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function displayText(value: string): string {
  return value.trim().length > 0 ? value : NOT_AVAILABLE;
}

function displayPlan(user: FounderUserDetails): string {
  return user.plan === 'unknown' ? NOT_AVAILABLE : user.planLabel;
}

function displaySubscriptionStatus(user: FounderUserDetails): string {
  return user.status === 'unknown' ? NOT_AVAILABLE : user.statusLabel;
}

function accountStatus(user: FounderUserDetails): { value: 'trial' | 'premium' | 'expired' | 'free'; label: string } {
  if (user.status === 'expired') return { value: 'expired', label: 'Expired' };
  if (user.status === 'premium' || user.plan === 'premium') return { value: 'premium', label: 'Premium' };
  if (user.status === 'trial' || user.plan === 'trial') return { value: 'trial', label: 'Trial' };
  return { value: 'free', label: 'Free' };
}

function badgeTone(value: FounderUserStatus | 'free') {
  if (value === 'premium') return StatusTone.success;
  if (value === 'trial') return StatusTone.warning;
  if (value === 'expired' || value === 'canceled') return StatusTone.error;
  return StatusTone.brand;
}

function DetailBadge({ value, label }: { value: FounderUserStatus | 'free'; label: string }) {
  const tone = badgeTone(value);

  return (
    <View style={[styles.badge, { backgroundColor: tone.background, borderColor: tone.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: tone.foreground }]} />
      <AppText variant="label" color={tone.foreground}>
        {label}
      </AppText>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText variant="caption" color={Colors.gray} style={styles.infoLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={value === NOT_AVAILABLE ? Colors.gray : Colors.white}>
        {value}
      </AppText>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <AppText variant="cardTitle">{title}</AppText>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function buildTimeline(user: FounderUserDetails) {
  return [
    { label: 'Registration', value: user.createdAt },
    { label: 'Trial Started', value: user.trialStart },
    { label: 'Trial Ends', value: user.trialEnd },
    { label: 'Premium Activated', value: user.premiumActivatedAt },
  ];
}

function UserDetailsContent({ user }: { user: FounderUserDetails }) {
  const status = accountStatus(user);
  const timeline = useMemo(() => buildTimeline(user), [user]);

  return (
    <>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <UserRound size={IconSize.lg} color={Colors.gold[400]} />
        </View>
        <View style={styles.identityText}>
          <AppText variant="pageTitle" numberOfLines={2}>
            {displayText(user.name)}
          </AppText>
          <View style={styles.identityLine}>
            <Mail size={IconSize.sm} color={Colors.gray} />
            <AppText variant="body" color={Colors.gray} numberOfLines={1}>
              {displayText(user.email)}
            </AppText>
          </View>
          <View style={styles.identityLine}>
            <Phone size={IconSize.sm} color={Colors.gray} />
            <AppText variant="body" color={Colors.gray} numberOfLines={1}>
              {displayText(user.phone)}
            </AppText>
          </View>
          <View style={styles.identityMeta}>
            <InfoRow label="Registration Date" value={formatDateTime(user.createdAt)} />
            <InfoRow label="Last Activity" value={formatDateTime(user.lastActivity)} />
            <InfoRow label="Last Login" value={formatDateTime(user.lastLogin)} />
          </View>
        </View>
        <DetailBadge value={status.value} label={status.label} />
      </View>

      <Section
        title="Subscription"
        icon={<CalendarClock size={IconSize.md} color={Colors.gold[400]} />}
      >
        <InfoRow label="Current Plan" value={displayPlan(user)} />
        <InfoRow label="Subscription Status" value={displaySubscriptionStatus(user)} />
        <InfoRow label="Trial Started" value={formatDate(user.trialStart)} />
        <InfoRow label="Trial Ends" value={formatDate(user.trialEnd)} />
        <InfoRow label="Premium Expiration" value={formatDate(user.premiumExpiration)} />
      </Section>

      <Section
        title="Delivery Activity"
        icon={<PackageCheck size={IconSize.md} color={Colors.success} />}
      >
        <InfoRow label="Total Routes" value={formatNumber(user.totalRoutes)} />
        <InfoRow label="Completed Routes" value={formatNumber(user.completedRoutes)} />
        <InfoRow label="Packages Delivered" value={formatNumber(user.packagesDelivered)} />
        <InfoRow label="Last Route" value={formatDateTime(user.lastRoute)} />
        <InfoRow
          label="Average Packages per Route"
          value={formatNumber(user.averagePackagesPerRoute)}
        />
      </Section>

      <Section title="Account Status" icon={<CheckCircle2 size={IconSize.md} color={Colors.warning} />}>
        <DetailBadge value={status.value} label={status.label} />
      </Section>

      <Section title="Timeline" icon={<Route size={IconSize.md} color={Colors.gold[400]} />}>
        <View style={styles.timeline}>
          {timeline.map((item, index) => (
            <View key={item.label} style={styles.timelineItem}>
              <View style={styles.timelineRail}>
                <View style={styles.timelineDot} />
                {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineBody}>
                <AppText variant="bodyStrong">{item.label}</AppText>
                <AppText variant="body" color={Colors.gray}>
                  {formatDateTime(item.value)}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

export function FounderUserDetailsPanel({
  userId,
  isOpen,
  onClose,
}: FounderUserDetailsPanelProps) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const mobile = width < 768;

  const query = useQuery({
    queryKey: ['founder-user-details', userId],
    queryFn: () => getFounderUserDetails(userId ?? ''),
    enabled: isOpen && Boolean(userId),
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <Modal
      visible={isOpen}
      transparent={!mobile}
      animationType={desktop ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, mobile && styles.mobileBackdrop]}>
        {!mobile ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close user details"
            activeOpacity={1}
            style={styles.scrim}
            onPress={onClose}
          />
        ) : null}

        <View
          style={[
            styles.panel,
            desktop && styles.desktopPanel,
            !desktop && !mobile && styles.tabletPanel,
            mobile && styles.mobilePanel,
          ]}
        >
          <View style={styles.header}>
            <View>
              <AppText variant="caption" color={Colors.gold[400]}>
                Founder CRM
              </AppText>
              <AppText variant="sectionTitle">User Details</AppText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Close user details"
              style={styles.iconButton}
            >
              <X size={IconSize.md} color={Colors.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {query.isLoading ? (
              <FounderLoadingState message="Loading user details..." />
            ) : query.isError ? (
              <FounderErrorState
                title="Unable to load user details"
                description="We could not load this user record right now. Please try again."
                onRetry={() => query.refetch()}
              />
            ) : query.data ? (
              <UserDetailsContent user={query.data} />
            ) : (
              <View style={styles.state}>
                <AppText variant="bodyStrong">User not found</AppText>
                <AppText variant="body" color={Colors.gray}>
                  The selected user is no longer available.
                </AppText>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              label="Close"
              variant="ghost"
              fullWidth
              leftIcon={<X size={IconSize.sm} color={Colors.gray} />}
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 13, 66, 0.42)',
  },
  mobileBackdrop: {
    backgroundColor: Colors.background,
  },
  scrim: {
    flex: 1,
  },
  panel: {
    backgroundColor: Colors.background,
    borderLeftWidth: 1,
    borderLeftColor: Colors.cardBorder,
    ...Elevation.floating,
  },
  desktopPanel: {
    width: 480,
    height: '100%',
  },
  tabletPanel: {
    alignSelf: 'center',
    width: '100%',
    maxHeight: '94%',
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.cardBorder,
  },
  mobilePanel: {
    flex: 1,
    width: '100%',
    borderLeftWidth: 0,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  identityLine: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  identityMeta: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  badge: {
    minHeight: 28,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: BorderRadius.full,
  },
  section: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionContent: {
    gap: Spacing.sm,
  },
  infoRow: {
    minHeight: 42,
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  infoLabel: {
    textTransform: 'uppercase',
  },
  timeline: {
    gap: Spacing.sm,
  },
  timelineItem: {
    minHeight: 54,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timelineRail: {
    width: 18,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gold[400],
    marginTop: 5,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    marginTop: Spacing.xs,
    backgroundColor: Colors.cardBorder,
  },
  timelineBody: {
    flex: 1,
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  state: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
});
