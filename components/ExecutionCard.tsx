import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Building2, Check, MapPin, Navigation, Package } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import type { ExecutionStep } from '@/lib/executionState';
import type { GroupedStop, PackageItem } from '@/lib/packageUtils';
import {
  buildExecutionPackageGroups,
  summarizePackageGroups,
} from '@/lib/executionPresentation';

export interface ExecutionCardProps {
  currentStop: GroupedStop | null;
  totalPackagesAtCurrentStop: number;
  pendingPackagesAtCurrentStop: PackageItem[];
  executionStep: ExecutionStep;
  onConfirmPickup: () => void;
  onConfirmDelivery: () => void;
  onNavigate: () => void;
  onOccurrence: () => void;
  separatedPackageIds: ReadonlySet<string>;
  onTogglePackageSeparated: (packageId: string) => void;
  onToggleSelectAll: () => void;
  showNavigate?: boolean;
}

const DELIVERY_TYPES = ['Portaria', 'Condomínio', 'Endereço comum'] as const;

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
  onOccurrence,
  separatedPackageIds,
  onTogglePackageSeparated,
  onToggleSelectAll,
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
  const groupSummary = summarizePackageGroups(packageGroups);
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
        <Text style={styles.address}>{currentStop.normalizedAddress}</Text>
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

      {isPickup ? (
        <View style={styles.collectionSection}>
          <View style={styles.collectionHeader}>
            <View>
              <Text style={styles.collectionTitle}>Conferidos</Text>
              <Text style={styles.collectionCount}>
                {separatedPackagesCount} / {totalPackagesAtCurrentStop}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={onToggleSelectAll}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={pickupComplete ? 'Limpar seleção' : 'Selecionar tudo'}
            >
              <Text style={styles.selectAllButtonText}>
                {pickupComplete ? 'Limpar seleção' : 'Selecionar tudo'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.packageRows}>
            {packageGroups.map(group => (
              <View key={group.key} style={styles.packageGroup}>
                <View style={styles.packageGroupHeader}>
                  <MapPin size={16} color={Colors.gold[400]} />
                  <Text style={styles.packageGroupAddress} numberOfLines={2}>
                    {group.address}
                  </Text>
                  <Text style={styles.packageGroupCount}>
                    {group.packages.length}{' '}
                    {group.packages.length === 1 ? 'pacote' : 'pacotes'}
                  </Text>
                </View>

                {group.packages.map(pkg => {
                  const separated = separatedPackageIds.has(pkg.id);
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.packageRow, separated && styles.packageRowSeparated]}
                      onPress={() => onTogglePackageSeparated(pkg.id)}
                      activeOpacity={0.78}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: separated }}
                      accessibilityLabel={`${pkg.trackingNumber}, ${separated ? 'separado' : 'não separado'}`}
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
                      <Text style={[styles.separatedLabel, separated && styles.separatedLabelActive]}>
                        Separado
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.deliveryTypeSection}>
        <View style={styles.deliveryTypeTitleRow}>
          <Building2 size={17} color={Colors.gold[400]} />
          <Text style={styles.deliveryTypeTitle}>Tipo de entrega</Text>
        </View>
        <View style={styles.deliveryTypes}>
          {DELIVERY_TYPES.map((type, index) => (
            <View
              key={type}
              style={[styles.deliveryTypeBadge, index === 0 && styles.deliveryTypeBadgePrimary]}
            >
              <Text
                style={[
                  styles.deliveryTypeBadgeText,
                  index === 0 && styles.deliveryTypeBadgeTextPrimary,
                ]}
              >
                {type}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, primaryDisabled && styles.primaryButtonDisabled]}
        onPress={isPickup ? onConfirmPickup : onConfirmDelivery}
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

      <View style={styles.secondaryActions}>
        {showNavigate ? (
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
        ) : null}

        <TouchableOpacity
          style={[styles.secondaryButton, styles.occurrenceButton]}
          onPress={onOccurrence}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Registrar ocorrência"
        >
          <AlertCircle size={20} color={Colors.error} />
          <Text style={[styles.secondaryButtonText, styles.occurrenceButtonText]}>
            Registrar ocorrência
          </Text>
        </TouchableOpacity>
      </View>
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
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    lineHeight: 30,
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
  selectAllButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  selectAllButtonText: {
    color: Colors.gold[400],
    fontSize: FontSizes.md,
    fontWeight: '800',
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
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.overlay,
  },
  packageGroupAddress: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  packageGroupCount: {
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
  packageRowSeparated: {
    borderColor: Colors.successBorder,
    backgroundColor: Colors.successBg,
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
  deliveryTypeSection: {
    gap: Spacing.sm,
  },
  deliveryTypeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deliveryTypeTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  deliveryTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  deliveryTypeBadge: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  deliveryTypeBadgePrimary: {
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  deliveryTypeBadgeText: {
    color: Colors.gray,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  deliveryTypeBadgeTextPrimary: {
    color: Colors.gold[400],
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
  occurrenceButton: {
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  secondaryButtonText: {
    color: Colors.gold[400],
    fontSize: FontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  occurrenceButtonText: {
    color: Colors.error,
  },
});
