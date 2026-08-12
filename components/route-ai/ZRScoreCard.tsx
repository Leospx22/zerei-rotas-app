import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import type { RouteScoreResult } from '@/lib/route-ai';
import { getZRScoreBand } from './zrPresentation';

interface ZRScoreCardProps {
  score: RouteScoreResult;
}

export function ZRScoreCard({ score }: ZRScoreCardProps) {
  const band = getZRScoreBand(score.score);
  const color = scoreColors[band];

  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { borderColor: color }]}>
        <Text style={[styles.score, { color }]}>{score.score}</Text>
        <Text style={styles.outOf}>/ 100</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.brand}>ZR Score™</Text>
        <Text style={[styles.band, { color }]}>{band}</Text>
        {score.reasons.slice(0, 3).map(reason => (
          <Text key={reason} style={styles.reason}>{reason}</Text>
        ))}
      </View>
    </View>
  );
}

const scoreColors = {
  Excelente: Colors.success,
  Boa: Colors.gold[400],
  Regular: Colors.warning,
  Ruim: Colors.error,
} as const;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ring: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  score: { fontSize: 34, fontWeight: '900', lineHeight: 38 },
  outOf: { color: Colors.gray, fontSize: FontSizes.xs, fontWeight: '800' },
  copy: { flex: 1, gap: 3 },
  brand: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '900' },
  band: { fontSize: FontSizes.xl, fontWeight: '900' },
  reason: { color: Colors.gray, fontSize: FontSizes.xs, lineHeight: 16 },
});

