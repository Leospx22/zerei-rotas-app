import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Check, CheckCircle2, MapPin, Navigation, Package, Pencil } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import { PlaceInfoCard } from '@/components/PlaceInfoCard';
import type { ExecutionStep } from '@/lib/executionState';
import type { GroupedStop, PackageItem } from '@/lib/packageUtils';
import type { PlaceInfo } from '@/lib/placeIntelligence';
import { isPackageGroupSelected } from '@/lib/packageSelection';
import {
  buildExecutionPackageGroups,
  isExecutionPackageGroupCompleted,
  normalizeAddress,
  summarizePackageGroups,
  type ExecutionPackageGroup,
} from '@/lib/executionPresentation';

export interface ExecutionCardProps {
  currentStop: GroupedStop | null;
  totalPackagesAtCurrentStop: number;
  pendingPackagesAtCurrentStop: PackageItem[];
  executionStep: ExecutionStep;
  onConfirmPickup: () => void;
  onConfirmDelivery: () => void;
  onNavigate: () => void;
  onAddressGroupOccurrence?: (group: ExecutionPackageGroup) => void;
  onPackageOccurrence?: (packageId: string) => void;
  separatedPackageIds: ReadonlySet<string>;
  onTogglePackageSeparated: (packageId: string) => void;
  onToggleAddressGroupSeparated?: (packageIds: readonly string[]) => void;
  placeInfoByAddressKey?: Readonly<Record<string, PlaceInfo | null | undefined>>;
  onEditPlaceInfo?: (group: Pick<ExecutionPackageGroup, 'key' | 'address'>) => void;
  onNavigateAddress?: (address: string) => void;
  onConfirmAddressGroup?: (group: ExecutionPackageGroup) => void;
  showNavigate?: boolean;
}

/**
 * Presentation-only card for the focused delivery stop.
 * Route mutations, navigation, persistence, and delivery-type selection belong
 * to the parent flow; this component only renders data and emits actions.
 */
