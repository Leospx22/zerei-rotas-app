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
  MapPin,
  Phone,
  Tags,
  UserRound,
  X,
} from 'lucide-react-native';
import { FounderErrorState, FounderLoadingState } from '@/components/founder/FounderStates';
import { AppButton, AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { Elevation, IconSize, StatusTone } from '@/constants/designSystem';
import { getFounderWaitlistRecord } from '@/lib/founderWaitlist';
import type { FounderWaitlistRecord } from '@/types/founderWaitlist';

interface FounderWaitlistDetailsPanelProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type JourneyStage = 'registered' | 'contacted' | 'beta' | 'trial' | 'premium';

const NOT_AVAILABLE = 'Not available';

const journeyOrder: JourneyStage[] = ['registered', 'contacted', 'beta', 'trial', 'premium'];

function formatStatus(value: string): string {
  if (!value) return NOT_AVAILABLE;

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function displayText(value: string): string {
  return value.trim().length > 0 && value !== 'Nao informado' ? value : NOT_AVAILABLE;
}

function statusTone(status: string) {
  if (status === 'purchased' || status === 'trial_active' || status === 'registered') {
    return StatusTone.success;
  }
  if (status === 'contacted' || status === 'invited') return StatusTone.warning;
  if (status === 'not_qualified' || status === 'unsubscribed') return StatusTone.error;
  return StatusTone.brand;
}

function currentJourneyStage(status: string): JourneyStage | null {
  if (status === 'purchased' || status === 'premium') return 'premium';
  if (status === 'trial_active' || status === 'trial') return 'trial';
  if (status === 'beta' || status === 'invited') return 'beta';
  if (status === 'contacted') return 'contacted';
  if (status === 'registered' || status === 'new') return 'registered';
  return null;
}

function stageRank(stage: JourneyStage): number {
  return journeyOrder.indexOf(stage);
}

function stageDate(record: FounderWaitlistRecord, stage: JourneyStage): string {
  if (stage === 'registered') return record.createdAt;
  if (stage === 'contacted') return record.contactedAt;
  if (stage === 'beta') return record.betaAt;
  if (stage === 'trial') return record.trialAt;
  return record.premiumAt;
}

function stageAvailable(record: FounderWaitlistRecord, stage: JourneyStage): boolean {
  const explicitDate = stageDate(record, stage);
  if (explicitDate) return true;

  const currentStage = currentJourneyStage(record.status);
  return currentStage ? stageRank(stage) <= stageRank(currentStage) : false;
}

function DetailBadge({ status }: { status: string }) {
  const tone = statusTone(status);

  return (
    <View style={[styles.badge, { backgroundColor: tone.background, borderColor: tone.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: tone.foreground }]} />
      <AppText variant="label" color={tone.foreground}>
        {formatStatus(status)}
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

function buildJourney(record: FounderWaitlistRecord) {
  return [
    { key: 'registered' as const, label: 'Registered' },
    { key: 'contacted' as const, label: 'Contacted' },
    { key: 'beta' as const, label: 'Beta' },
    { key: 'trial' as const, label: 'Trial' },
    { key: 'premium' as const, label: 'Premium' },
  ].map(stage => ({
    ...stage,
    enabled: stageAvailable(record, stage.key),
    value: stageDate(record, stage.key),
  }));
}

function WaitlistDetailsContent({ record }: { record: FounderWaitlistRecord }) {
  const journey = useMemo(() => buildJourney(record), [record]);

  return (
    <>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <UserRound size={IconSize.lg} color={Colors.gold[400]} />
        </View>
        <View style={styles.identityText}>
          <AppText variant="pageTitle" numberOfLines={2}>
            {displayText(record.name)}
          </AppText>
          <View style={styles.identityLine}>
            <Mail size={IconSize.sm} color={Colors.gray} />
            <AppText variant="body" color={Colors.gray} numberOfLines={1}>
              {displayText(record.email)}
            </AppText>
          </View>
          <View style={styles.identityLine}>
            <Phone size={IconSize.sm} color={Colors.gray} />
            <AppText variant="body" color={Colors.gray} numberOfLines={1}>
              {displayText(record.phone)}
            </AppText>
          </View>
          <View style={styles.identityLine}>
            <MapPin size={IconSize.sm} color={Colors.gray} />
            <AppText variant="body" color={Colors.gray} numberOfLines={1}>
              {displayText(record.city)}
            </AppText>
          </View>
          <View style={styles.identityMeta}>
            <InfoRow label="Registration Date" value={formatDateTime(record.createdAt)} />
            <InfoRow label="Last Updated" value={formatDateTime(record.updatedAt)} />
            <InfoRow label="Current Status" value={formatStatus(record.status)} />
          </View>
        </View>
        <DetailBadge status={record.status} />
      </View>

      <Section title="Identity" icon={<CalendarClock size={IconSize.md} color={Colors.gold[400]} />}>
        <InfoRow label="Name" value={displayText(record.name)} />
        <InfoRow label="Email" value={displayText(record.email)} />
        <InfoRow label="Phone" value={displayText(record.phone)} />
        <InfoRow label="City" value={displayText(record.city)} />
        <InfoRow label="Registration Date" value={formatDateTime(record.createdAt)} />
        <InfoRow label="Last Updated" value={formatDateTime(record.updatedAt)} />
        <InfoRow label="Current Status" value={formatStatus(record.status)} />
      </Section>

      <Section title="Journey" icon={<CheckCircle2 size={IconSize.md} color={Colors.success} />}>
        <View style={styles.timeline}>
          {journey.map((item, index) => (
            <View key={item.key} style={[styles.timelineItem, !item.enabled && styles.disabledItem]}>
              <View style={styles.timelineRail}>
                <View style={[styles.timelineDot, !item.enabled && styles.disabledDot]} />
                {index < journey.length - 1 ? (
                  <View style={[styles.timelineLine, !item.enabled && styles.disabledLine]} />
                ) : null}
              </View>
              <View style={styles.timelineBody}>
                <AppText variant="bodyStrong" color={item.enabled ? Colors.white : Colors.gray}>
                  {item.label}
                </AppText>
                <AppText variant="body" color={Colors.gray}>
                  {formatDateTime(item.value)}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Future CRM" icon={<Tags size={IconSize.md} color={Colors.gold[400]} />}>
        <InfoRow label="Notes" value={displayText(record.internalNotes)} />
        <InfoRow label="Assigned Founder" value={displayText(record.assignedFounder)} />
        <InfoRow label="Follow-up History" value={NOT_AVAILABLE} />
        <InfoRow label="Tags" value={displayText(record.tags)} />
        <InfoRow label="Campaign Source" value={displayText(record.campaignSource)} />
        <InfoRow label="Referral Source" value={displayText(record.referralSource)} />
      </Section>
    </>
  );
}

export function FounderWaitlistDetailsPanel({
  leadId,
  isOpen,
  onClose,
}: FounderWaitlistDetailsPanelProps) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;
  const mobile = width < 768;

  const query = useQuery({
    queryKey: ['founder-waitlist-record', leadId],
    queryFn: () => getFounderWaitlistRecord(leadId ?? ''),
    enabled: isOpen && Boolean(leadId),
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
            accessibilityLabel="Close waitlist lead details"
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
              <AppText variant="sectionTitle">Waitlist Details</AppText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Close waitlist lead details"
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
              <FounderLoadingState message="Loading waitlist details..." />
            ) : query.isError ? (
              <FounderErrorState
                title="Unable to load waitlist details"
                description="We could not load this waitlist lead right now. Please try again."
                onRetry={() => query.refetch()}
              />
            ) : query.data ? (
              <WaitlistDetailsContent record={query.data} />
            ) : (
              <View style={styles.state}>
                <AppText variant="bodyStrong">Lead not found</AppText>
                <AppText variant="body" color={Colors.gray}>
                  The selected waitlist lead is no longer available.
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
  disabledItem: {
    opacity: 0.58,
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
  disabledDot: {
    backgroundColor: Colors.darkGray,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    marginTop: Spacing.xs,
    backgroundColor: Colors.cardBorder,
  },
  disabledLine: {
    backgroundColor: Colors.darkGray,
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
