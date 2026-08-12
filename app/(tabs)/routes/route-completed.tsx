import React from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, MapPin, Clock, CheckCircle2, Home, Package } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { useRoute } from '@/contexts/RouteContext';
import {
  deriveExecutionProgress,
  formatExecutionDuration,
  formatExecutionTime,
} from '@/lib/executionState';

export default function RouteCompletedScreen() {
  const router = useRouter();
  const { currentRoute, setCurrentRoute } = useRoute();
  const successScale = React.useRef(new Animated.Value(0.84)).current;
  const successOpacity = React.useRef(new Animated.Value(0)).current;

  const progress = React.useMemo(
    () => deriveExecutionProgress(currentRoute),
    [currentRoute]
  );
  const totalPackages = currentRoute?.totalPackages ?? 0;
  const totalStops = currentRoute?.stops.length ?? 0;
  const distance = currentRoute?.estimatedDistanceKm ?? 0;
  const elapsed = currentRoute?.durationMinutes ?? 0;
  const startedAt = currentRoute?.startTime ?? null;
  const finishedAt = startedAt ? startedAt + elapsed * 60000 : null;
  const finishedAtLabel = currentRoute ? formatExecutionTime(finishedAt) : '--:--';
  const startedAtLabel = formatExecutionTime(startedAt);
  const durationLabel = formatExecutionDuration(elapsed);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(successScale, {
        toValue: 1,
        damping: 12,
        stiffness: 150,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successOpacity, successScale]);

  const handleFinish = () => {
    setCurrentRoute(null);
    router.replace('/(tabs)/routes');
  };

  return (
    <LinearGradient
      colors={[Colors.background, Colors.primary[800]]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandHeader}>
          <HeaderBrandIcon size={24} />
          <Text style={styles.brandText}>Zerei Rotas</Text>
        </View>

        <Animated.View
          style={[
            styles.trophyContainer,
            { opacity: successOpacity, transform: [{ scale: successScale }] },
          ]}
        >
          <LinearGradient
            colors={[Colors.gold[500], Colors.gold[700]]}
            style={styles.trophyCircle}
          >
            <Trophy size={56} color={Colors.primary[900]} />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.celebrationTitle}>Rota Zerada!</Text>
        <Text style={styles.celebrationSubtitle}>
          Todas as entregas foram concluídas com sucesso
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={[Colors.primary[500], Colors.primary[700]]}
              style={styles.statGradient}
            >
              <Package size={24} color={Colors.gold[400]} />
              <Text style={styles.statValue}>{totalPackages}</Text>
              <Text style={styles.statLabel}>Total de pacotes</Text>
            </LinearGradient>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.miniStatCard, { flex: 1 }]}>
              <MapPin size={20} color={Colors.gold[400]} />
              <Text style={styles.miniStatValue}>{totalStops}</Text>
              <Text style={styles.miniStatLabel}>Total de paradas</Text>
            </View>

            <View style={[styles.miniStatCard, { flex: 1 }]}>
              <Clock size={20} color={Colors.gold[400]} />
              <Text style={styles.miniStatValue}>{durationLabel}</Text>
              <Text style={styles.miniStatLabel}>Tempo total</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumo da rota</Text>
            <View style={styles.summaryGrid}>
              <Text style={styles.summaryLabel}>Iniciada</Text>
              <Text style={styles.summaryValue}>{startedAtLabel}</Text>
              <Text style={styles.summaryLabel}>Finalizada</Text>
              <Text style={styles.summaryValue}>{finishedAtLabel}</Text>
              <Text style={styles.summaryLabel}>Duração total</Text>
              <Text style={styles.summaryValue}>{durationLabel}</Text>
              <Text style={styles.summaryLabel}>Sucesso</Text>
              <Text style={styles.summaryValue}>{progress.successRate}%</Text>
            </View>
          </View>

          <View style={styles.distanceCard}>
            <MapPin size={18} color={Colors.gold[400]} />
            <Text style={styles.distanceValue}>{distance} km percorridos</Text>
          </View>
        </View>

        {currentRoute?.stops.map((stop) => (
          <View key={stop.id} style={styles.completedStop}>
            <CheckCircle2 size={18} color={Colors.success} />
            <View style={styles.completedStopInfo}>
              <Text style={styles.completedStopText}>{stop.normalizedAddress}</Text>
              <Text style={styles.completedStopPackages}>
                {stop.packages.filter(p => p.status === 'delivered').length}/{stop.packageCount} pacotes
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
          <LinearGradient
            colors={[Colors.gold[500], Colors.gold[700]]}
            style={styles.finishGradient}
          >
            <Home size={22} color={Colors.primary[900]} />
            <Text style={styles.finishText}>Finalizar rota</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.lg,
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  brandText: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.gold[400],
  },
  trophyContainer: { marginBottom: Spacing.lg },
  trophyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTitle: {
    fontSize: FontSizes.hero,
    fontWeight: '900',
    color: Colors.gold[400],
    marginBottom: Spacing.sm,
  },
  celebrationSubtitle: {
    fontSize: FontSizes.lg,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  statsContainer: { width: '100%', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  statGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: '900',
    color: Colors.gold[400],
  },
  statLabel: {
    fontSize: FontSizes.md,
    color: Colors.gray,
    fontWeight: '600',
  },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  summaryCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  summaryLabel: {
    width: '42%',
    color: Colors.gray,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  summaryValue: {
    width: '52%',
    color: Colors.gold[400],
    fontSize: FontSizes.sm,
    fontWeight: '800',
    textAlign: 'right',
  },
  miniStatCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  miniStatValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.gold[400],
  },
  miniStatLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontWeight: '500',
  },
  distanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  distanceValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.gold[400],
  },
  completedStop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  completedStopInfo: { flex: 1 },
  completedStopText: {
    fontSize: FontSizes.sm,
    color: Colors.white,
    fontWeight: '500',
  },
  completedStopPackages: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },
  finishButton: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.xl,
  },
  finishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: Spacing.sm,
  },
  finishText: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.primary[900],
  },
});