export function ExecutionCard({
  currentStop,
  totalPackagesAtCurrentStop,
  pendingPackagesAtCurrentStop,
  executionStep,
  onConfirmPickup,
  onConfirmDelivery,
  onNavigate,
  onAddressGroupOccurrence,
  onPackageOccurrence,
  separatedPackageIds,
  onTogglePackageSeparated,
  onToggleAddressGroupSeparated,
  placeInfoByAddressKey = {},
  onEditPlaceInfo,
  onNavigateAddress,
  onConfirmAddressGroup,
  showNavigate = true,
}: ExecutionCardProps) {
  if (!currentStop) return null;

  const isPickup = executionStep === 'separacao';
  const packageCount = isPickup
    ? totalPackagesAtCurrentStop
    : pendingPackagesAtCurrentStop.length;
  const separatedPackagesCount = currentStop.packages.filter(pkg =>
    separatedPackageIds.has(pkg.id)
  ).length;
  const pickupComplete =
    totalPackagesAtCurrentStop > 0 &&
    separatedPackagesCount === totalPackagesAtCurrentStop;
  const primaryDisabled = isPickup && !pickupComplete;
  const packageGroups = buildExecutionPackageGroups(currentStop);
  const groupSummary = summarizePackageGroups(packageGroups, 3, true);
  const mainAddress =
    packageGroups[0]?.address ?? normalizeAddress(currentStop.normalizedAddress).displayAddress;
  const addressCount = packageGroups.length;
  const stopSummary = `${addressCount} ${addressCount === 1 ? 'endere\u00e7o' : 'endere\u00e7os'} • ${totalPackagesAtCurrentStop} ${totalPackagesAtCurrentStop === 1 ? 'pacote' : 'pacotes'}`;
  const highlightedLabel = isPickup
    ? `PEGUE ${packageCount} PACOTE${packageCount === 1 ? '' : 'S'}`
    : `ENTREGUE ${packageCount} PACOTE${packageCount === 1 ? '' : 'S'}`;
  const primaryLabel = isPickup
    ? `PEGUEI ${packageCount === 1 ? 'O' : 'OS'} ${packageCount} PACOTE${packageCount === 1 ? '' : 'S'}`
    : `ENTREGUEI ${packageCount === 1 ? 'O' : 'OS'} ${packageCount} PACOTE${packageCount === 1 ? '' : 'S'}`;

  return (
    <View style={styles.card}>
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>PARADA ATUAL</Text>
        <View style={styles.stopBadge}>
          <Text style={styles.stopBadgeText}>#{currentStop.stopNumber}</Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <MapPin size={22} color={Colors.gold[400]} />
        <View style={styles.addressContent}>
          <Text style={styles.address}>{mainAddress}</Text>
          <Text style={styles.stopSummary}>{stopSummary}</Text>
        </View>
      </View>

      <LinearGradient
        colors={[Colors.primary[500], Colors.primary[700]]}
        style={styles.packageHighlight}
      >
        <View style={styles.packageIcon}>
          <Package size={30} color={Colors.gold[400]} />
        </View>
        <View style={styles.packageHighlightText}>
          <Text style={styles.packageInstruction}>{highlightedLabel}</Text>
          <Text style={styles.packageSupportingText}>
            {isPickup ? 'Separe tudo antes de sair do carro' : 'Confirme a entrega nesta parada'}
          </Text>
          {packageGroups.length > 1 ? (
            <View style={styles.addressSummary}>
              {groupSummary.lines.map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.addressSummaryText}>
                  {line}
                </Text>
              ))}
              {groupSummary.remainingGroups > 0 ? (
                <Text style={styles.addressSummaryMore}>
                  + {groupSummary.remainingGroups}{' '}
                  {groupSummary.remainingGroups === 1 ? 'outro' : 'outros'}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.collectionSection}>
        {isPickup ? (
          <View style={styles.collectionHeader}>
            <View>
              <Text style={styles.collectionTitle}>Conferidos</Text>
              <Text style={styles.collectionCount}>
                {separatedPackagesCount} / {totalPackagesAtCurrentStop}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.packageRows}>
            {packageGroups.map(group => {
              const groupPlaceInfo = placeInfoByAddressKey[group.key] ?? null;
              const groupCompleted = isExecutionPackageGroupCompleted(group);
              const groupPackageIds = group.packages.map(pkg => pkg.id);
              const groupSelected = isPackageGroupSelected(
                separatedPackageIds,
                groupPackageIds
              );
              return (
                <View key={group.key} style={styles.packageGroup}>
                  <View style={styles.packageGroupHeader}>
                    <MapPin size={16} color={Colors.gold[400]} />
                    <View style={styles.packageGroupHeaderContent}>
                      <View style={styles.packageGroupTitleRow}>
                        <Text style={styles.packageGroupAddress} numberOfLines={2}>
                          {group.address}
                        </Text>
                      </View>
                      <View style={styles.packageGroupMetaRow}>
                        <Text style={styles.packageGroupCount}>
                          {group.packages.length}{' '}
                          {group.packages.length === 1 ? 'pacote' : 'pacotes'}
                        </Text>
                        {groupPlaceInfo ? (
                          <View style={styles.savedInfoIndicator}>
                            <CheckCircle2 size={12} color={Colors.success} />
                            <Text style={styles.savedInfoIndicatorText}>Info salva</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.packageGroupActions}>
                        {onNavigateAddress ? (
                          <TouchableOpacity
                            style={styles.groupHeaderAction}
                            onPress={() => onNavigateAddress(group.address)}
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            accessibilityLabel={`Navegar para ${group.address}`}
                          >
                            <Navigation size={15} color={Colors.gold[400]} />
                            <Text style={styles.groupHeaderActionText}>Navegar</Text>
                          </TouchableOpacity>
                        ) : null}
                        {onEditPlaceInfo ? (
                          <TouchableOpacity
                            style={styles.groupHeaderAction}
                            onPress={() => onEditPlaceInfo(group)}
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            accessibilityLabel={
                              groupPlaceInfo
                                ? `Editar informações de ${group.address}`
                                : `Adicionar informações de ${group.address}`
                            }
                          >
                            <Pencil size={14} color={Colors.gold[400]} />
                            <Text style={styles.groupHeaderActionText}>
                              {groupPlaceInfo ? 'Editar info' : '+ Info'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {onToggleAddressGroupSeparated ? (
                          <TouchableOpacity
                            style={styles.groupHeaderAction}
                            onPress={() => onToggleAddressGroupSeparated(groupPackageIds)}
                            activeOpacity={0.78}
                            accessibilityRole="button"
                            accessibilityLabel={
                              groupSelected
                                ? `Limpar seleção de ${group.address}`
                                : `Selecionar tudo em ${group.address}`
                            }
                          >
                            <Check size={15} color={Colors.gold[400]} />
                            <Text style={styles.groupHeaderActionText}>
                              {groupSelected ? 'Limpar seleção' : 'Selecionar tudo'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {groupPlaceInfo ? <PlaceInfoCard place={groupPlaceInfo} /> : null}

                {group.packages.map(pkg => {
                  const separated = separatedPackageIds.has(pkg.id);
                  const packageStateLabel = isPickup
                    ? 'Separado'
                    : pkg.status === 'delivered'
                      ? 'Entregue'
                      : pkg.status === 'skipped'
                        ? 'Ocorrência'
                        : 'Pendente';
                  return (
                    <View
                      key={pkg.id}
                      style={[
                        styles.packageRow,
                        separated && styles.packageRowSeparated,
                        !isPickup && groupCompleted && styles.packageRowCompleted,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.packageSelectionArea}
                        onPress={() => onTogglePackageSeparated(pkg.id)}
                        activeOpacity={0.78}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: separated }}
                        accessibilityLabel={`${pkg.trackingNumber}, ${packageStateLabel}`}
                      >
                        <View style={[styles.checkbox, separated && styles.checkboxSelected]}>
                          {separated ? <Check size={18} color={Colors.primary[900]} /> : null}
                        </View>
                        <View style={styles.packageRowContent}>
                          <Text style={styles.packageTracking} numberOfLines={1}>
                            {pkg.trackingNumber}
                          </Text>
                          <Text style={styles.packageAddress} numberOfLines={1}>
                            {pkg.destinationAddress}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.separatedLabel,
                            (separated || pkg.status === 'delivered') && styles.separatedLabelActive,
                            pkg.status === 'skipped' && styles.packageOccurrenceLabel,
                          ]}
                        >
                          {packageStateLabel}
                        </Text>
                      </TouchableOpacity>
                      {onPackageOccurrence ? (
                        <TouchableOpacity
                          style={[
                            styles.packageOccurrenceAction,
                            pkg.status === 'delivered' && styles.packageOccurrenceActionDisabled,
                          ]}
                          onPress={() => onPackageOccurrence(pkg.id)}
                          disabled={pkg.status === 'delivered'}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityLabel={`Registrar ocorrência para ${pkg.trackingNumber}`}
                          accessibilityState={{ disabled: pkg.status === 'delivered' }}
                        >
                          <AlertCircle size={17} color={Colors.error} />
                          <Text style={styles.packageOccurrenceActionText}>Ocorrência</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
                  {!isPickup && onConfirmAddressGroup ? (
                    groupCompleted ? (
                      <View style={styles.groupCompletedState}>
                        <CheckCircle2 size={18} color={Colors.success} />
                        <Text style={styles.groupCompletedStateText}>Endereço concluído</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.groupCompleteButton}
                        onPress={() => onConfirmAddressGroup(group)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Entregue neste endereço: ${group.address}`}
                      >
                        <CheckCircle2 size={20} color={Colors.primary[900]} />
                        <Text style={styles.groupCompleteButtonText}>
                          Entregue neste endereço
                        </Text>
                      </TouchableOpacity>
                    )
                  ) : null}
                  {!isPickup && onAddressGroupOccurrence ? (
                    <TouchableOpacity
                      style={styles.groupOccurrenceButton}
                      onPress={() => onAddressGroupOccurrence(group)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Registrar ocorrência em ${group.address}`}
                    >
                      <AlertCircle size={19} color={Colors.error} />
                      <Text style={styles.groupOccurrenceButtonText}>
                        Registrar ocorrência
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
        </View>
      </View>

      {isPickup ? (
        <TouchableOpacity
          style={[styles.primaryButton, primaryDisabled && styles.primaryButtonDisabled]}
          onPress={onConfirmPickup}
          disabled={primaryDisabled}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          accessibilityState={{ disabled: primaryDisabled }}
        >
          <LinearGradient
            colors={[Colors.gold[500], Colors.gold[700]]}
            style={styles.primaryButtonGradient}
          >
            <Package size={23} color={Colors.primary[900]} />
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      {showNavigate ? (
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onNavigate}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Navegar até a parada"
          >
            <Navigation size={20} color={Colors.gold[400]} />
            <Text style={styles.secondaryButtonText}>Navegar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: Colors.gold[400],
    fontSize: FontSizes.sm,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  stopBadge: {
    minWidth: 48,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
    borderWidth: 1,
    borderColor: Colors.primary[300],
  },
  stopBadgeText: {
    color: Colors.gold[400],
    fontSize: FontSizes.lg,
    fontWeight: '800',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  address: {
    color: Colors.white,
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    lineHeight: 30,
  },
  addressContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  stopSummary: {
    color: Colors.gold[300],
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  packageHighlight: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[300],
  },
  packageIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[900],
  },
  packageHighlightText: {
    flex: 1,
    gap: Spacing.xs,
  },
  packageInstruction: {
    color: Colors.gold[400],
    fontSize: FontSizes.xxl,
    fontWeight: '900',
    lineHeight: 29,
  },
  packageSupportingText: {
    color: Colors.offWhite,
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  addressSummary: {
    marginTop: Spacing.xs,
    gap: 2,
  },
  addressSummaryText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  addressSummaryMore: {
    color: Colors.gold[300],
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  collectionSection: {
    gap: Spacing.sm,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  collectionCount: {
    color: Colors.gold[400],
    fontSize: FontSizes.xl,
    fontWeight: '900',
  },
  packageRows: {
    gap: Spacing.sm,
  },
  packageGroup: {
    gap: Spacing.xs,
  },
  packageGroupHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.overlay,
  },
  packageGroupHeaderContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  packageGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  packageGroupAddress: {
    flex: 1,
    flexShrink: 1,
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  packageGroupMetaRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  packageGroupCount: {
    color: Colors.gold[400],
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  savedInfoIndicator: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.successBg,
  },
  savedInfoIndicatorText: {
    color: Colors.success,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  packageGroupActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  groupHeaderAction: {
    minHeight: 40,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    backgroundColor: Colors.background,
  },
  groupHeaderActionText: {
    color: Colors.gold[400],
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  packageRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  packageSelectionArea: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  packageOccurrenceAction: {
    minWidth: 68,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.errorBg,
  },
  packageOccurrenceActionDisabled: {
    opacity: 0.35,
  },
  packageOccurrenceActionText: {
    color: Colors.error,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  packageRowSeparated: {
    borderColor: Colors.successBorder,
    backgroundColor: Colors.successBg,
  },
  packageRowCompleted: {
    opacity: 0.62,
  },
  checkbox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.gray,
  },
  checkboxSelected: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  packageRowContent: {
    flex: 1,
    gap: 2,
  },
  packageTracking: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  packageAddress: {
    color: Colors.gray,
    fontSize: FontSizes.sm,
  },
  separatedLabel: {
    color: Colors.gray,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  separatedLabelActive: {
    color: Colors.success,
  },
  packageOccurrenceLabel: {
    color: Colors.error,
  },
  groupCompleteButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gold[500],
  },
  groupCompleteButtonText: {
    color: Colors.primary[900],
    fontSize: FontSizes.md,
    fontWeight: '900',
  },
  groupCompletedState: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    backgroundColor: Colors.successBg,
  },
  groupCompletedStateText: {
    color: Colors.success,
    fontSize: FontSizes.md,
    fontWeight: '800',
  },
  groupOccurrenceButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  groupOccurrenceButtonText: {
    color: Colors.error,
    fontSize: FontSizes.md,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 64,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonGradient: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.primary[900],
    fontSize: FontSizes.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButton: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  secondaryButtonText: {
    color: Colors.gold[400],
    fontSize: FontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
});
