import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Package,
  CheckCircle2,
  MapPin,
  TrendingUp,
  FileSpreadsheet,
  Trophy,
  Clock,
  Truck,
  Star,
  Users,
  UserPlus,
  CalendarRange,
  ShieldCheck,
  BadgeCheck,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { PageAnalyticsHeader } from '@/components/analytics/PageAnalyticsHeader';
import { FounderAlerts } from '@/components/dashboard/FounderAlerts';
import { ConversionFunnel as DashboardConversionFunnel } from '@/components/dashboard/Funnel';
import { GrowthCharts } from '@/components/dashboard/Charts';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { FounderWaitlistTable } from '@/components/FounderWaitlistTable';
import { FounderInlineSkeleton } from '@/components/founder/FounderStates';
import { AnimatedValueText, FadeInView, ScreenSkeleton } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useRoute } from '@/contexts/RouteContext';
import { useAnalyticsTime } from '@/contexts/AnalyticsTimeContext';
import { useDashboard } from '@/hooks/useDashboard';
import { fetchFounderAdminAccess } from '@/lib/founderAccess';
import { fetchFounderDashboardMetrics } from '@/lib/founderDashboardMetrics';
import { getFounderUsers } from '@/lib/founderUsers';
import { getFounderWaitlist } from '@/lib/founderWaitlist';
import type { FounderDashboardMetrics } from '@/types/founderDashboardMetrics';
import type { FounderWaitlistLead } from '@/types/founderWaitlist';
import type { FounderUser } from '@/types/founderUsers';

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

const EMPTY_FOUNDER_USERS: FounderUser[] = [];
const EMPTY_WAITLIST_LEADS: FounderWaitlistLead[] = [];

