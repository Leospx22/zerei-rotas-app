import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Package,
  CheckCircle2,
  MapPin,
  TrendingUp,
  FileSpreadsheet,
  Crown,
  Trophy,
  Clock,
  Truck,
  Star,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useRoute } from '@/contexts/RouteContext';
import { useDashboard } from '@/hooks/useDashboard';

interface RecentRouteItem {
  id: string;
  key: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  totalPackages: number;
  totalStops: number;
  distance: number;
  date: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function CelebrationScreen({ route }: { route: any }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotate, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const durationHours = Math.floor((route.durationMinutes ?? 0) / 60);
  const durationMins = (route.durationMinutes ?? 0) % 60;

  return (
    <LinearGradient
      colors={[Colors.primary[900], Colors.primary[700], Colors.primary[500]]}
      style={cel.container}
    >
      <Animated.View style={[cel.trophyWrap, { transform: [{ scale }, { rotate: spin }], opacity }]}>
        <Animated.View style={{ opacity: shimmerOpacity }}>
          <Trophy size={96} color={Colors.gold[400]} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={{ opacity, alignItems: 'center' }}>
        <Text style={cel.title}>ROTA ZERADA!</Text>
        <Text style={cel.subtitle}>Parabéns, entregador campeão!</Text>
      </Animated.View>

      <Animated.View style={[cel.statsCard, { opacity, transform: [{ scale }] }]}>
        <LinearGradient colors={['rgba(212,160,23,0.15)', 'rgba(212,160,23,0.05)']} style={cel.statsInner}>
          <View style={cel.statRow}>
            <Package size={20} color={Colors.gold[400]} />
            <Text style={cel.statLabel}>Pacotes Entregues</Text>
            <Text style={cel.statVal}>{route.deliveredPackages}</Text>
          </View>
          <View style={cel.divider} />
          <View style={cel.statRow}>
            <MapPin size={20} color={Colors.gold[400]} />
            <Text style={cel.statLabel}>Paradas Concluídas</Text>
            <Text style={cel.statVal}>{route.completedStops}</Text>
          </View>
          <View style={cel.divider} />
          <View style={cel.statRow}>
            <Truck size={20} color={Colors.gold[400]} />
            <Text style={cel.statLabel}>Distância Percorrida</Text>
            <Text style={cel.statVal}>{route.estimatedDistanceKm} km</Text>
          </View>
          <View style={cel.divider} />
          <View style={cel.statRow}>
            <Clock size={20} color={Colors.gold[400]} />
            <Text style={cel.statLabel}>Tempo Trabalhado</Text>
            <Text style={cel.statVal}>
              {durationHours > 0 ? `${durationHours}h ` : ''}{durationMins}min
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <TouchableOpacity
        style={cel.newRouteBtn}
        onPress={() => {
          router.push('/(tabs)/routes/import');
        }}
      >
        <LinearGradient colors={[Colors.gold[500], Colors.gold[700]]} style={cel.newRouteBtnGrad}>
          <Star size={18} color={Colors.primary[900]} />
          <Text style={cel.newRouteBtnText}>Nova Rota</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const cel = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl, gap: Spacing.xl,
  },
  trophyWrap: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(212,160,23,0.12)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(212,160,23,0.3)',
  },
  title: {
    fontSize: FontSizes.hero, fontWeight: '900', color: Colors.gold[400],
    letterSpacing: 2, textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.xl, color: Colors.white, fontWeight: '600',
    textAlign: 'center', marginTop: Spacing.sm, opacity: 0.85,
  },
  statsCard: {
    width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(212,160,23,0.25)',
  },
  statsInner: { padding: Spacing.lg, gap: Spacing.md },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statLabel: { flex: 1, fontSize: FontSizes.md, color: Colors.offWhite, fontWeight: '500' },
  statVal: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.gold[400] },
  divider: { height: 1, backgroundColor: 'rgba(212,160,23,0.1)' },
  newRouteBtn: { width: '100%', borderRadius: BorderRadius.md, overflow: 'hidden' },
  newRouteBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, gap: Spacing.sm,
  },
  newRouteBtnText: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary[900] },
});

