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
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin,
  Crown,
  Package,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Circle,
  Pencil,
  Trash2,
  Play,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { usePersistence } from '@/hooks/usePersistence';
import { useRoute } from '@/contexts/RouteContext';

interface RouteItem {
  id: string;
  name: string;
  date: string;
  status: 'planning' | 'active' | 'completed';
  totalPackages: number;
  totalStops: number;
  deliveredPackages: number;
  completedStops: number;
  isCurrentRoute: boolean;
}

export default function RoutesScreen() {
  const router = useRouter();
  const { loadCurrentRoute, getHistory, renameRoute, deleteRoute } = usePersistence();
  const { currentRoute, setCurrentRoute } = useRoute();
  const currentRouteRef = useRef(currentRoute);

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [editTarget, setEditTarget] = useState<RouteItem | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RouteItem | null>(null);

  useEffect(() => {
    currentRouteRef.current = currentRoute;
  }, [currentRoute]);

  const loadRoutes = useCallback(async () => {
    const current = await loadCurrentRoute();
    const history = await getHistory();
    console.log('[ZEREI RENAME TRACE][routes.loadRoutes]', {
      loadedCurrentId: current?.id ?? null,
      loadedCurrentName: current?.name ?? null,
      contextCurrentId: currentRouteRef.current?.id ?? null,
      contextCurrentName: currentRouteRef.current?.name ?? null,
      historyNames: history.map(entry => ({ id: entry.id, name: entry.name })),
    });

    const items: RouteItem[] = [];

    if (current) {
      items.push({
        id: current.id,
        name: current.name,
        date: current.startTime
          ? new Date(current.startTime).toLocaleDateString('pt-BR')
          : new Date().toLocaleDateString('pt-BR'),
        status: current.status as 'planning' | 'active',
        totalPackages: current.totalPackages,
        totalStops: current.stops.length,
        deliveredPackages: current.deliveredPackages,
        completedStops: current.completedStops,
        isCurrentRoute: true,
      });
    }

    history.forEach(entry => {
      items.push({
        id: entry.id,
        name: entry.name,
        date: new Date(entry.completedAt).toLocaleDateString('pt-BR'),
        status: 'completed',
        totalPackages: entry.totalPackages,
        totalStops: entry.totalStops,
        deliveredPackages: entry.deliveredPackages,
        completedStops: entry.completedStops,
        isCurrentRoute: false,
      });
    });

    setRoutes(items);
  }, [loadCurrentRoute, getHistory]);

  useFocusEffect(
    useCallback(() => {
      loadRoutes();
    }, [loadRoutes])
  );

  const openEdit = (route: RouteItem) => {
    setEditTarget(route);
    setEditName(route.name);
  };

  const handleSaveName = async () => {
    if (!editTarget || !editName.trim()) return;
    const trimmed = editName.trim();
    console.log('[ZEREI RENAME TRACE][routes.handleSaveName.before]', {
      routeId: editTarget.id,
      titleBeforeRename: editTarget.name,
      newTitlePassedToRenameRoute: trimmed,
      isCurrentRoute: editTarget.isCurrentRoute,
      contextCurrentId: currentRoute?.id ?? null,
      contextCurrentName: currentRoute?.name ?? null,
    });
    const renamed = await renameRoute(editTarget.id, trimmed);
    console.log('[ZEREI RENAME TRACE][routes.handleSaveName.afterRenameRoute]', {
      routeId: editTarget.id,
      renamed,
      newTitlePassedToRenameRoute: trimmed,
    });
    if (!renamed) return;
    if (editTarget.isCurrentRoute) {
      const current = await loadCurrentRoute();
      console.log('[ZEREI RENAME TRACE][routes.handleSaveName.reloadAfterRename]', {
        routeId: editTarget.id,
        loadedCurrentId: current?.id ?? null,
        loadedCurrentName: current?.name ?? null,
      });
      if (current && current.id === editTarget.id) {
        setCurrentRoute(current);
        console.log('[ZEREI RENAME TRACE][routes.handleSaveName.setCurrentRouteCalled]', {
          routeId: current.id,
          name: current.name,
        });
      }
    }
    setRoutes(prev => prev.map(r => r.id === editTarget.id ? { ...r, name: trimmed } : r));
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRoute(deleteTarget.id);
    if (deleteTarget.isCurrentRoute) {
      setCurrentRoute(null);
    }
    setRoutes(prev => prev.filter(r => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 size={16} color={Colors.success} />;
    if (status === 'active') return <Clock size={16} color={Colors.warning} />;
    return <Circle size={16} color={Colors.gray} />;
  };

  const statusLabel = (status: string) => {
    if (status === 'completed') return 'Concluída';
    if (status === 'active') return 'Em andamento';
    return 'Planejada';
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return Colors.success;
    if (status === 'active') return Colors.warning;
    return Colors.gray;
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Crown size={22} color={Colors.gold[400]} />
          <Text style={styles.pageTitle}>Minhas Rotas</Text>
        </View>

        <TouchableOpacity
          style={styles.importButton}
          onPress={() => router.push('/import')}
        >
          <LinearGradient
            colors={[Colors.gold[500], Colors.gold[700]]}
            style={styles.importGradient}
          >
            <FileSpreadsheet size={22} color={Colors.primary[900]} />
            <Text style={styles.importText}>Importar Planilha</Text>
          </LinearGradient>
        </TouchableOpacity>

        {routes.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={48} color={Colors.cardBorder} />
            <Text style={styles.emptyTitle}>Nenhuma rota salva ainda.</Text>
            <Text style={styles.emptySubtitle}>
              Importe uma planilha para começar.
            </Text>
          </View>
        ) : (
          routes.map(route => (
            <View key={route.id} style={styles.routeCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  {statusIcon(route.status)}
                  <Text style={styles.cardName} numberOfLines={1}>
                    {route.name}
                  </Text>
                </View>
                <View style={styles.cardIcons}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEdit(route)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Pencil size={15} color={Colors.gold[400]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setDeleteTarget(route)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={15} color={Colors.error} />
                  </TouchableOpacity>
                </View>
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
                <Text style={styles.metaText}>{route.date}</Text>
                <Text style={[styles.metaStatus, { color: statusColor(route.status) }]}>
                  {statusLabel(route.status)}
                </Text>
              </View>

              {(route.status === 'active' || route.status === 'planning') && (
                <TouchableOpacity
                  style={styles.continueBtn}
                  onPress={() =>
                    router.push(
                      route.status === 'active'
                        ? '/route-execution'
                        : '/delivery-preparation'
                    )
                  }
                >
                  <Play size={14} color={Colors.primary[900]} />
                  <Text style={styles.continueBtnText}>
                    {route.status === 'active' ? 'Continuar' : 'Preparar'}
                  </Text>
                </TouchableOpacity>
              )}
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
            onChangeText={setEditName}
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

  importButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  importGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: Spacing.sm,
  },
  importText: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary[900],
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
  },
  cardIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
  },

  cardMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  metaStatus: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },

  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-end',
  },
  continueBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.gold[400],
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
