import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Copy,
  ArrowUpDown,
  MapPin,
  Play,
  Trash2,
  CheckCircle2,
  Crown,
  Package,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useRoute } from '@/contexts/RouteContext';
import { formatRouteOrderBadge, formatStopBadge } from '@/lib/routeStopPresentation';

export default function RouteOrganizerScreen() {
  const router = useRouter();
  const { currentRoute, removeDuplicates, reorderStops, setCurrentRoute } = useRoute();

  if (!currentRoute) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhuma rota criada</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/routes/import')}>
          <Text style={styles.emptyLink}>Importar planilha</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const duplicateCount =
    currentRoute.stops.length - new Set(currentRoute.stops.map(s => s.normalizedAddress.toLowerCase().trim())).size;

  const startRoute = () => {
    setCurrentRoute({
      ...currentRoute,
      status: 'active',
      startTime: Date.now(),
    });
    router.push('/(tabs)/routes/route-execution');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Crown size={20} color={Colors.gold[400]} />
          <Text style={styles.headerTitle}>Organizar Rota</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summaryCard}>
        <LinearGradient
          colors={[Colors.primary[500], Colors.primary[700]]}
          style={styles.summaryGradient}
        >
          <Text style={styles.routeName}>{currentRoute.name}</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Package size={16} color={Colors.gold[400]} />
              <Text style={styles.summaryValue}>{currentRoute.totalPackages}</Text>
              <Text style={styles.summaryLabel}>Pacotes</Text>
            </View>
            <View style={styles.summaryItem}>
              <MapPin size={16} color={Colors.gold[400]} />
              <Text style={styles.summaryValue}>{currentRoute.stops.length}</Text>
              <Text style={styles.summaryLabel}>Paradas</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <Text style={styles.sectionTitle}>Ações</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionCard} onPress={removeDuplicates}>
          <Copy size={22} color={Colors.gold[400]} />
          <Text style={styles.actionLabel}>Remover</Text>
          <Text style={styles.actionLabel}>Duplicatas</Text>
          {duplicateCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{duplicateCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={reorderStops}>
          <ArrowUpDown size={22} color={Colors.gold[400]} />
          <Text style={styles.actionLabel}>Reordenar</Text>
          <Text style={styles.actionLabel}>Paradas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {
            Alert.alert('Confirmar', 'Limpar todas as paradas?', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Limpar',
                style: 'destructive',
                onPress: () =>
                  setCurrentRoute({
                    ...currentRoute,
                    stops: [],
                    totalPackages: 0,
                    estimatedDistanceKm: 0,
                  }),
              },
            ]);
          }}
        >
          <Trash2 size={22} color={Colors.error} />
          <Text style={[styles.actionLabel, { color: Colors.error }]}>Limpar</Text>
          <Text style={[styles.actionLabel, { color: Colors.error }]}>Tudo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        Paradas Agrupadas ({currentRoute.stops.length})
      </Text>

      {currentRoute.stops.map((stop, index) => (
        <View key={stop.id} style={styles.stopCard}>
          <View style={styles.stopNumberCircle}>
            <Text style={styles.stopNumberText}>{formatRouteOrderBadge(stop, index + 1)}</Text>
          </View>
          <View style={styles.stopContent}>
            <Text style={styles.stopAddress}>{stop.normalizedAddress}</Text>
            <View style={styles.stopMetaRow}>
              <Text style={styles.stopMeta}>
                {stop.packageCount} pacote{stop.packageCount !== 1 ? 's' : ''} · Parada {formatStopBadge(stop)}
              </Text>
            </View>
          </View>
          <View style={styles.stopStatus}>
            {stop.status === 'completed' ? (
              <CheckCircle2 size={20} color={Colors.success} />
            ) : (
              <View style={styles.pendingDot} />
            )}
          </View>
        </View>
      ))}

      {currentRoute.stops.length > 0 && (
        <TouchableOpacity style={styles.startButton} onPress={startRoute}>
          <LinearGradient
            colors={[Colors.gold[500], Colors.gold[700]]}
            style={styles.startGradient}
          >
            <Play size={24} color={Colors.primary[900]} />
            <Text style={styles.startText}>Iniciar Rota</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: { fontSize: FontSizes.lg, color: Colors.gray },
  emptyLink: { fontSize: FontSizes.md, color: Colors.gold[400], fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  summaryCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.lg },
  summaryGradient: { padding: Spacing.lg, gap: Spacing.md },
  routeName: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  summaryStats: { flexDirection: 'row', gap: Spacing.xl },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.gold[400],
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  actionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.white,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.white,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  stopNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Colors.gold[400],
  },
  stopContent: { flex: 1 },
  stopAddress: {
    fontSize: FontSizes.md,
    color: Colors.white,
    fontWeight: '500',
  },
  stopMetaRow: { flexDirection: 'row', marginTop: 4 },
  stopMeta: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  stopStatus: { width: 24, alignItems: 'center' },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
  },
  startButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.xl,
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: Spacing.sm,
  },
  startText: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.primary[900],
  },
});
