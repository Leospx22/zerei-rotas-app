import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MapPin,
  Package,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  SkipForward,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { ExecutionCard } from '@/components/ExecutionCard';
import {
  PlaceInfoEditorModal,
  type PlaceInfoDraft,
} from '@/components/PlaceInfoEditorModal';
import { AppCard, AppText } from '@/components/ui';
import { useRoute } from '@/contexts/RouteContext';
import { deriveExecutionState, type ExecutionStep } from '@/lib/executionState';
import {
  buildExecutionPackageGroups,
  getPendingPackageIdsForGroup,
  type ExecutionPackageGroup,
} from '@/lib/executionPresentation';
import { buildGoogleMapsSearchUrl } from '@/lib/mapNavigation';
import {
  applyOccurrenceReasonToTarget,
  createDirectOccurrenceTarget,
  getAddressGroupOccurrenceAction,
  type OccurrenceTarget,
} from '@/lib/occurrenceFlow';
import { SHOPEE_OCCURRENCE_REASONS } from '@/lib/occurrenceReasons';
import {
  collectRouteOccurrenceRecords,
  partitionOccurrenceRecords,
} from '@/lib/occurrenceRecords';
import {
  togglePackageGroupSelection,
  togglePackageSelection,
} from '@/lib/packageSelection';
import {
  getPackagePrimaryLabel,
  getPackageSecondaryLabel,
} from '@/lib/packageUtils';
import {
  buildDuplicateAddressWarnings,
  buildDisplayedRoutePositionMap,
  formatRouteOrderBadge,
} from '@/lib/routeStopPresentation';
import {
  deletePlaceInfo,
  loadPlaceInfo,
  savePlaceInfo,
  type PlaceInfo,
} from '@/lib/placeIntelligence';

const NOOP = () => {};

interface OccurrenceSheetProps {
  visible: boolean;
  onSelect: (reason: string) => void;
  onClose: () => void;
}

