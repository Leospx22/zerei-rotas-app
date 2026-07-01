import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, MapPin, Clock, CheckCircle2, Home, Crown, Package } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useRoute } from '@/contexts/RouteContext';

export default function RouteCompletedScreen() {
  const router = useRouter();
  const { currentRoute, setCurrentRoute } = useRoute();

  const deliveredPackages = currentRoute?.deliveredPackages ?? 0;
  const totalPackages = currentRoute?.totalPackages ?? 0;
  const totalStops = currentRoute?.stops.length ?? 0;
  const completedStops = currentRoute?.stops.filter(s => s.status === 'completed').length ?? 0;
  const distance = currentRoute?.estimatedDistanceKm ?? 0;
  const elapsed = currentRoute?.durationMinutes ?? 45;

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
          <Crown size={28} color={Colors.gold[400]} />
          <Text style={styles.brandText}>Zerei Rotas</Text>
        </View>

        <View style={styles.trophyContainer}>
          <LinearGradient
            colors={[Colors.gold[500], Colors.gold[700]]}
            style={styles.trophyCircle}
          >
            <Trophy size={56} color={Colors.primary[900]} />
          </LinearGradient>
        </View>

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
              <Text style={styles.statValue}>{deliveredPackages}/{totalPackages}</Text>
              <Text style={styles.statLabel}>Pacotes Entregues</Text>
            </LinearGradient>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.miniStatCard, { flex: 1 }]}>
              <MapPin size={20} color={Colors.gold[400]} />
              <Text style={styles.miniStatValue}>{completedStops}/{totalStops}</Text>
              <Text style={styles.miniStatLabel}>Paradas</Text>
            </View>

            <View style={[styles.miniStatCard, { flex: 1 }]}>
              <Clock size={20} color={Colors.gold[400]} />
              <Text style={styles.miniStatValue}>{elapsed} min</Text>
              <Text style={styles.miniStatLabel}>Tempo</Text>
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
            <Text style={styles.finishText}>Voltar ao Painel</Text>
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
