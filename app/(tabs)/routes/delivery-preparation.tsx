import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
  Play,
  Crown,
  Hash,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Navigation,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { useRoute } from '@/contexts/RouteContext';
import { getPrimaryExecutionAddress } from '@/lib/executionPresentation';
import { buildGoogleMapsSearchUrl } from '@/lib/mapNavigation';
import {
  moveRouteStop,
  moveRouteStopToIndex,
  type StopMoveDirection,
} from '@/lib/routeOrdering';

export default function DeliveryPreparationScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const {
    currentRoute,
    setCurrentRoute,
    renameCurrentRoute,
  } = useRoute();
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftRouteName, setDraftRouteName] = useState('');
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [moveStopIndex, setMoveStopIndex] = useState<number | null>(null);
  const [targetPosition, setTargetPosition] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const cameFromImportSummary = from === 'import-summary';

  if (!currentRoute) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhuma rota importada</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/routes/import')}>
          <Text style={styles.emptyLink}>Importar planilha</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleExpand = (stopId: string) => {
    setExpandedStop(prev => (prev === stopId ? null : stopId));
  };

  const toggleEditing = () => {
    if (!isEditing) {
      setDraftRouteName(currentRoute.name);
      setEditMessage(null);
    }
    setIsEditing(previous => !previous);
  };

  const saveRouteName = async () => {
    const renamed = await renameCurrentRoute(draftRouteName);
    if (renamed) setEditMessage('Nome da rota atualizado.');
  };

  const handleMoveStop = (index: number, direction: StopMoveDirection) => {
    const stops = moveRouteStop(currentRoute.stops, index, direction);
    setCurrentRoute({ ...currentRoute, stops });
  };

  const openMoveModal = (index: number) => {
    setMoveStopIndex(index);
    setTargetPosition(String(index + 1));
    setMoveError(null);
  };

  const closeMoveModal = () => {
    setMoveStopIndex(null);
    setTargetPosition('');
    setMoveError(null);
  };

  const confirmMoveStop = () => {
    if (moveStopIndex === null || !/^\d+$/.test(targetPosition.trim())) {
      setMoveError('Informe uma posição válida.');
      return;
    }

    const targetIndex = Number(targetPosition) - 1;
    if (targetIndex < 0 || targetIndex >= currentRoute.stops.length) {
      setMoveError('Informe uma posição válida.');
      return;
    }

    if (targetIndex !== moveStopIndex) {
      const stops = moveRouteStopToIndex(currentRoute.stops, moveStopIndex, targetIndex);
      setCurrentRoute({ ...currentRoute, stops });
    }
    closeMoveModal();
  };

  const handleNavigate = async (address: string) => {
    try {
      const url = buildGoogleMapsSearchUrl(address);
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Unsupported map URL');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir o mapa.');
    }
  };

  const startRoute = () => {
    setCurrentRoute({
      ...currentRoute,
      status: 'active',
      startTime: currentRoute.startTime ?? Date.now(),
    });
    router.replace({
      pathname: '/(tabs)/routes/route-execution',
      params: { from: 'delivery-preparation' },
    });
  };

  const totalPackages = currentRoute.totalPackages;
  const totalStops = currentRoute.stops.length;
  const totalAddresses = currentRoute.stops.reduce(
    (total, stop) => total + stop.addressCount,
    0
  );

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (cameFromImportSummary) {
              router.replace({
                pathname: '/(tabs)/routes/import-summary',
                params: { from: 'delivery-preparation' },
              });
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Crown size={20} color={Colors.gold[400]} />
          <Text style={styles.headerTitle}>Revisar Rota</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.primary[800]]}
        style={styles.summaryCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.summaryTitle}>Resumo da rota</Text>
        <Text style={styles.summaryRouteName}>{currentRoute.name}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Package size={18} color={Colors.gold[400]} />
            <Text style={styles.summaryValue}>{totalPackages}</Text>
            <Text style={styles.summaryLabel}>Pacotes</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Hash size={18} color={Colors.gold[400]} />
            <Text style={styles.summaryValue}>{totalStops}</Text>
            <Text style={styles.summaryLabel}>Paradas</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <MapPin size={18} color={Colors.gold[400]} />
            <Text style={styles.summaryValue}>{totalAddresses}</Text>
            <Text style={styles.summaryLabel}>Endereços</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.instructionCard}>
        <CheckCircle2 size={16} color={Colors.gold[400]} />
        <Text style={styles.instructionText}>
          Confira as paradas, os endereços agrupados e os pacotes antes de começar. Toque em uma parada para ver os códigos SPX TN.
        </Text>
      </View>

      <View style={styles.secondaryActions}>
        <AppButton
          label={isEditing ? 'Fechar edição' : 'Editar rota'}
          variant="secondary"
          leftIcon={<Pencil size={19} color={Colors.gold[400]} />}
          onPress={toggleEditing}
        />
        <AppButton
          label="Voltar para importação"
          variant="ghost"
          leftIcon={<ArrowLeft size={19} color={Colors.gray} />}
          onPress={() => router.replace('/(tabs)/routes/import')}
        />
      </View>

      {isEditing ? (
        <AppCard variant="elevated" padding="medium" style={styles.editCard}>
          <AppText variant="sectionTitle">Ajustes da rota</AppText>
          <AppText variant="label" color={Colors.gray}>Nome da rota</AppText>
          <TextInput
            style={styles.routeNameInput}
            value={draftRouteName}
            onChangeText={setDraftRouteName}
            placeholder="Nome da rota"
            placeholderTextColor={Colors.gray}
            returnKeyType="done"
            onSubmitEditing={saveRouteName}
          />
          <AppButton
            label="Salvar nome"
            variant="secondary"
            onPress={saveRouteName}
            disabled={!draftRouteName.trim()}
          />
          {editMessage ? (
            <AppText variant="label" color={Colors.success}>
              {editMessage}
            </AppText>
          ) : null}
        </AppCard>
      ) : null}

      <Text style={styles.sectionTitle}>Paradas ({totalStops})</Text>

      {currentRoute.stops.map((stop, index) => {
        const isExpanded = expandedStop === stop.id;
        const mainAddress = getPrimaryExecutionAddress(stop);
        const isFirstStop = index === 0;
        const isLastStop = index === currentRoute.stops.length - 1;

        return (
          <View key={stop.id} style={styles.stopCard}>
            <TouchableOpacity
              style={styles.stopHeader}
              onPress={() => toggleExpand(stop.id)}
              activeOpacity={0.7}
            >
              <View style={styles.stopNumberWrap}>
                <View style={styles.stopNumberCircle}>
                  <Text style={styles.stopNumberText}>#{index + 1}</Text>
                </View>
                <Text style={styles.stopLabel}>Parada</Text>
                {stop.optimizedOrderIndex !== undefined && stop.optimizedOrderIndex !== null && (
                  <View style={styles.optimizedBadge}>
                    <Text style={styles.optimizedBadgeText}>#{stop.optimizedOrderIndex}</Text>
                  </View>
                )}
              </View>

              <View style={styles.stopInfo}>
                <Text style={styles.stopAddress} numberOfLines={2}>
                  {mainAddress}
                </Text>
                <View style={styles.stopMetaRow}>
                  <View style={styles.metaBadge}>
                    <Package size={11} color={Colors.gold[400]} />
                    <Text style={styles.metaBadgeText}>
                      {stop.packageCount} pacote{stop.packageCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.metaBadge, { backgroundColor: 'rgba(34,197,94,0.08)' }]}>
                    <MapPin size={11} color={Colors.success} />
                    <Text style={[styles.metaBadgeText, { color: Colors.success }]}>
                      {stop.addressCount} {stop.addressCount === 1 ? 'endereço' : 'endereços'}
                    </Text>
                  </View>
                  {stop.duplicateAddressWarning && (
                    <View style={[styles.metaBadge, styles.metaBadgeWarn]}>
                      <AlertTriangle size={11} color={Colors.warning} />
                      <Text style={[styles.metaBadgeText, { color: Colors.warning }]}>
                        Mesmo endereço em outra parada
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.expandControl}>
                <Text style={styles.expandHint}>{isExpanded ? 'Fechar' : 'Ver TN'}</Text>
                {isExpanded ? (
                  <ChevronUp size={18} color={Colors.gold[400]} />
                ) : (
                  <ChevronDown size={18} color={Colors.gray} />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.stopOrderActions}>
              <TouchableOpacity
                style={[styles.stopOrderButton, isFirstStop && styles.stopOrderButtonDisabled]}
                onPress={() => handleMoveStop(index, -1)}
                disabled={isFirstStop}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Subir parada ${index + 1}`}
                accessibilityState={{ disabled: isFirstStop }}
              >
                <ArrowUp size={16} color={isFirstStop ? Colors.darkGray : Colors.gold[400]} />
                <Text style={[styles.stopOrderButtonText, isFirstStop && styles.stopOrderButtonTextDisabled]}>
                  Subir
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stopOrderButton, isLastStop && styles.stopOrderButtonDisabled]}
                onPress={() => handleMoveStop(index, 1)}
                disabled={isLastStop}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Descer parada ${index + 1}`}
                accessibilityState={{ disabled: isLastStop }}
              >
                <ArrowDown size={16} color={isLastStop ? Colors.darkGray : Colors.gold[400]} />
                <Text style={[styles.stopOrderButtonText, isLastStop && styles.stopOrderButtonTextDisabled]}>
                  Descer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopOrderButton}
                onPress={() => openMoveModal(index)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Mover parada ${index + 1} para outra posição`}
              >
                <ArrowUpDown size={16} color={Colors.gold[400]} />
                <Text style={styles.stopOrderButtonText}>Mover</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stopOrderButton, styles.navigateButton]}
                onPress={() => handleNavigate(mainAddress)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Navegar para ${mainAddress}`}
              >
                <Navigation size={16} color={Colors.gold[400]} />
                <Text style={styles.stopOrderButtonText}>Navegar</Text>
              </TouchableOpacity>
            </View>

            {isExpanded && (
              <View style={styles.expandedBody}>
                <Text style={styles.expandedTitle}>
                  Códigos SPX TN — Parada {index + 1}
                </Text>

                {stop.addressGroups.map((ag, addrIdx) => (
                  <View key={addrIdx} style={styles.addressGroup}>
                    <View style={styles.addressGroupHeader}>
                      <MapPin size={13} color={Colors.primary[200]} />
                      <Text style={styles.addressGroupText} numberOfLines={2}>
                        {ag.normalizedAddress}
                      </Text>
                      <View style={styles.addressPkgBadge}>
                        <Text style={styles.addressPkgBadgeText}>{ag.packageCount}</Text>
                      </View>
                    </View>

                    {stop.packages
                      .filter(p => ag.packageIds.includes(p.id))
                      .map((pkg, pkgIdx) => (
                        <View key={pkg.id} style={styles.packageItem}>
                          <View style={styles.packageIcon}>
                            <Text style={styles.packageIconText}>{pkgIdx + 1}</Text>
                          </View>
                          <Text style={styles.packageTracking}>{pkg.trackingNumber}</Text>
                          <Package size={13} color={Colors.gold[500]} style={{ opacity: 0.5 }} />
                        </View>
                      ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.optimizationNote}>
        <MapPin size={16} color={Colors.gray} />
        <Text style={styles.optimizationText}>
          Use Subir e Descer para ajustar a sequência antes de começar a entrega.
        </Text>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startRoute}>
        <LinearGradient
          colors={[Colors.gold[500], Colors.gold[700]]}
          style={styles.startGradient}
        >
          <Play size={24} color={Colors.primary[900]} />
          <Text style={styles.startText}>Começar entrega</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
    <Modal
      visible={moveStopIndex !== null}
      transparent
      animationType="fade"
      onRequestClose={closeMoveModal}
    >
      <View style={moveModalStyles.root}>
        <Pressable
          style={moveModalStyles.backdrop}
          onPress={closeMoveModal}
          accessibilityRole="button"
          accessibilityLabel="Cancelar movimentação"
        />
        <View style={moveModalStyles.card}>
          <AppText variant="sectionTitle">Mover parada</AppText>
          <AppText variant="body" color={Colors.gray}>
            Escolha a nova posição desta parada
          </AppText>
          <View style={moveModalStyles.positionSummary}>
            <AppText variant="bodyStrong">
              Parada atual: #{moveStopIndex === null ? '-' : moveStopIndex + 1}
            </AppText>
            <AppText variant="label" color={Colors.gray}>
              Total de paradas: {totalStops}
            </AppText>
          </View>
          <AppText variant="label" color={Colors.gray}>
            Mover para posição
          </AppText>
          <TextInput
            style={[moveModalStyles.input, moveError && moveModalStyles.inputError]}
            value={targetPosition}
            onChangeText={value => {
              setTargetPosition(value);
              setMoveError(null);
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={String(totalStops).length}
            autoFocus
            selectTextOnFocus
            accessibilityLabel="Nova posição da parada"
          />
          {moveError ? (
            <AppText variant="label" color={Colors.error}>
              {moveError}
            </AppText>
          ) : null}
          <View style={moveModalStyles.actions}>
            <AppButton
              label="Cancelar"
              variant="ghost"
              fullWidth={false}
              style={moveModalStyles.actionButton}
              onPress={closeMoveModal}
            />
            <AppButton
              label="Mover"
              fullWidth={false}
              style={moveModalStyles.actionButton}
              onPress={confirmMoveStop}
            />
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
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

  summaryCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.2)', gap: Spacing.md,
  },
  summaryTitle: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.gold[400] },
  summaryRouteName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 4, flex: 1 },
  summaryDivider: { width: 1, height: 44, backgroundColor: 'rgba(212,160,23,0.15)' },
  summaryValue: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.gold[400] },
  summaryLabel: { fontSize: FontSizes.sm, color: Colors.gray },

  instructionCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(212,160,23,0.07)', borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.15)', borderRadius: BorderRadius.md,
    padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  instructionText: { flex: 1, fontSize: FontSizes.sm, color: Colors.gold[300], lineHeight: 20 },
  secondaryActions: { gap: Spacing.sm, marginBottom: Spacing.lg },
  editCard: { gap: Spacing.sm, marginBottom: Spacing.lg },
  routeNameInput: {
    minHeight: 52,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    color: Colors.white,
    fontSize: FontSizes.md,
  },

  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white, marginBottom: Spacing.md },

  stopCard: {
    backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  stopHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  stopNumberWrap: { alignItems: 'center', gap: 3 },
  stopNumberCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary[500],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(212,160,23,0.3)',
  },
  stopNumberText: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.gold[400] },
  stopLabel: { fontSize: FontSizes.xs, color: Colors.gray, fontWeight: '500' },
  optimizedBadge: {
    marginTop: 2, paddingHorizontal: 5, paddingVertical: 2,
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 4,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  optimizedBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.success },

  stopInfo: { flex: 1 },
  stopAddress: { fontSize: FontSizes.md, color: Colors.white, fontWeight: '500', lineHeight: 20 },
  stopMetaRow: { flexDirection: 'row', gap: 5, marginTop: 5, flexWrap: 'wrap' },
  metaBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(10,37,114,0.4)', borderRadius: BorderRadius.sm,
    paddingHorizontal: 6, paddingVertical: 2, gap: 3,
  },
  metaBadgeWarn: { backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warningBorder },
  metaBadgeText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.gold[400] },

  expandControl: { alignItems: 'center', gap: 2 },
  expandHint: { fontSize: FontSizes.xs, color: Colors.gold[400], fontWeight: '600' },
  stopOrderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  stopOrderButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  navigateButton: { flexGrow: 1 },
  stopOrderButtonDisabled: { opacity: 0.45 },
  stopOrderButtonText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.gold[400] },
  stopOrderButtonTextDisabled: { color: Colors.darkGray },

  expandedBody: {
    borderTopWidth: 1, borderTopColor: Colors.cardBorder,
    padding: Spacing.md, backgroundColor: 'rgba(3,13,66,0.5)', gap: Spacing.md,
  },
  expandedTitle: {
    fontSize: FontSizes.sm, fontWeight: '700', color: Colors.gold[400], letterSpacing: 0.3,
  },

  addressGroup: {
    backgroundColor: 'rgba(10,37,114,0.3)', borderRadius: BorderRadius.sm,
    padding: Spacing.sm, gap: 4, borderWidth: 1, borderColor: 'rgba(28,45,74,0.8)',
  },
  addressGroupHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4,
  },
  addressGroupText: {
    flex: 1, fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary[200], lineHeight: 18,
  },
  addressPkgBadge: {
    backgroundColor: Colors.primary[500], borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  addressPkgBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.gold[400] },

  packageItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 5, paddingLeft: Spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(28,45,74,0.5)',
  },
  packageIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(10,37,114,0.6)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(212,160,23,0.2)',
  },
  packageIconText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.gold[400] },
  packageTracking: { flex: 1, fontSize: FontSizes.md, fontWeight: '700', color: Colors.white },

  optimizationNote: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg,
    borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md,
    padding: Spacing.md, gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.md,
  },
  optimizationText: { flex: 1, fontSize: FontSizes.sm, color: Colors.gray },

  startButton: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
  startGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', height: 56, gap: Spacing.sm,
  },
  startText: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary[900] },
});

const moveModalStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  positionSummary: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.overlay,
  },
  input: {
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  inputError: {
    borderColor: Colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
