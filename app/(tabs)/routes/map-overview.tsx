import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  List,
  MapPinned,
  Navigation,
  Package,
  Play,
} from 'lucide-react-native';
import RouteMap from '@/components/RouteMap';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import { useRoute } from '@/contexts/RouteContext';
import { buildGoogleMapsSearchUrl } from '@/lib/mapNavigation';
import {
  buildMapStops,
  getMapCoordinateState,
  mapStopStatusLabel,
} from '@/lib/mapOverview';

export default function MapOverviewScreen() {
  const router = useRouter();
  const { currentRoute } = useRoute();
  const mapStops = useMemo(
    () => currentRoute ? buildMapStops(currentRoute) : [],
    [currentRoute]
  );
  const initialStop = mapStops.find(stop => stop.status === 'current') ?? mapStops[0] ?? null;
  const [selectedStopId, setSelectedStopId] = useState<string | null>(initialStop?.id ?? null);
  const selectedStop = mapStops.find(stop => stop.id === selectedStopId) ?? initialStop;
  const coordinateState = getMapCoordinateState(mapStops);

  const navigateToStop = async () => {
    if (!selectedStop) return;
    try {
      const url = buildGoogleMapsSearchUrl(selectedStop.address);
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Unsupported map URL');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir o mapa.');
    }
  };

  if (!currentRoute) {
    return (
      <View style={styles.emptyContainer}>
        <MapPinned size={48} color={Colors.cardBorder} />
        <Text style={styles.emptyTitle}>Nenhuma rota disponível</Text>
        <Text style={styles.emptyText}>Importe uma rota para visualizar suas paradas.</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Mostrar no mapa</Text>
          <Text style={styles.routeName}>{currentRoute.name}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {mapStops.length} {mapStops.length === 1 ? 'parada' : 'paradas'} · {currentRoute.totalPackages} pacotes
        </Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.dot, styles.dotPending]} /><Text style={styles.legendText}>Amarelo: pendente</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, styles.dotCompleted]} /><Text style={styles.legendText}>Cinza: concluída</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, styles.dotCurrent]} /><Text style={styles.legendText}>Destaque: parada atual</Text></View>
        </View>
      </View>

      {coordinateState === 'unavailable' ? (
        <View style={styles.warningCard}>
          <AlertTriangle size={19} color={Colors.warning} />
          <View style={styles.warningCopy}>
            <Text style={styles.warningTitle}>Mapa indisponível</Text>
            <Text style={styles.warningText}>
              Esta rota ainda não possui coordenadas para exibir os pontos no mapa.
            </Text>
          </View>
        </View>
      ) : coordinateState === 'partial' ? (
        <View style={styles.warningCard}>
          <AlertTriangle size={19} color={Colors.warning} />
          <Text style={styles.warningText}>
            Algumas paradas não possuem coordenadas.
          </Text>
        </View>
      ) : null}

      <RouteMap
        stops={mapStops}
        selectedStopId={selectedStop?.id ?? null}
        onSelectStop={setSelectedStopId}
      />

      {selectedStop ? (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.stopNumber}><Text style={styles.stopNumberText}>#{selectedStop.order}</Text></View>
            <View style={styles.detailHeaderCopy}>
              <Text style={styles.detailAddress}>{selectedStop.address}</Text>
              <Text style={styles.detailStatus}>{mapStopStatusLabel(selectedStop.status)}</Text>
            </View>
          </View>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Package size={15} color={Colors.gold[400]} />
              <Text style={styles.metricText}>
                {selectedStop.packageCount} {selectedStop.packageCount === 1 ? 'pacote' : 'pacotes'}
              </Text>
            </View>
            <View style={styles.metric}>
              <CheckCircle2 size={15} color={Colors.success} />
              <Text style={styles.metricText}>
                {selectedStop.deliveredCount} {selectedStop.deliveredCount === 1 ? 'entregue' : 'entregues'}
              </Text>
            </View>
            {selectedStop.occurrenceCount > 0 ? (
              <View style={styles.metric}>
                <AlertTriangle size={15} color={Colors.warning} />
                <Text style={styles.metricText}>
                  {selectedStop.occurrenceCount}{' '}
                  {selectedStop.occurrenceCount === 1 ? 'ocorrência' : 'ocorrências'}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={navigateToStop}>
              <Navigation size={17} color={Colors.primary[900]} />
              <Text style={styles.primaryButtonText}>Navegar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/(tabs)/routes/delivery-preparation')}
            >
              <List size={17} color={Colors.gold[400]} />
              <Text style={styles.secondaryButtonText}>Ver na lista</Text>
            </TouchableOpacity>
            {currentRoute.status === 'active' ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.replace('/(tabs)/routes/route-execution')}
              >
                <Play size={17} color={Colors.gold[400]} />
                <Text style={styles.secondaryButtonText}>Continuar entrega</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  emptyTitle: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: '800' },
  emptyText: { color: Colors.gray, fontSize: FontSizes.md, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.cardBg,
  },
  headerCopy: { flex: 1 },
  title: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: '900' },
  routeName: { color: Colors.gray, fontSize: FontSizes.sm, marginTop: 2 },
  summaryRow: { gap: Spacing.sm },
  summaryText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendText: { color: Colors.gray, fontSize: FontSizes.sm },
  dot: { width: 9, height: 9, borderRadius: BorderRadius.full },
  dotCurrent: { backgroundColor: Colors.gold[200], borderWidth: 2, borderColor: Colors.white },
  dotPending: { backgroundColor: Colors.gold[600] },
  dotCompleted: { backgroundColor: Colors.darkGray },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    backgroundColor: Colors.warningBg,
  },
  warningCopy: { flex: 1, gap: 3 },
  warningTitle: { color: Colors.warning, fontSize: FontSizes.md, fontWeight: '800' },
  warningText: { flex: 1, color: Colors.gray, fontSize: FontSizes.sm, lineHeight: 18 },
  detailCard: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stopNumber: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
  },
  stopNumberText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '900' },
  detailHeaderCopy: { flex: 1, gap: 3 },
  detailAddress: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '800' },
  detailStatus: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metric: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metricText: { color: Colors.gray, fontSize: FontSizes.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  primaryButton: {
    minHeight: 46,
    flexGrow: 1,
    flexBasis: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gold[500],
  },
  primaryButtonText: { color: Colors.primary[900], fontSize: FontSizes.md, fontWeight: '900' },
  secondaryButton: {
    minHeight: 46,
    flexGrow: 1,
    flexBasis: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  secondaryButtonText: { color: Colors.gold[400], fontSize: FontSizes.md, fontWeight: '800' },
});
