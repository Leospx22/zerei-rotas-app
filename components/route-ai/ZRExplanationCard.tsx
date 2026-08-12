import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import type { RouteScoreFactor } from '@/lib/route-ai';
import { buildZRExplanations } from './zrPresentation';

interface ZRExplanationCardProps {
  factors: readonly RouteScoreFactor[];
}

export function ZRExplanationCard({ factors }: ZRExplanationCardProps) {
  const explanations = buildZRExplanations(factors);

  if (explanations.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Sugestões ZR™</Text>
      <Text style={styles.subtitle}>Por quê?</Text>
      <View style={styles.list}>
        {explanations.map(item => (
          <View key={item.label} style={styles.item}>
            <CheckCircle2 size={15} color={Colors.success} />
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
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
  title: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '900' },
  subtitle: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '900' },
  list: { gap: Spacing.sm },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  itemTextWrap: { flex: 1 },
  itemLabel: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: '800' },
  itemDetail: { color: Colors.gray, fontSize: FontSizes.xs, lineHeight: 16, marginTop: 2 },
});