function formatCurrencyFromCents(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatShortDate(value: Date): string {
  return value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatGeneratedAt(value: string | null | undefined): string {
  if (!value) return 'Aguardando dados';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Aguardando dados';
  return `Atualizado ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeChartKey(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== 'Nao informado' ? trimmed : '';
}

function normalizePlatform(value: string): 'Shopee' | 'Mercado Livre' | 'Amazon' | 'Loggi' | 'Outra' {
  const token = normalizeChartKey(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

  if (token.includes('shopee')) return 'Shopee';
  if (token.includes('mercado') || token.includes('ml')) return 'Mercado Livre';
  if (token.includes('amazon')) return 'Amazon';
  if (token.includes('loggi')) return 'Loggi';
  return 'Outra';
}

function buildDailyWaitlistData(leads: FounderWaitlistLead[]) {
  const counts = new Map<string, number>();

  leads.forEach(lead => {
    const date = parseDate(lead.createdAt);
    if (!date) return;

    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-14)
    .map(([date, value]) => ({
      date,
      label: formatShortDate(new Date(`${date}T00:00:00`)),
      value,
    }));
}

function buildPlatformDistribution(leads: FounderWaitlistLead[]) {
  const order = ['Shopee', 'Mercado Livre', 'Amazon', 'Loggi', 'Outra'] as const;
  const counts = new Map<(typeof order)[number], number>(order.map(platform => [platform, 0]));

  leads.forEach(lead => {
    if (!normalizeChartKey(lead.platform)) return;
    const platform = normalizePlatform(lead.platform);
    counts.set(platform, (counts.get(platform) ?? 0) + 1);
  });

  return order.map(platform => ({ label: platform, value: counts.get(platform) ?? 0 }));
}

function buildCityDistribution(leads: FounderWaitlistLead[]) {
  const counts = new Map<string, number>();

  leads.forEach(lead => {
    const city = normalizeChartKey(lead.city);
    if (!city) return;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, 10);
}

function KpiCard({
  label,
  value,
  icon,
  tone,
  helper,
  loading = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
  helper?: string;
  loading?: boolean;
}) {
  return (
    <View style={[styles.kpiCard, { borderColor: `${tone}55`, backgroundColor: `${tone}12` }]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${tone}1F` }]}>
        {icon}
      </View>
      {loading ? (
        <FounderInlineSkeleton compact />
      ) : (
        <>
          <AnimatedValueText
            value={value}
            style={styles.kpiValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value}
          </AnimatedValueText>
          <Text style={styles.kpiLabel} numberOfLines={2}>
            {label}
          </Text>
          {helper ? (
            <Text style={styles.kpiHelper} numberOfLines={1}>
              {helper}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function FounderKpiCards() {
  const analyticsTime = useAnalyticsTime();
  const metricsQuery = useQuery({
    queryKey: ['founder-dashboard-metrics'],
    queryFn: fetchFounderDashboardMetrics,
    retry: 1,
  });

  const metrics = metricsQuery.data;
  const loading = metricsQuery.isLoading;
  const loadingValue = '0';
  const trialConversion = metrics && metrics.registeredUsers > 0
    ? `${Math.round((metrics.trialUsers / metrics.registeredUsers) * 100)}%`
    : loadingValue;
  const premiumConversion = metrics && metrics.registeredUsers > 0
    ? `${Math.round((metrics.premiumUsers / metrics.registeredUsers) * 100)}%`
    : loadingValue;
  const growthValue = metrics
    ? String(metrics.newWaitlistThisWeek ?? metrics.newWaitlistToday)
    : loadingValue;

  return (
    <View style={styles.founderSection}>
      <PageAnalyticsHeader
        title="Founder Dashboard"
        timeRange={analyticsTime.dashboardRange}
        onTimeRangeChange={analyticsTime.setDashboardRange}
        actions={metricsQuery.isError ? (
          <View style={styles.founderErrorBadge}>
            <AlertCircle size={14} color={Colors.error} />
            <Text style={styles.founderErrorText}>Data unavailable</Text>
          </View>
        ) : null}
      >
        <Text style={styles.founderSubtitle}>
          {formatGeneratedAt(metrics?.generatedAt)}
        </Text>
      </PageAnalyticsHeader>

      <View style={styles.kpiGrid}>
        <KpiCard
          label="Registered Users"
          value={metrics ? String(metrics.registeredUsers) : loadingValue}
          icon={<ShieldCheck size={18} color={Colors.success} />}
          tone={Colors.success}
          loading={loading}
        />
        <KpiCard
          label="Trial Users"
          value={metrics ? String(metrics.trialUsers) : loadingValue}
          icon={<Clock size={18} color={Colors.warning} />}
          tone={Colors.warning}
          loading={loading}
        />
        <KpiCard
          label="Premium Users"
          value={metrics ? String(metrics.premiumUsers) : loadingValue}
          icon={<BadgeCheck size={18} color={Colors.gold[400]} />}
          tone={Colors.gold[500]}
          loading={loading}
        />
        <KpiCard
          label="MRR"
          value={metrics ? formatCurrencyFromCents(metrics.mrrCents) : loadingValue}
          icon={<DollarSign size={18} color={Colors.success} />}
          tone={Colors.success}
          loading={loading}
        />
        <KpiCard
          label="Waitlist"
          value={metrics ? String(metrics.totalWaitlist) : loadingValue}
          icon={<Users size={18} color={Colors.gold[400]} />}
          tone={Colors.gold[500]}
          loading={loading}
        />
        <KpiCard
          label="Trial Conversion"
          value={trialConversion}
          icon={<UserPlus size={18} color="#60A5FA" />}
          tone="#60A5FA"
          helper="Trials / registered"
          loading={loading}
        />
        <KpiCard
          label="Premium Conversion"
          value={premiumConversion}
          icon={<TrendingUp size={18} color={Colors.success} />}
          tone={Colors.success}
          helper="Premium / registered"
          loading={loading}
        />
        <KpiCard
          label="Growth"
          value={growthValue}
          icon={<CalendarRange size={18} color={Colors.warning} />}
          tone={Colors.warning}
          helper={metrics?.newWaitlistThisWeek == null ? 'Today' : `Since ${formatShortDate(analyticsTime.weekStart)}`}
          loading={loading}
        />
      </View>
    </View>
  );
}

function ChartPlaceholder({ message }: { message: string }) {
  return (
    <View style={styles.chartPlaceholder}>
      <AlertCircle size={18} color={Colors.warning} />
      <Text style={styles.chartPlaceholderText}>{message}</Text>
    </View>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.chartCard}>
      <View>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function DailyWaitlistLineChart({ data }: { data: ReturnType<typeof buildDailyWaitlistData> }) {
  const [width, setWidth] = React.useState(320);
  const height = 210;
  const padding = { top: 20, right: 18, bottom: 34, left: 34 };
  const chartWidth = Math.max(width - padding.left - padding.right, 1);
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map(point => point.value), 1);
  const xForIndex = (index: number) =>
    padding.left + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
  const yForValue = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const linePath = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForValue(point.value)}`)
    .join(' ');
  const labelIndexes = data.length <= 6
    ? data.map((_, index) => index)
    : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <View
      style={styles.chartCanvas}
      onLayout={(event: LayoutChangeEvent) => setWidth(Math.max(event.nativeEvent.layout.width, 260))}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={1}
        />
        <Line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={1}
        />
        {[0.25, 0.5, 0.75].map(step => (
          <Line
            key={step}
            x1={padding.left}
            y1={padding.top + chartHeight * step}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight * step}
            stroke="rgba(148,163,184,0.12)"
            strokeWidth={1}
          />
        ))}
        <Path d={linePath} fill="none" stroke={Colors.gold[400]} strokeWidth={3} strokeLinecap="round" />
        {data.map((point, index) => (
          <Circle
            key={point.date}
            cx={xForIndex(index)}
            cy={yForValue(point.value)}
            r={4}
            fill={Colors.background}
            stroke={Colors.gold[400]}
            strokeWidth={2}
          />
        ))}
        <SvgText x={padding.left - 8} y={padding.top + 6} fill={Colors.gray} fontSize={11} textAnchor="end">
          {maxValue}
        </SvgText>
        <SvgText x={padding.left - 8} y={padding.top + chartHeight} fill={Colors.gray} fontSize={11} textAnchor="end">
          0
        </SvgText>
        {labelIndexes.map(index => (
          <SvgText
            key={data[index].date}
            x={xForIndex(index)}
            y={height - 10}
            fill={Colors.gray}
            fontSize={11}
            textAnchor="middle"
          >
            {data[index].label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function PlatformDonutChart({ data }: { data: ReturnType<typeof buildPlatformDistribution> }) {
  const colors = ['#F97316', '#60A5FA', '#FACC15', '#22C55E', '#94A3B8'];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={styles.donutLayout}>
      <Svg width={170} height={170} viewBox="0 0 170 170">
        <Circle cx={85} cy={85} r={radius} stroke="rgba(148,163,184,0.16)" strokeWidth={22} fill="none" />
        <G rotation="-90" origin="85, 85">
          {data.map((item, index) => {
            const length = total === 0 ? 0 : (item.value / total) * circumference;
            const dashOffset = offset;
            offset += length;
            return (
              <Circle
                key={item.label}
                cx={85}
                cy={85}
                r={radius}
                stroke={colors[index]}
                strokeWidth={22}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-dashOffset}
                strokeLinecap="butt"
                fill="none"
              />
            );
          })}
        </G>
        <SvgText x={85} y={80} fill={Colors.white} fontSize={26} fontWeight="900" textAnchor="middle">
          {total}
        </SvgText>
        <SvgText x={85} y={101} fill={Colors.gray} fontSize={12} fontWeight="700" textAnchor="middle">
          leads
        </SvgText>
      </Svg>
      <View style={styles.chartLegend}>
        {data.map((item, index) => (
          <View key={item.label} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: colors[index] }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>{item.label}</Text>
            <Text style={styles.legendValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CityBarChart({ data }: { data: ReturnType<typeof buildCityDistribution> }) {
  const maxValue = Math.max(...data.map(item => item.value), 1);

  return (
    <View style={styles.barList}>
      {data.map(item => (
        <View key={item.label} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max((item.value / maxValue) * 100, 4)}%` }]} />
          </View>
          <Text style={styles.barValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ConversionFunnel({ metrics }: { metrics: FounderDashboardMetrics }) {
  const stages = [
    { label: 'Waitlist', value: metrics.totalWaitlist, color: Colors.gold[400] },
    { label: 'Registered', value: metrics.registeredUsers, color: '#60A5FA' },
    { label: 'Trial', value: metrics.trialUsers, color: Colors.warning },
    { label: 'Premium', value: metrics.premiumUsers, color: Colors.success },
  ];
  const maxValue = Math.max(...stages.map(stage => stage.value), 1);

  return (
    <View style={styles.funnelList}>
      {stages.map((stage, index) => (
        <React.Fragment key={stage.label}>
          <View style={styles.funnelStage}>
            <View style={styles.funnelStageHeader}>
              <Text style={styles.funnelLabel}>{stage.label}</Text>
              <Text style={styles.funnelValue}>{stage.value}</Text>
            </View>
            <View style={styles.funnelTrack}>
              <View
                style={[
                  styles.funnelFill,
                  {
                    width: `${Math.max((stage.value / maxValue) * 100, 7)}%`,
                    backgroundColor: stage.color,
                  },
                ]}
              />
            </View>
          </View>
          {index < stages.length - 1 ? <Text style={styles.funnelArrow}>↓</Text> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

void ConversionFunnel;

function FounderAnalyticsCharts() {
  const analyticsTime = useAnalyticsTime();
  const metricsQuery = useQuery({
    queryKey: ['founder-dashboard-metrics'],
    queryFn: fetchFounderDashboardMetrics,
    retry: 1,
  });
  const waitlistQuery = useQuery({
    queryKey: ['founder-waitlist', analyticsTime.dashboardRange],
    queryFn: () => getFounderWaitlist(analyticsTime.dashboardRange),
    retry: 1,
  });
  const usersQuery = useQuery({
    queryKey: ['founder-users', analyticsTime.dashboardRange],
    queryFn: () => getFounderUsers(analyticsTime.dashboardRange),
    retry: 1,
  });

  const waitlist = waitlistQuery.data ?? EMPTY_WAITLIST_LEADS;
  const users = usersQuery.data ?? EMPTY_FOUNDER_USERS;
  const dailyData = useMemo(() => buildDailyWaitlistData(waitlist), [waitlist]);
  const platformData = useMemo(() => buildPlatformDistribution(waitlist), [waitlist]);
  const cityData = useMemo(() => buildCityDistribution(waitlist), [waitlist]);
  const hasPlatformData = useMemo(() => platformData.some(item => item.value > 0), [platformData]);

  const waitlistPlaceholder = waitlistQuery.isLoading
    ? 'Loading waitlist data...'
    : waitlistQuery.isError
      ? 'We could not load waitlist chart data right now.'
      : 'No waitlist activity is available for this chart yet.';

  return (
    <View style={styles.analyticsSection}>
      <View>
        <Text style={styles.analyticsTitle}>Analytics</Text>
        <Text style={styles.analyticsSubtitle}>Visual read-only insights from Founder RPCs.</Text>
      </View>

      <GrowthCharts users={users} waitlist={waitlist} />

      <View style={styles.chartGrid}>
        <ChartCard title="Daily Waitlist Signups" subtitle="Last 14 days with available lead timestamps">
          {dailyData.length > 0 ? (
            <DailyWaitlistLineChart data={dailyData} />
          ) : (
            <ChartPlaceholder message={waitlistPlaceholder} />
          )}
        </ChartCard>

        <ChartCard title="Platform Distribution" subtitle="Shopee, Mercado Livre, Amazon, Loggi, Outra">
          {hasPlatformData ? (
            <PlatformDonutChart data={platformData} />
          ) : (
            <ChartPlaceholder message={waitlistPlaceholder} />
          )}
        </ChartCard>

        <ChartCard title="City Distribution" subtitle="Top 10 cities from waitlist RPC">
          {cityData.length > 0 ? (
            <CityBarChart data={cityData} />
          ) : (
            <ChartPlaceholder message={waitlistPlaceholder} />
          )}
        </ChartCard>

      </View>

      <DashboardConversionFunnel metrics={metricsQuery.data ?? null} />
      <RecentActivity users={users} waitlist={waitlist} />
      <FounderAlerts metrics={metricsQuery.data ?? null} users={users} />
      <QuickActions />
    </View>
  );
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
  }, [opacity, rotate, scale, shimmer]);

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
  const { admin } = useLocalSearchParams<{ admin?: string }>();
  const { session } = useAuth();
  const analyticsTime = useAnalyticsTime();
  const founderAccessQuery = useQuery({
    queryKey: ['founder-admin-access', session?.user.id],
    queryFn: fetchFounderAdminAccess,
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const showFounderAdmin = Boolean(session) && founderAccessQuery.data === true;
  const showFounderDashboard = showFounderAdmin && admin === '1';
  const {
    currentRoute,
    isLoading,
    routeHistory: recentRoutes,
    restoreNotice,
    clearRestoreNotice,
  } = useRoute();
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

  const recentRouteItems: RecentRouteItem[] = useMemo(() => [
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
  ], [currentRoute, recentRoutes]);

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct / 100,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressAnim, progressPct]);

  if (hasRoute && currentRoute!.status === 'completed') {
    return <CelebrationScreen route={currentRoute} />;
  }

  if (isLoading) {
    return <ScreenSkeleton message="Carregando painel..." rows={5} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <FadeInView style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <HeaderBrandIcon size={24} containerSize={44} filled />
          </View>
          <View>
            <Text style={styles.brandName}>Zerei Rotas</Text>
            <Text style={styles.greeting}>{getGreeting()}, Motorista</Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
      </FadeInView>

      {showFounderDashboard ? (
        <>
          <FounderKpiCards />
          <FounderAnalyticsCharts />
          <FounderWaitlistTable timeRange={analyticsTime.dashboardRange} />
        </>
      ) : (
        <>

      {restoreNotice ? (
        <TouchableOpacity
          style={styles.restoreNotice}
          onPress={clearRestoreNotice}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso de rota restaurada"
        >
          <CheckCircle2 size={18} color={Colors.success} />
          <Text style={styles.restoreNoticeText}>{restoreNotice}</Text>
        </TouchableOpacity>
      ) : null}

      {/* ROTA DE HOJE hero card */}
      <FadeInView delay={40}>
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
                <AnimatedValueText style={styles.rotaHeroValue} value={total}>
                  {total}
                </AnimatedValueText>
                <Text style={styles.rotaHeroLabel}>Pacotes</Text>
              </View>
              <View style={styles.rotaHeroDivider} />
              <View style={styles.rotaHeroItem}>
                <MapPin size={28} color={Colors.gold[300]} />
                <AnimatedValueText
                  style={[styles.rotaHeroValue, { color: Colors.gold[300] }]}
                  value={totalStops}
                >
                  {totalStops}
                </AnimatedValueText>
                <Text style={styles.rotaHeroLabel}>Paradas</Text>
              </View>
              <View style={styles.rotaHeroDivider} />
              <View style={styles.rotaHeroItem}>
                <Trophy size={28} color={Colors.success} />
                <AnimatedValueText
                  style={[styles.rotaHeroValue, { color: Colors.success }]}
                  value={largestStop?.packageCount ?? 0}
                >
                  {largestStop?.packageCount ?? 0}
                </AnimatedValueText>
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
      </FadeInView>

      {currentRoute && currentRoute.status !== 'completed' ? (
        <TouchableOpacity
          style={styles.reviewRouteButton}
          onPress={() => router.push('/(tabs)/routes/delivery-preparation')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Revisar rota"
        >
          <MapPin size={19} color={Colors.gold[400]} />
          <Text style={styles.reviewRouteButtonText}>Revisar rota</Text>
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
          <Text style={styles.importText}>Importar planilha</Text>
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
                    <Text style={styles.routeMetaText}>{entry.totalPackages} pacotes</Text>
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
        </>
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
  restoreNotice: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    backgroundColor: Colors.successBg,
  },
  restoreNoticeText: {
    flex: 1,
    color: Colors.success,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },

  founderSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  founderSubtitle: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.gray,
  },
  founderErrorBadge: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  founderErrorText: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.error,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kpiCard: {
    width: '24%',
    minWidth: 150,
    minHeight: 132,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 6,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: FontSizes.xxl,
    lineHeight: 30,
    fontWeight: '900',
    color: Colors.white,
  },
  kpiLabel: {
    minHeight: 32,
    fontSize: FontSizes.sm,
    lineHeight: 16,
    fontWeight: '800',
    color: Colors.gray,
  },
  kpiHelper: {
    marginTop: 'auto',
    fontSize: FontSizes.xs,
    lineHeight: 14,
    fontWeight: '700',
    color: Colors.darkGray,
  },
  analyticsSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  analyticsTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.white,
  },
  analyticsSubtitle: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.gray,
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  chartCard: {
    flexGrow: 1,
    flexBasis: 360,
    minWidth: 280,
    minHeight: 316,
    padding: Spacing.md,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  chartTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.white,
  },
  chartSubtitle: {
    marginTop: 2,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    fontWeight: '700',
    color: Colors.gray,
  },
  chartCanvas: {
    width: '100%',
    minHeight: 210,
  },
  chartPlaceholder: {
    flex: 1,
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.24)',
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  chartPlaceholderText: {
    maxWidth: 320,
    color: Colors.warning,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  donutLayout: {
    flex: 1,
    minHeight: 210,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    flexWrap: 'wrap',
  },
  chartLegend: {
    minWidth: 190,
    gap: Spacing.sm,
  },
  legendRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    minWidth: 0,
    color: Colors.offWhite,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  legendValue: {
    minWidth: 28,
    textAlign: 'right',
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '900',
  },
  barList: {
    gap: Spacing.sm,
  },
  barRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: {
    width: 104,
    color: Colors.offWhite,
    fontSize: FontSizes.xs,
    fontWeight: '800',
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(148,163,184,0.16)',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#60A5FA',
  },
  barValue: {
    width: 28,
    textAlign: 'right',
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: '900',
  },
  funnelList: {
    gap: Spacing.xs,
  },
  funnelStage: {
    gap: Spacing.xs,
  },
  funnelStageHeader: {
    minHeight: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  funnelLabel: {
    color: Colors.offWhite,
    fontSize: FontSizes.sm,
    fontWeight: '800',
  },
  funnelValue: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '900',
  },
  funnelTrack: {
    height: 24,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(148,163,184,0.16)',
  },
  funnelFill: {
    height: '100%',
    borderRadius: 6,
  },
  funnelArrow: {
    color: Colors.gray,
    fontSize: FontSizes.lg,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
  },

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