function OccurrenceSheet({ visible, onSelect, onClose }: OccurrenceSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheet.backdrop} onPress={onClose} />
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>Selecionar ocorrência</Text>
        {SHOPEE_OCCURRENCE_REASONS.map(option => (
          <TouchableOpacity
            key={option}
            style={sheet.option}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
          >
            <XCircle size={16} color={Colors.error} />
            <Text style={sheet.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={sheet.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={sheet.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function RouteExecutionScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const {
    currentRoute,
    updateStopStatus,
    updatePackageStatus,
    updatePackagesStatus,
    updatePackageOccurrence,
    occurrences,
  } = useRoute();
  const executionScrollRef = React.useRef<ScrollView>(null);
  const stopOffsetsRef = React.useRef<Record<string, number>>({});
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [occurrenceTarget, setOccurrenceTarget] = useState<OccurrenceTarget | null>(null);
  const [occurrencePackageFilter, setOccurrencePackageFilter] = useState<Set<string> | null>(null);
  const derivedExecutionState = React.useMemo(
    () => deriveExecutionState(currentRoute),
    [currentRoute]
  );
  const displayedPositions = React.useMemo(
    () => currentRoute ? buildDisplayedRoutePositionMap(currentRoute.stops) : {},
    [currentRoute]
  );
  const duplicateWarnings = React.useMemo(
    () => currentRoute ? buildDuplicateAddressWarnings(currentRoute.stops) : {},
    [currentRoute]
  );
  const currentOccurrenceCount = React.useMemo(
    () => {
      const sections = partitionOccurrenceRecords(
        collectRouteOccurrenceRecords(currentRoute)
      );
      return sections.pending.length + sections.resolvedRecently.length;
    },
    [currentRoute]
  );
  const [executionStep, setExecutionStep] = useState<ExecutionStep>(
    derivedExecutionState.executionStep
  );
  const [separatedPackageIds, setSeparatedPackageIds] = useState<Set<string>>(
    () => new Set()
  );
  const [completionFeedback, setCompletionFeedback] = useState<{
    id: number;
    hasNextStop: boolean;
  } | null>(null);
  const [placeInfoByAddressKey, setPlaceInfoByAddressKey] = useState<
    Record<string, PlaceInfo | null>
  >({});
  const [editingPlaceGroup, setEditingPlaceGroup] = useState<
    Pick<ExecutionPackageGroup, 'key' | 'address'> | null
  >(null);
  const [placeInfoSaving, setPlaceInfoSaving] = useState(false);
  const {
    currentStop,
    nextStop,
    totalPackagesAtCurrentStop,
    pendingPackagesAtCurrentStop,
    deliveredPackagesCount,
    totalPackagesCount,
    remainingStopsCount,
  } = derivedExecutionState;
  const placeAddressGroups = React.useMemo(
    () => buildExecutionPackageGroups(currentStop).map(({ key, address }) => ({ key, address })),
    [currentStop?.id]
  );
  const cameFromDeliveryPreparation = from === 'delivery-preparation';

  React.useEffect(() => {
    setExecutionStep(derivedExecutionState.executionStep);
    setSeparatedPackageIds(new Set());
    setEditingPlaceGroup(null);
    setOccurrencePackageFilter(null);
  }, [currentStop?.id]);

  React.useEffect(() => {
    let active = true;
    if (placeAddressGroups.length === 0) {
      setPlaceInfoByAddressKey({});
      return () => {
        active = false;
      };
    }

    setPlaceInfoByAddressKey({});
    Promise.all(
      placeAddressGroups.map(async group => {
        const info = await loadPlaceInfo(group.address).catch(() => null);
        return [group.key, info] as const;
      })
    ).then(entries => {
      if (active) {
        setPlaceInfoByAddressKey(Object.fromEntries(entries));
      }
    }).catch(() => {
      if (active) {
        setPlaceInfoByAddressKey({});
      }
    });

    return () => {
      active = false;
    };
  }, [placeAddressGroups]);

  React.useEffect(() => {
    if (!completionFeedback) return;
    const timer = setTimeout(() => setCompletionFeedback(null), 1600);
    return () => clearTimeout(timer);
  }, [completionFeedback]);

  React.useEffect(() => {
    if (currentRoute?.status === 'completed') {
      router.replace('/(tabs)/routes/route-completed');
    }
  }, [currentRoute?.status]);

  const handleOccurrenceSelect = useCallback((reason: string) => {
    if (!occurrenceTarget) return;
    applyOccurrenceReasonToTarget(occurrenceTarget, reason, updatePackageOccurrence);
    setOccurrenceTarget(null);
  }, [occurrenceTarget, updatePackageOccurrence]);

  const handleConfirmPickup = useCallback(() => {
    if (
      !currentStop ||
      separatedPackageIds.size !== currentStop.packages.length
    ) {
      return;
    }
    setExecutionStep('entrega');
  }, [currentStop, separatedPackageIds]);

  const handleTogglePackageSeparated = useCallback((packageId: string) => {
    setSeparatedPackageIds(previous =>
      togglePackageSelection(previous, packageId)
    );
  }, []);

  const handleToggleAddressGroupSeparated = useCallback((packageIds: readonly string[]) => {
    setSeparatedPackageIds(previous =>
      togglePackageGroupSelection(previous, packageIds)
    );
  }, []);

  const handleConfirmDelivery = useCallback(() => {
    if (!currentStop) return;

    const pendingPackages = currentStop.packages.filter(pkg => pkg.status === 'pending');
    const occurrencePackages = currentStop.packages.filter(pkg => pkg.status === 'skipped');
    const hasMixedPendingPackages =
      pendingPackages.length > 0 &&
      pendingPackages.length < currentStop.packages.length;

    const completeStop = () => {
      if (occurrencePackages.length > 0) {
        pendingPackages.forEach(pkg => {
          updatePackageStatus(currentStop.id, pkg.id, 'delivered');
        });
      } else {
        updateStopStatus(currentStop.id, 'completed');
      }

      setExecutionStep('separacao');
      setSeparatedPackageIds(new Set());
      setCompletionFeedback({
        id: Date.now(),
        hasNextStop: nextStop !== null,
      });
    };

    if (hasMixedPendingPackages) {
      Alert.alert(
        'Pacotes pendentes',
        `Ainda há ${pendingPackages.length} pacote${pendingPackages.length === 1 ? '' : 's'} pendente${pendingPackages.length === 1 ? '' : 's'} nesta parada. Deseja concluir mesmo assim?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Concluir parada', onPress: completeStop },
        ]
      );
      return;
    }

    completeStop();
  }, [currentStop, nextStop, updatePackageStatus, updateStopStatus]);

  const scrollToOccurrenceControls = useCallback((stopId: string) => {
    requestAnimationFrame(() => {
      const stopOffset = stopOffsetsRef.current[stopId];
      if (stopOffset === undefined) return;
      executionScrollRef.current?.scrollTo({
        y: Math.max(0, stopOffset - Spacing.md),
        animated: true,
      });
    });
  }, []);

  const handleAddressGroupOccurrence = useCallback((group: ExecutionPackageGroup) => {
    if (!currentStop) return;
    const action = getAddressGroupOccurrenceAction(
      currentStop.id,
      group.packages,
      separatedPackageIds
    );

    if (action.kind === 'direct') {
      setOccurrencePackageFilter(null);
      setOccurrenceTarget(action.target);
      return;
    }

    if (action.kind === 'select') {
      setOccurrenceTarget(null);
      setOccurrencePackageFilter(new Set(action.packageIds));
      setExpandedStop(currentStop.id);
      scrollToOccurrenceControls(currentStop.id);
      return;
    }

    Alert.alert('Nenhum pacote pendente neste endereço.');
  }, [currentStop, scrollToOccurrenceControls, separatedPackageIds]);

  const handlePackageOccurrence = useCallback((packageId: string) => {
    if (!currentStop) return;
    const packageItem = currentStop.packages.find(pkg => pkg.id === packageId);
    if (!packageItem) return;
    const target = createDirectOccurrenceTarget(currentStop.id, packageItem);
    if (target) {
      setOccurrenceTarget({ stopId: target.stopId, packageIds: [target.pkgId] });
    }
  }, [currentStop]);

  const handleNavigateAddress = useCallback(async (address: string) => {
    try {
      const url = buildGoogleMapsSearchUrl(address);
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Unsupported map URL');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir o mapa.');
    }
  }, []);

  const handleConfirmAddressGroup = useCallback((group: ExecutionPackageGroup) => {
    if (!currentStop || executionStep !== 'entrega') return;

    const pendingPackageIds = getPendingPackageIdsForGroup(group);
    if (pendingPackageIds.length === 0) return;

    const groupPackageIds = new Set(group.packages.map(pkg => pkg.id));
    const hasPendingOutsideGroup = currentStop.packages.some(
      pkg => pkg.status === 'pending' && !groupPackageIds.has(pkg.id)
    );

    updatePackagesStatus(currentStop.id, pendingPackageIds, 'delivered');

    if (!hasPendingOutsideGroup) {
      setExecutionStep('separacao');
      setSeparatedPackageIds(new Set());
      setCompletionFeedback({
        id: Date.now(),
        hasNextStop: nextStop !== null,
      });
    }
  }, [currentStop, executionStep, nextStop, updatePackagesStatus]);

  const handleSavePlaceInfo = useCallback(async (draft: PlaceInfoDraft) => {
    if (!editingPlaceGroup) return;
    const targetGroup = editingPlaceGroup;
    setPlaceInfoSaving(true);
    try {
      await savePlaceInfo({
        normalizedAddress: targetGroup.address,
        deliveryType: draft.deliveryType,
        parkingNote: draft.parkingNote.trim() || undefined,
        accessNote: draft.accessNote.trim() || undefined,
        deliveryNote: draft.deliveryNote.trim() || undefined,
        localTip: draft.localTip.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      const savedPlace = await loadPlaceInfo(targetGroup.address);
      setPlaceInfoByAddressKey(previous => ({
        ...previous,
        [targetGroup.key]: savedPlace,
      }));
      setEditingPlaceGroup(null);
    } catch {
      Alert.alert(
        'Não foi possível salvar',
        'Tente novamente. As informações da rota não foram alteradas.'
      );
    } finally {
      setPlaceInfoSaving(false);
    }
  }, [editingPlaceGroup]);

  const handleDeletePlaceInfo = useCallback(async () => {
    if (!editingPlaceGroup) return;
    const targetGroup = editingPlaceGroup;
    setPlaceInfoSaving(true);
    try {
      await deletePlaceInfo(targetGroup.address);
      setPlaceInfoByAddressKey(previous => ({
        ...previous,
        [targetGroup.key]: null,
      }));
      setEditingPlaceGroup(null);
    } catch {
      Alert.alert(
        'Não foi possível apagar',
        'Tente novamente. As informações deste local continuam salvas.'
      );
    } finally {
      setPlaceInfoSaving(false);
    }
  }, [editingPlaceGroup]);

  if (!currentRoute) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhuma rota ativa</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/routes')}>
          <Text style={styles.emptyLink}>Voltar para Minhas Rotas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalStops = currentRoute.stops.length;
  const completedStops = currentRoute.completedStops;
  const totalPackages = currentRoute.totalPackages;
  const deliveredPackages = currentRoute.deliveredPackages;
  const packageProgress = totalPackages > 0 ? (deliveredPackages / totalPackages) * 100 : 0;
  const stopProgress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  // Only show distance if it was explicitly set (not estimated from stop count)
  const hasRealDistance = currentRoute.estimatedDistanceKm > 0;

  return (
    <>
      <ScrollView
        ref={executionScrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (cameFromDeliveryPreparation) {
                router.replace('/(tabs)/routes/delivery-preparation');
              } else {
                router.back();
              }
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <HeaderBrandIcon size={20} />
            <Text style={styles.headerTitle}>Executar Rota</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.routeNameContext}>
          <Text style={styles.routeNameContextLabel}>Rota:</Text>
          <Text style={styles.routeNameContextValue} numberOfLines={1}>
            {currentRoute.name?.trim() || 'Rota atual'}
          </Text>
        </View>

        {completionFeedback ? (
          <AppCard variant="success" padding="medium" style={styles.completionFeedback}>
            <CheckCircle2 size={24} color={Colors.success} />
            <View style={styles.completionFeedbackText}>
              <AppText variant="bodyStrong" color={Colors.success}>
                Parada concluída
              </AppText>
              {completionFeedback.hasNextStop ? (
                <AppText variant="label" color={Colors.gray}>
                  Próxima parada pronta
                </AppText>
              ) : null}
            </View>
          </AppCard>
        ) : null}

        <View style={styles.executionCardWrap}>
          <ExecutionCard
            currentStop={currentStop}
            totalPackagesAtCurrentStop={totalPackagesAtCurrentStop}
            pendingPackagesAtCurrentStop={pendingPackagesAtCurrentStop}
            executionStep={executionStep}
            onConfirmPickup={handleConfirmPickup}
            onConfirmDelivery={handleConfirmDelivery}
            onNavigate={NOOP}
            onAddressGroupOccurrence={handleAddressGroupOccurrence}
            onPackageOccurrence={handlePackageOccurrence}
            separatedPackageIds={separatedPackageIds}
            onTogglePackageSeparated={handleTogglePackageSeparated}
            onToggleAddressGroupSeparated={handleToggleAddressGroupSeparated}
            placeInfoByAddressKey={placeInfoByAddressKey}
            onEditPlaceInfo={setEditingPlaceGroup}
            onNavigateAddress={handleNavigateAddress}
            onConfirmAddressGroup={handleConfirmAddressGroup}
            showNavigate={false}
          />
        </View>

        {currentOccurrenceCount > 0 ? (
          <TouchableOpacity
            style={styles.viewOccurrencesButton}
            onPress={() => router.push('/(tabs)/occurrences')}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel="Ver ocorrências"
          >
            <AlertCircle size={17} color={Colors.error} />
            <Text style={styles.viewOccurrencesText}>
              Ver ocorrências ({currentOccurrenceCount})
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.progressCard}>
          <LinearGradient
            colors={[Colors.primary[500], Colors.primary[700]]}
            style={styles.progressGradient}
          >
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>{currentRoute.name}</Text>
              <Text style={styles.progressCount}>
                {completedStops}/{totalStops} paradas
              </Text>
            </View>

            <Text style={styles.progressLabel}>Paradas concluídas</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${stopProgress}%`, backgroundColor: Colors.gold[500] }]} />
            </View>

            <Text style={styles.progressLabel}>Pacotes entregues</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${packageProgress}%`, backgroundColor: Colors.success }]} />
            </View>

            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Package size={14} color={Colors.gold[400]} />
                <Text style={styles.progressStatText}>
                  {deliveredPackages}/{totalPackages} pacotes
                </Text>
              </View>
              <View style={styles.progressStat}>
                <MapPin size={14} color={Colors.gold[400]} />
                <Text style={styles.progressStatText}>
                  {hasRealDistance ? `${currentRoute.estimatedDistanceKm} km` : 'Distância não calculada'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>Lista de Paradas</Text>

        {currentRoute.stops.map((stop, stopIndex) => {
          const isExpanded = expandedStop === stop.id;
          const stopDelivered = stop.packages.filter(p => p.status === 'delivered').length;
          const stopOccurrenceCount = stop.packages.filter(p => p.status === 'skipped').length;
          const activeOccurrenceFilter =
            stop.id === currentStop?.id ? occurrencePackageFilter : null;
          const stopBadge = displayedPositions[stop.id]?.badge ?? formatRouteOrderBadge(stop, stopIndex + 1);
          const duplicateWarning = duplicateWarnings[stop.id] ?? null;

          return (
            <View
              key={stop.id}
              style={styles.stopCard}
              onLayout={event => {
                stopOffsetsRef.current[stop.id] = event.nativeEvent.layout.y;
              }}
            >
              {/* Only the header dims when the stop is done — the expand button and
                  package list stay at full opacity so TouchableOpacity press events
                  always dispatch correctly regardless of stop status */}
              <View style={[styles.stopHeader, stop.status !== 'pending' && styles.stopHeaderDone]}>
                <View style={styles.stopNumberColumn}>
                  <View
                    style={[
                      styles.stopNumber,
                      stop.status === 'completed' && styles.stopNumberCompleted,
                      stop.status === 'skipped' && styles.stopNumberSkipped,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stopNumberText,
                        stop.status !== 'pending' && styles.stopNumberTextDone,
                      ]}
                    >
                      {stopBadge}
                    </Text>
                  </View>
                  {stop.optimizedOrderIndex !== undefined &&
                    stop.optimizedOrderIndex !== null &&
                    stop.status === 'pending' && (
                      <View style={styles.optimizedBadge}>
                        <Text style={styles.optimizedBadgeText}>#{stop.optimizedOrderIndex}</Text>
                      </View>
                    )}
                </View>

                <View style={styles.stopContent}>
                  <Text
                    style={[styles.stopAddress, stop.status !== 'pending' && styles.stopAddressDone]}
                    numberOfLines={2}
                  >
                    {stop.normalizedAddress}
                  </Text>
                  <View style={styles.stopMetaRow}>
                    <Text style={styles.stopMeta}>
                      {stopDelivered}/{stop.packageCount} pacote{stop.packageCount !== 1 ? 's' : ''}
                    </Text>
                    {stopOccurrenceCount > 0 && (
                      <View style={styles.occurrenceBadge}>
                        <XCircle size={10} color={Colors.error} />
                        <Text style={styles.occurrenceBadgeText}>
                          {stopOccurrenceCount} ocorrência{stopOccurrenceCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                    {duplicateWarning && stop.status === 'pending' && (
                      <View style={styles.warnBadge}>
                        <AlertTriangle size={10} color={Colors.warning} />
                        <Text style={styles.warnBadgeText}>{duplicateWarning}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {stop.status === 'completed' && <CheckCircle2 size={24} color={Colors.success} />}
                {stop.status === 'skipped' && <SkipForward size={20} color={Colors.gray} />}
              </View>

              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => {
                  setOccurrencePackageFilter(null);
                  setExpandedStop(isExpanded ? null : stop.id);
                }}
              >
                {isExpanded ? (
                  <ChevronUp size={16} color={Colors.gold[400]} />
                ) : (
                  <ChevronDown size={16} color={Colors.gold[400]} />
                )}
                <Text style={styles.expandText}>
                  {isExpanded
                    ? 'Ocultar pacotes'
                    : `Ver ${stop.packageCount} pacote${stop.packageCount !== 1 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.packagesList}>
                  {/* Column labels */}
                  <View style={styles.pkgColHeaderRow}>
                    <Text style={styles.pkgColHeaderMain}>Pacote / Endereço</Text>
                    <Text style={[styles.pkgColHeaderAction, { color: Colors.success }]}>Entregue</Text>
                    <Text style={[styles.pkgColHeaderAction, { color: Colors.error }]}>Ocorrência</Text>
                  </View>

                  {stop.addressGroups.map((ag, addrIdx) => {
                    const visiblePackageIds = activeOccurrenceFilter
                      ? ag.packageIds.filter(packageId => activeOccurrenceFilter.has(packageId))
                      : ag.packageIds;

                    if (visiblePackageIds.length === 0) return null;

                    return (
                    <View key={addrIdx} style={styles.addressGroup}>
                      <View style={styles.addressGroupHeader}>
                        <MapPin size={12} color={Colors.primary[200]} />
                        <Text style={styles.addressGroupText} numberOfLines={2}>
                          {ag.normalizedAddress}
                        </Text>
                        <Text style={styles.addressGroupCount}>{visiblePackageIds.length} pkg</Text>
                      </View>

                      {stop.packages
                        .filter(p => visiblePackageIds.includes(p.id))
                        .map(pkg => {
                          const isDelivered = pkg.status === 'delivered';
                          const isOccurrence = pkg.status === 'skipped';
                          const occurrenceReason = pkg.occurrenceReason ?? occurrences[pkg.id];

                          return (
                            <View key={pkg.id} style={styles.packageRow}>
                              <View style={styles.packageInfo}>
                                <View style={styles.packageTrackingRow}>
                                  <Package size={12} color={Colors.gold[400]} />
                                  <Text
                                    style={[
                                      styles.packageTracking,
                                      isDelivered && styles.packageTrackingDelivered,
                                      isOccurrence && styles.packageTrackingOccurrence,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {getPackagePrimaryLabel(pkg)}
                                  </Text>
                                </View>
                                {getPackageSecondaryLabel(pkg) ? (
                                  <Text style={styles.packageSecondary} numberOfLines={1}>
                                    {getPackageSecondaryLabel(pkg)}
                                  </Text>
                                ) : null}
                                <Text style={styles.packageAddress} numberOfLines={1}>
                                  {pkg.destinationAddress}
                                </Text>
                                {isOccurrence && occurrenceReason ? (
                                  <Text style={styles.occurrenceReason}>{occurrenceReason}</Text>
                                ) : null}
                              </View>

                              {/* Entregue button
                                  Pending  → tap → Entregue
                                  Entregue → tap → Pending
                                  Disabled when Ocorrência is active */}
                              <TouchableOpacity
                                style={[
                                  styles.actionBtn,
                                  isDelivered && styles.actionBtnActiveGreen,
                                ]}
                                onPress={() => {
                                  if (isOccurrence) return;
                                  updatePackageStatus(
                                    stop.id,
                                    pkg.id,
                                    isDelivered ? 'pending' : 'delivered'
                                  );
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                                activeOpacity={0.7}
                              >
                                <CheckCircle2
                                  size={26}
                                  color={
                                    isDelivered
                                      ? Colors.success
                                      : isOccurrence
                                      ? Colors.cardBorder
                                      : Colors.gray
                                  }
                                />
                              </TouchableOpacity>

                              {/* Ocorrência button
                                  Pending    → tap → open selector → Ocorrência
                                  Ocorrência → tap → Pending (clears reason)
                                  Disabled when Entregue is active */}
                              <TouchableOpacity
                                style={[
                                  styles.actionBtn,
                                  isOccurrence && styles.actionBtnActiveRed,
                                ]}
                                onPress={() => {
                                  if (isDelivered) return;
                                  if (isOccurrence) {
                                    updatePackageStatus(stop.id, pkg.id, 'pending');
                                  } else {
                                    setOccurrenceTarget({ stopId: stop.id, packageIds: [pkg.id] });
                                  }
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                                activeOpacity={0.7}
                              >
                                <XCircle
                                  size={26}
                                  color={
                                    isOccurrence
                                      ? Colors.error
                                      : isDelivered
                                      ? Colors.cardBorder
                                      : Colors.gray
                                  }
                                />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                    </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <OccurrenceSheet
        visible={occurrenceTarget !== null}
        onSelect={handleOccurrenceSelect}
        onClose={() => setOccurrenceTarget(null)}
      />
      <PlaceInfoEditorModal
        visible={editingPlaceGroup !== null}
        address={editingPlaceGroup?.address ?? ''}
        initialPlaceInfo={
          editingPlaceGroup
            ? placeInfoByAddressKey[editingPlaceGroup.key] ?? null
            : null
        }
        saving={placeInfoSaving}
        onClose={() => setEditingPlaceGroup(null)}
        onSave={handleSavePlaceInfo}
        onDelete={handleDeletePlaceInfo}
      />
    </>
  );
}

const ACTION_COL_WIDTH = 56;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  completionFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  completionFeedbackText: { flex: 1, gap: 2 },
  executionCardWrap: { marginBottom: Spacing.lg },
  viewOccurrencesButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  viewOccurrencesText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: '800' },
  emptyContainer: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },
  emptyText: { fontSize: FontSizes.lg, color: Colors.gray },
  emptyLink: { fontSize: FontSizes.md, color: Colors.gold[400], fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.lg,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.white },
  routeNameContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  routeNameContextLabel: { fontSize: FontSizes.sm, color: Colors.gray, fontWeight: '600' },
  routeNameContextValue: { flex: 1, fontSize: FontSizes.md, color: Colors.offWhite, fontWeight: '700' },
  progressCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  progressGradient: { padding: Spacing.lg, gap: Spacing.sm },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  progressTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white, flex: 1 },
  progressCount: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.gold[400] },
  progressLabel: { fontSize: FontSizes.xs, color: Colors.gray, fontWeight: '600', marginTop: 2 },
  progressBarBg: { height: 7, backgroundColor: Colors.primary[800], borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressStats: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  progressStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressStatText: { fontSize: FontSizes.sm, color: Colors.gold[400], fontWeight: '600' },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white, marginBottom: Spacing.md },
  stopCard: {
    backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  stopHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  stopHeaderDone: { opacity: 0.55 },
  stopNumberColumn: { alignItems: 'center', gap: 3 },
  stopNumber: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary[500], alignItems: 'center', justifyContent: 'center',
  },
  stopNumberCompleted: { backgroundColor: Colors.successBorder },
  stopNumberSkipped: { backgroundColor: 'rgba(140,155,171,0.2)' },
  stopNumberText: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.gold[400] },
  stopNumberTextDone: { color: Colors.gray },
  optimizedBadge: {
    marginTop: 2, paddingHorizontal: 5, paddingVertical: 2,
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  optimizedBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.success },
  stopContent: { flex: 1 },
  stopAddress: { fontSize: FontSizes.md, color: Colors.white, fontWeight: '500' },
  stopAddressDone: { textDecorationLine: 'line-through', color: Colors.gray },
  stopMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2, flexWrap: 'wrap' },
  stopMeta: { fontSize: FontSizes.sm, color: Colors.gray },
  occurrenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.errorBg, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: Colors.errorBorder,
  },
  occurrenceBadgeText: { fontSize: FontSizes.xs, color: Colors.error, fontWeight: '600' },
  warnBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.warningBg, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: Colors.warningBorder,
  },
  warnBadgeText: { fontSize: FontSizes.xs, color: Colors.warning, fontWeight: '600' },
  expandButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm, gap: 4,
    borderTopWidth: 1, borderTopColor: Colors.cardBorder,
  },
  expandText: { fontSize: FontSizes.sm, color: Colors.gold[400], fontWeight: '600' },
  packagesList: {
    borderTopWidth: 1, borderTopColor: Colors.cardBorder,
    padding: Spacing.md, backgroundColor: 'rgba(3,13,66,0.4)', gap: Spacing.sm,
  },

  // Column header row — widths match action buttons exactly
  pkgColHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: Spacing.xs, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  pkgColHeaderMain: { flex: 1, fontSize: FontSizes.xs, color: Colors.gray, fontWeight: '700' },
  pkgColHeaderAction: {
    width: ACTION_COL_WIDTH,
    textAlign: 'center',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },

  addressGroup: {
    backgroundColor: 'rgba(10,37,114,0.3)', borderRadius: BorderRadius.sm,
    padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(28,45,74,0.8)', gap: 2,
  },
  addressGroupHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 5, paddingBottom: 4, marginBottom: 2,
    borderBottomWidth: 1, borderBottomColor: 'rgba(28,45,74,0.8)',
  },
  addressGroupText: { flex: 1, fontSize: FontSizes.xs, fontWeight: '600', color: Colors.primary[200] },
  addressGroupCount: { fontSize: FontSizes.xs, color: Colors.gray, fontWeight: '600' },

  // Package row
  packageRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(28,45,74,0.4)',
    gap: Spacing.sm,
  },
  packageInfo: { flex: 1, gap: 2, paddingRight: Spacing.xs },
  packageTrackingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  packageTracking: { flex: 1, fontSize: FontSizes.sm, fontWeight: '600', color: Colors.white },
  packageSecondary: { fontSize: 11, color: Colors.gray, marginLeft: 17, fontWeight: '600' },
  packageTrackingDelivered: { color: Colors.success, textDecorationLine: 'line-through' },
  packageTrackingOccurrence: { color: Colors.error, textDecorationLine: 'line-through' },
  packageAddress: { fontSize: 11, color: Colors.gray, marginLeft: 17 },
  occurrenceReason: { fontSize: 11, color: Colors.error, fontWeight: '500', marginLeft: 17 },

  // Action buttons — fixed width matches column headers, large tap target
  actionBtn: {
    width: ACTION_COL_WIDTH,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  actionBtnActiveGreen: {
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  actionBtnActiveRed: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
});

const sheet = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.cardBorder,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.cardBorder,
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xl, fontWeight: '700', color: Colors.white,
    marginBottom: Spacing.sm,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  optionText: { fontSize: FontSizes.lg, color: Colors.white, fontWeight: '500' },
  cancelBtn: {
    alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm,
  },
  cancelText: { fontSize: FontSizes.lg, color: Colors.gray, fontWeight: '600' },
});