export default function DashboardScreen() {
  const router = useRouter();
  const { currentRoute, routeHistory: recentRoutes } = useRoute();
  const {
    hasRoute,
    total,
    delivered,
    pending,
    totalStops,
    completedStops,
    remainingStops,
    progressPct,
    remainingKm,
    remainingMins,
    remainingHours,
    remainingMinRem,
    motivationalMessage,
    largestStop,
  } = useDashboard();

  const recentRouteItems: RecentRouteItem[] = [
    ...(currentRoute && currentRoute.status !== 'completed'
      ? [{
          id: currentRoute.id,
          key: currentRoute.id,
          name: currentRoute.name,
          status: currentRoute.status,
          totalPackages: currentRoute.totalPackages,
          totalStops: currentRoute.stops.length,
          distance: currentRoute.estimatedDistanceKm,
          date: currentRoute.startTime
            ? new Date(currentRoute.startTime).toLocaleDateString('pt-BR')
            : new Date().toLocaleDateString('pt-BR'),
        }]
      : []),
    ...recentRoutes.map(entry => ({
      id: entry.id,
      key: `${entry.id}-${entry.completedAt}`,
      name: entry.name,
      status: 'completed' as const,
      totalPackages: entry.totalPackages,
      totalStops: entry.totalStops,
      distance: entry.distance,
      date: new Date(entry.completedAt).toLocaleDateString('pt-BR'),
    })),
  ];

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct / 100,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressPct]);

  if (hasRoute && currentRoute!.status === 'completed') {
    return <CelebrationScreen route={currentRoute} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <Crown size={24} color={Colors.primary[900]} />
          </View>
          <View>
            <Text style={styles.brandName}>Zerei Rotas</Text>
            <Text style={styles.greeting}>{getGreeting()}, Motorista</Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
      </View>

      {/* ROTA DE HOJE hero card */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.primary[800]]}
        style={styles.rotaCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.rotaCardTopRow}>
          <View style={styles.rotaCardTitleRow}>
            <TrendingUp size={22} color={Colors.gold[400]} />
            <Text style={styles.rotaCardTitle}>Rota de Hoje</Text>
          </View>
          {hasRoute && currentRoute!.status === 'active' && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>AO VIVO</Text>
            </View>
          )}
        </View>

        {hasRoute ? (
          <>
            <View style={styles.rotaHeroRow}>
              <View style={styles.rotaHeroItem}>
                <Package size={28} color={Colors.gold[400]} />
                <Text style={styles.rotaHeroValue}>{total}</Text>
                <Text style={styles.rotaHeroLabel}>Pacotes</Text>
              </View>
              <View style={styles.rotaHeroDivider} />
              <View style={styles.rotaHeroItem}>
                <MapPin size={28} color={Colors.gold[300]} />
                <Text style={[styles.rotaHeroValue, { color: Colors.gold[300] }]}>{totalStops}</Text>
                <Text style={styles.rotaHeroLabel}>Paradas</Text>
              </View>
              <View style={styles.rotaHeroDivider} />
              <View style={styles.rotaHeroItem}>
                <Trophy size={28} color={Colors.success} />
                <Text style={[styles.rotaHeroValue, { color: Colors.success }]}>
                  {largestStop?.packageCount ?? 0}
                </Text>
                <Text style={styles.rotaHeroLabel}>Maior Parada</Text>
              </View>
            </View>
            {largestStop && (
              <View style={styles.rotaFooter}>
                <Text style={styles.rotaFooterLabel}>Maior: Parada {largestStop.stopNumber}</Text>
                <Text style={styles.rotaFooterAddr} numberOfLines={1}>
                  {largestStop.normalizedAddress}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.rotaEmptyState}>
            <FileSpreadsheet size={48} color='rgba(212,160,23,0.4)' />
            <Text style={styles.rotaEmptyText}>Nenhuma rota importada</Text>
            <Text style={styles.rotaEmptySubtext}>Importe uma planilha para ver os dados da rota</Text>
          </View>
        )}
      </LinearGradient>

      {currentRoute && currentRoute.status !== 'completed' ? (
        <TouchableOpacity
          style={styles.reviewRouteButton}
          onPress={() => router.push('/(tabs)/routes/delivery-preparation')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Revisar Rota"
        >
          <MapPin size={19} color={Colors.gold[400]} />
          <Text style={styles.reviewRouteButtonText}>Revisar Rota</Text>
        </TouchableOpacity>
      ) : null}

      {/* Import button */}
      <TouchableOpacity
        style={styles.importButton}
        onPress={() => {
          router.push('/(tabs)/routes/import');
        }}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[Colors.gold[500], Colors.gold[700]]} style={styles.importGradient}>
          <FileSpreadsheet size={22} color={Colors.primary[900]} />
          <Text style={styles.importText}>Importar Planilha</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Continue active route */}
      {hasRoute && currentRoute!.status === 'active' && (
        <TouchableOpacity
          style={styles.activeRouteCard}
          onPress={() => router.push('/(tabs)/routes/route-execution')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#0D7A3E', '#0A5C2F']} style={styles.activeRouteBanner}>
            <CheckCircle2 size={20} color={Colors.success} />
            <View style={styles.activeRouteInfo}>
              <Text style={styles.activeRouteName}>{currentRoute!.name}</Text>
              <Text style={styles.activeRouteProgress}>
                {delivered}/{total} pacotes · {completedStops}/{totalStops} paradas
              </Text>
            </View>
            <Text style={styles.activeRouteAction}>Continuar</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* 6 OPERATIONAL CARDS — 2 rows of 3 */}
      {hasRoute && (
        <>
          <View style={styles.statsRow}>
            {/* Pacotes do Dia — blue */}
            <View style={[styles.opCard, styles.opCardBlue]}>
              <Package size={16} color='#60A5FA' />
              <Text style={[styles.opCardValue, { color: '#60A5FA' }]}>{total}</Text>
              <Text style={styles.opCardLabel}>Pacotes do Dia</Text>
            </View>
            {/* Total de Paradas — gold */}
            <View style={[styles.opCard, styles.opCardGold]}>
              <MapPin size={16} color={Colors.gold[400]} />
              <Text style={[styles.opCardValue, { color: Colors.gold[400] }]}>{totalStops}</Text>
              <Text style={styles.opCardLabel}>Total de Paradas</Text>
            </View>
            {/* Pacotes Entregues — green */}
            <View style={[styles.opCard, styles.opCardGreen]}>
              <CheckCircle2 size={16} color={Colors.success} />
              <Text style={[styles.opCardValue, { color: Colors.success }]}>{delivered}</Text>
              <Text style={styles.opCardLabel}>Entregues</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {/* Pacotes Pendentes — orange */}
            <View style={[styles.opCard, styles.opCardOrange]}>
              <Package size={16} color={Colors.warning} />
              <Text style={[styles.opCardValue, { color: Colors.warning }]}>{pending}</Text>
              <Text style={styles.opCardLabel}>Pendentes</Text>
            </View>
            {/* Paradas Concluídas — green */}
            <View style={[styles.opCard, styles.opCardGreen]}>
              <CheckCircle2 size={16} color={Colors.success} />
              <Text style={[styles.opCardValue, { color: Colors.success }]}>{completedStops}</Text>
              <Text style={styles.opCardLabel}>Paradas Concluídas</Text>
            </View>
            {/* Paradas Restantes — orange */}
            <View style={[styles.opCard, styles.opCardOrange]}>
              <MapPin size={16} color={Colors.warning} />
              <Text style={[styles.opCardValue, { color: Colors.warning }]}>{remainingStops}</Text>
              <Text style={styles.opCardLabel}>Paradas Restantes</Text>
            </View>
          </View>

          {/* Distance + Time */}
          <View style={styles.statsRow}>
            <View style={[styles.opCardWide, styles.opCardSlate]}>
              <View style={styles.opCardWideInner}>
                <Truck size={20} color={Colors.primary[200]} />
                <View>
                  <Text style={[styles.opCardValue, { color: Colors.primary[200], fontSize: FontSizes.xl }]}>
                    {remainingKm} km
                  </Text>
                  <Text style={styles.opCardLabel}>Distância Restante</Text>
                </View>
              </View>
            </View>
            <View style={[styles.opCardWide, styles.opCardSlate]}>
              <View style={styles.opCardWideInner}>
                <Clock size={20} color={Colors.primary[200]} />
                <View>
                  <Text style={[styles.opCardValue, { color: Colors.primary[200], fontSize: FontSizes.xl }]}>
                    {remainingHours > 0 ? `${remainingHours}h ${remainingMinRem}m` : `${remainingMins}m`}
                  </Text>
                  <Text style={styles.opCardLabel}>Tempo Restante</Text>
                </View>
              </View>
            </View>
          </View>

          {/* PROGRESS BAR */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>
                {delivered} / {total} Pacotes Entregues
              </Text>
              <Text style={styles.progressPct}>{progressPct}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            {motivationalMessage ? (
              <View style={styles.motivRow}>
                <Text style={styles.motivText}>{motivationalMessage}</Text>
              </View>
            ) : null}
          </View>
        </>
      )}

      {/* No route hint */}
      {!hasRoute && (
        <View style={styles.noRouteHint}>
          <Star size={16} color={Colors.gold[400]} />
          <Text style={styles.noRouteHintText}>
            Importe uma planilha para começar sua rota.
          </Text>
        </View>
      )}

      {/* RECENT ROUTES */}
      <Text style={styles.sectionTitle}>Rotas Recentes</Text>
      {recentRouteItems.length === 0 ? (
        <View style={styles.emptyHistoryRow}>
          <Text style={styles.emptyHistoryText}>Nenhuma rota concluída ainda.</Text>
        </View>
      ) : (
        recentRouteItems.slice(0, 5).map(entry => {
          const statusColor = entry.status === 'completed'
            ? Colors.success
            : entry.status === 'active'
              ? Colors.warning
              : Colors.gray;
          const statusLabel = entry.status === 'completed'
            ? 'Concluída'
            : entry.status === 'active'
              ? 'Em andamento'
              : 'Planejada';
          return (
            <View key={entry.key} style={styles.routeCard}>
              <View style={[styles.routeStatusBar, { backgroundColor: statusColor }]} />
              <View style={styles.routeCardBody}>
                <View style={styles.routeCardTopRow}>
                  <Text style={styles.routeCardName}>{entry.name}</Text>
                  <View style={[
                    styles.routeStatusBadge,
                    { backgroundColor: statusColor + '22', borderColor: statusColor + '55' },
                  ]}>
                    <Text style={[styles.routeStatusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
                <View style={styles.routeCardMetaRow}>
                  <View style={styles.routeMetaItem}>
                    <Package size={12} color={Colors.gray} />
                    <Text style={styles.routeMetaText}>{entry.totalPackages} pkgs</Text>
                  </View>
                  <View style={styles.routeMetaItem}>
                    <MapPin size={12} color={Colors.gray} />
                    <Text style={styles.routeMetaText}>{entry.totalStops} paradas</Text>
                  </View>
                  <View style={styles.routeMetaItem}>
                    <Truck size={12} color={Colors.gray} />
                    <Text style={styles.routeMetaText}>{entry.distance} km</Text>
                  </View>
                  <View style={styles.routeMetaItem}>
                    <Clock size={12} color={Colors.gray} />
                    <Text style={styles.routeMetaText}>{entry.date}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.xl,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logoCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.gold[500], alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.white },
  greeting: { fontSize: FontSizes.md, color: Colors.gray },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary[500],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.gold[500],
  },
  avatarText: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.gold[400] },

  // Rota de Hoje
  rotaCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(212,160,23,0.2)', gap: Spacing.md,
  },
  rotaCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rotaCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rotaCardTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.white },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3, gap: 5, borderWidth: 1, borderColor: Colors.successBorder,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  liveBadgeText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.success },
  rotaHeroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: Spacing.sm },
  rotaHeroItem: { alignItems: 'center', gap: 4, flex: 1 },
  rotaHeroDivider: { width: 1, height: 60, backgroundColor: 'rgba(212,160,23,0.15)' },
  rotaHeroValue: { fontSize: 40, fontWeight: '900', color: Colors.gold[400], lineHeight: 48 },
  rotaHeroLabel: { fontSize: FontSizes.sm, color: Colors.gray, fontWeight: '500', textAlign: 'center' },
  rotaFooter: {
    borderTopWidth: 1, borderTopColor: 'rgba(212,160,23,0.1)', paddingTop: Spacing.sm,
  },
  rotaFooterLabel: { fontSize: FontSizes.xs, color: Colors.gray, fontWeight: '600' },
  rotaFooterAddr: { fontSize: FontSizes.sm, color: Colors.white, fontWeight: '600', marginTop: 2 },
  rotaEmptyState: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  rotaEmptyText: { fontSize: FontSizes.lg, color: Colors.gray, fontWeight: '600' },
  rotaEmptySubtext: { fontSize: FontSizes.sm, color: Colors.darkGray, textAlign: 'center', lineHeight: 20 },

  reviewRouteButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  reviewRouteButtonText: {
    color: Colors.gold[400],
    fontSize: FontSizes.lg,
    fontWeight: '800',
  },

  importButton: { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md },
  importGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: Spacing.sm,
  },
  importText: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.primary[900] },

  activeRouteCard: { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md },
  activeRouteBanner: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.successBorder,
  },
  activeRouteInfo: { flex: 1 },
  activeRouteName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  activeRouteProgress: { fontSize: FontSizes.sm, color: Colors.gray, marginTop: 2 },
  activeRouteAction: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.success },

  // 6-card grid
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  opCard: {
    flex: 1, borderRadius: BorderRadius.md, borderWidth: 1,
    padding: Spacing.sm, alignItems: 'center', gap: 3,
  },
  opCardBlue: { backgroundColor: 'rgba(10,37,114,0.5)', borderColor: '#1E3A5F' },
  opCardGold: { backgroundColor: 'rgba(212,160,23,0.08)', borderColor: 'rgba(212,160,23,0.25)' },
  opCardGreen: { backgroundColor: Colors.successBg, borderColor: Colors.successBorder },
  opCardOrange: { backgroundColor: Colors.warningBg, borderColor: Colors.warningBorder },
  opCardValue: { fontSize: FontSizes.xxl, fontWeight: '900', lineHeight: 30 },
  opCardLabel: { fontSize: 10, color: Colors.gray, fontWeight: '600', textAlign: 'center' },

  opCardWide: { flex: 1, borderRadius: BorderRadius.md, borderWidth: 1, overflow: 'hidden' },
  opCardSlate: { backgroundColor: 'rgba(139,161,205,0.06)', borderColor: 'rgba(139,161,205,0.2)' },
  opCardWideInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },

  progressCard: {
    backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.md, gap: Spacing.md,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white, flex: 1 },
  progressPct: { fontSize: FontSizes.xxl, fontWeight: '900', color: Colors.success },
  progressBarBg: { height: 12, borderRadius: 6, backgroundColor: Colors.cardBorder, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6, backgroundColor: Colors.success },
  motivRow: {
    backgroundColor: 'rgba(212,160,23,0.07)', borderRadius: BorderRadius.sm,
    padding: Spacing.sm, borderWidth: 1, borderColor: 'rgba(212,160,23,0.15)',
  },
  motivText: { fontSize: FontSizes.sm, color: Colors.gold[300], fontWeight: '500', lineHeight: 18 },

  noRouteHint: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(212,160,23,0.06)', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: 'rgba(212,160,23,0.12)',
  },
  noRouteHintText: { flex: 1, fontSize: FontSizes.sm, color: Colors.gold[300], fontWeight: '500' },

  sectionTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.white, marginBottom: Spacing.md, marginTop: Spacing.sm },

  routeCard: {
    flexDirection: 'row', backgroundColor: Colors.cardBg, borderWidth: 1,
    borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, overflow: 'hidden',
  },
  routeStatusBar: { width: 4 },
  routeCardBody: { flex: 1, padding: Spacing.md, gap: 6 },
  routeCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeCardName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.white, flex: 1 },
  routeStatusBadge: {
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm,
    paddingVertical: 3, borderWidth: 1, marginLeft: Spacing.sm,
  },
  routeStatusBadgeText: { fontSize: FontSizes.xs, fontWeight: '700' },
  routeCardMetaRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  routeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeMetaText: { fontSize: FontSizes.xs, color: Colors.gray, fontWeight: '500' },
  routeMiniProgress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  routeMiniProgressBg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.cardBorder, overflow: 'hidden' },
  routeMiniProgressFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.warning },
  routeMiniProgressText: { fontSize: FontSizes.xs, color: Colors.gray, fontWeight: '600' },
  emptyHistoryRow: {
    padding: Spacing.lg, alignItems: 'center',
    backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
  },
  emptyHistoryText: { fontSize: FontSizes.sm, color: Colors.gray, fontWeight: '500' },
});
