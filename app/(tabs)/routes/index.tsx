import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import {
  MapPin,
  Package,
  Pencil,
  Trash2,
  Play,
  Truck,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { StatusBadge } from '@/components/ui';
import { usePersistence } from '@/hooks/usePersistence';
import { useRoute } from '@/contexts/RouteContext';
import {
  deriveRouteDisplayStatus,
  routeDisplayStatusLabel,
  type RouteDisplayStatus,
} from '@/lib/routePresentation';
import {
  collectRouteOccurrenceRecords,
  partitionOccurrenceRecords,
  type OccurrenceRecord,
} from '@/lib/occurrenceRecords';

function visibleOccurrenceCount(records: readonly OccurrenceRecord[]): number {
  const sections = partitionOccurrenceRecords(records);
  return sections.pending.length + sections.resolvedRecently.length;
}

interface RouteItem {
  id: string;
  name: string;
  date: string;
  status: RouteDisplayStatus;
  totalPackages: number;
  totalStops: number;
  distance: number;
  deliveredPackages: number;
  completedStops: number;
  isCurrentRoute: boolean;
  occurrenceCount: number;
  completedAt?: string;
}

export default function RoutesScreen() {
  const router = useRouter();
  const { renameRoute, deleteRoute } = usePersistence();
  const { currentRoute, routeHistory, setCurrentRoute, renameCurrentRoute, reloadHistory } = useRoute();

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [editTarget, setEditTarget] = useState<RouteItem | null>(null);
  const [editName, setEditName] = useState('');
  const editNameRef = useRef('');
  const [deleteTarget, setDeleteTarget] = useState<RouteItem | null>(null);
  const loadRoutes = useCallback(async () => {
    await reloadHistory();
    const items: RouteItem[] = [];

    if (currentRoute && currentRoute.status !== 'completed') {
      items.push({
        id: currentRoute.id,
        name: currentRoute.name,
        date: currentRoute.startTime
          ? new Date(currentRoute.startTime).toLocaleDateString('pt-BR')
          : new Date().toLocaleDateString('pt-BR'),
        status: deriveRouteDisplayStatus(
          true,
          currentRoute.deliveredPackages,
          currentRoute.status === 'active' || currentRoute.startTime !== null
        ),
        totalPackages: currentRoute.totalPackages,
        totalStops: currentRoute.stops.length,
        distance: currentRoute.estimatedDistanceKm,
        deliveredPackages: currentRoute.deliveredPackages,
        completedStops: currentRoute.completedStops,
        isCurrentRoute: true,
        occurrenceCount: visibleOccurrenceCount(collectRouteOccurrenceRecords(currentRoute)),
      });
    }

    routeHistory.forEach(entry => {
      items.push({
        id: entry.id,
        name: entry.name,
        date: new Date(entry.completedAt).toLocaleDateString('pt-BR'),
        status: 'completed',
        totalPackages: entry.totalPackages,
        totalStops: entry.totalStops,
        distance: entry.distance,
        deliveredPackages: entry.deliveredPackages,
        completedStops: entry.completedStops,
        isCurrentRoute: false,
        occurrenceCount: visibleOccurrenceCount(entry.occurrences ?? []),
        completedAt: entry.completedAt,
      });
    });

    setRoutes(items);
  }, [currentRoute, routeHistory, reloadHistory]);

  useFocusEffect(
    useCallback(() => {
      loadRoutes();
    }, [loadRoutes])
  );

  useEffect(() => {
    loadRoutes();
  }, [currentRoute]);

  const openEdit = (route: RouteItem) => {
    setEditTarget(route);
    setEditName(route.name);
    editNameRef.current = route.name;
  };

  const handleSaveName = async () => {
    const latestName = editNameRef.current || editName;
    if (!editTarget || !latestName.trim()) return;
    const trimmed = latestName.trim();
    const renamed = editTarget.isCurrentRoute
      ? await renameCurrentRoute(trimmed)
      : await renameRoute(editTarget.id, trimmed, editTarget.completedAt);
    if (!renamed) return;
    if (!editTarget.isCurrentRoute) {
      await reloadHistory();
    }
    setRoutes(prev => prev.map(r =>
      r.id === editTarget.id && r.completedAt === editTarget.completedAt
        ? { ...r, name: trimmed }
        : r
    ));
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRoute(deleteTarget.id);
    if (deleteTarget.isCurrentRoute) {
      setCurrentRoute(null);
    } else {
      await reloadHistory();
    }
    setRoutes(prev => prev.filter(r => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const startPlannedRoute = (route: RouteItem) => {
    if (!currentRoute || currentRoute.id !== route.id) return;
    setCurrentRoute({
      ...currentRoute,
      status: 'active',
      startTime: currentRoute.startTime ?? Date.now(),
    });
    router.push('/(tabs)/routes/route-execution');
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <HeaderBrandIcon size={22} />
          <Text style={styles.pageTitle}>Minhas Rotas</Text>
        </View>

        {routes.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={48} color={Colors.cardBorder} />
            <Text style={styles.emptyTitle}>Nenhuma rota encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Importe uma planilha para começar.
            </Text>
          </View>
        ) : (
          routes.map(route => (
            <View key={route.completedAt ? `${route.id}-${route.completedAt}` : route.id} style={styles.routeCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName} numberOfLines={2}>
                  {route.name}
                </Text>
                <StatusBadge
                  status={route.status}
                  label={routeDisplayStatusLabel(route.status)}
                />
              </View>

              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Package size={13} color={Colors.gray} />
                  <Text style={styles.metaText}>{route.totalPackages} pacotes</Text>
                </View>
                <View style={styles.metaItem}>
                  <MapPin size={13} color={Colors.gray} />
                  <Text style={styles.metaText}>{route.totalStops} paradas</Text>
                </View>
                {route.distance > 0 ? (
                  <View style={styles.metaItem}>
                    <Truck size={13} color={Colors.gray} />
                    <Text style={styles.metaText}>{route.distance} km</Text>
                  </View>
                ) : null}
                <View style={styles.metaItem}>
                  <Clock size={13} color={Colors.gray} />
                  <Text style={styles.metaText}>{route.date}</Text>
                </View>
              </View>

              <View style={styles.cardManagementRow}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEdit(route)}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${route.name}`}
                >
                  <Pencil size={17} color={Colors.gold[400]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setDeleteTarget(route)}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir ${route.name}`}
                >
                  <Trash2 size={17} color={Colors.error} />
                </TouchableOpacity>
              </View>

              {route.occurrenceCount > 0 ? (
                <View style={styles.occurrenceRow}>
                  <View style={styles.occurrenceCount}>
                    <AlertCircle size={15} color={Colors.error} />
                    <Text style={styles.occurrenceCountText}>
                      {route.occurrenceCount}{' '}
                      {route.occurrenceCount === 1 ? 'ocorrência' : 'ocorrências'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.occurrenceAction}
                    onPress={() => router.push('/(tabs)/occurrences')}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ocorrências de ${route.name}`}
                  >
                    <Text style={styles.occurrenceActionText}>Ver ocorrências</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {route.status === 'planning' ? (
                <View style={styles.routeActions}>
                  <TouchableOpacity
                    style={[styles.routeActionButton, styles.primaryRouteAction]}
                    onPress={() => startPlannedRoute(route)}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={`Começar entrega ${route.name}`}
                  >
                    <Play size={15} color={Colors.primary[900]} />
                    <Text style={styles.primaryRouteActionText}>Começar entrega</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.routeActionButton, styles.reviewActionButton]}
                    onPress={() => router.push('/(tabs)/routes/delivery-preparation')}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={`Revisar rota ${route.name}`}
                  >
                    <MapPin size={15} color={Colors.gold[400]} />
                    <Text style={styles.reviewActionText}>Revisar Rota</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {route.status === 'active' ? (
                <View style={styles.routeActions}>
                  <TouchableOpacity
                    style={[styles.routeActionButton, styles.primaryRouteAction]}
                    onPress={() => router.push('/(tabs)/routes/route-execution')}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={`Continuar rota ${route.name}`}
                  >
                    <Play size={15} color={Colors.primary[900]} />
                    <Text style={styles.primaryRouteActionText}>Continuar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.routeActionButton, styles.reviewActionButton]}
                    onPress={() => router.push('/(tabs)/routes/delivery-preparation')}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={`Revisar rota ${route.name}`}
                  >
                    <MapPin size={15} color={Colors.gold[400]} />
                    <Text style={styles.reviewActionText}>Revisar Rota</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {route.isCurrentRoute ? (
                <TouchableOpacity
                  style={[styles.routeActionButton, styles.mapActionButton]}
                  onPress={() => router.push('/(tabs)/routes/map-overview' as Href)}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={`Mostrar ${route.name} no mapa`}
                >
                  <MapPin size={15} color={Colors.primary[200]} />
                  <Text style={styles.mapActionText}>Mapa</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit name modal */}
      <Modal
        visible={editTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditTarget(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setEditTarget(null)} />
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Editar nome da rota</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={(text) => {
              editNameRef.current = text;
              setEditName(text);
            }}
            placeholder="Nome da rota"
            placeholderTextColor={Colors.gray}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
          />
          <View style={styles.modalRow}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => setEditTarget(null)}
            >
              <Text style={styles.modalBtnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={handleSaveName}
            >
              <Text style={styles.modalBtnPrimaryText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDeleteTarget(null)} />
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Excluir rota?</Text>
          <Text style={styles.modalMessage}>
            Esta ação não pode ser desfeita.
          </Text>
          <View style={styles.modalRow}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => setDeleteTarget(null)}
            >
              <Text style={styles.modalBtnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnDanger]}
              onPress={handleDelete}
            >
              <Text style={styles.modalBtnDangerText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.white,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.gray,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.darkGray,
    textAlign: 'center',
  },

  routeCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardManagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },

  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  occurrenceRow: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.errorBg,
  },
  occurrenceCount: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  occurrenceCountText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: '800' },
  occurrenceAction: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  occurrenceActionText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: '800' },
  routeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  routeActionButton: {
    minHeight: 44,
    flexGrow: 1,
    flexBasis: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  reviewActionButton: {
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  reviewActionText: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.gold[400],
  },
  primaryRouteAction: {
    borderColor: Colors.gold[700],
    backgroundColor: Colors.gold[500],
  },
  primaryRouteActionText: {
    fontSize: FontSizes.sm,
    fontWeight: '900',
    color: Colors.primary[900],
  },
  mapActionButton: {
    borderColor: Colors.primary[400],
    backgroundColor: Colors.primary[800],
  },
  mapActionText: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.primary[200],
  },

  // Modals
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalBox: {
    position: 'absolute',
    top: '50%',
    left: Spacing.xl,
    right: Spacing.xl,
    transform: [{ translateY: -80 }],
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  modalMessage: {
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  modalRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
  },
  modalBtnSecondary: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modalBtnSecondaryText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.gray,
  },
  modalBtnPrimary: {
    backgroundColor: Colors.primary[500],
    borderWidth: 1,
    borderColor: Colors.primary[400],
  },
  modalBtnPrimaryText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.gold[400],
  },
  modalBtnDanger: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  modalBtnDangerText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.error,
  },
});
