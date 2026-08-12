import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import type { RouteSimulationSummary } from '@/lib/route-ai';
import { formatDistance, formatMinutes } from './zrPresentation';

interface ZRSimulationCardProps {
  simulation: RouteSimulationSummary;
}

export function ZRSimulationCard({ simulation }: ZRSimulationCardProps) {
  const rows = [
    simulation.current,
    simulation.fastest,
    simulation.shortest,
    simulation.balanced,
    simulation.cluster,
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.brand}>ZR Runtime™ Simulation</Text>
      <View style={styles.rows}>
        {rows.map(row => {
          const isWinner = row.strategy === simulation.winner.strategy;
          return (
            <View key={row.strategy} style={[styles.row, isWinner && styles.winnerRow]}>
              <View style={styles.strategyCell}>
                {isWinner ? <Trophy size={13} color={Colors.gold[400]} /> : null}
                <Text style={[styles.strategy, isWinner && styles.winnerText]}>
                  {formatStrategy(row.strategy)}
                </Text>
              </View>
              <Text style={styles.value}>{formatDistance(row.distanceKm)}</Text>
              <Text style={styles.value}>{formatMinutes(row.durationMinutes)}</Text>
              <Text style={styles.value}>{row.confidence}%</Text>
              <Text style={[styles.value, row.savingsMinutes > 0 && styles.savings]}>
                {formatMinutes(row.savingsMinutes)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function formatStrategy(strategy: string): string {
  if (strategy === 'shortest-distance') return 'Shortest';
  return strategy[0].toUpperCase() + strategy.slice(1);
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  brand: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '900' },
  rows: { gap: Spacing.xs },
  row: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
  },
  winnerRow: {
    backgroundColor: 'rgba(212,160,23,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.25)',
  },
  strategyCell: { flex: 1.25, flexDirection: 'row', alignItems: 'center', gap: 4 },
  strategy: { color: Colors.white, fontSize: FontSizes.xs, fontWeight: '800' },
  winnerText: { color: Colors.gold[400] },
  value: { flex: 1, color: Colors.gray, fontSize: FontSizes.xs, fontWeight: '700', textAlign: 'right' },
  savings: { color: Colors.success },
});

