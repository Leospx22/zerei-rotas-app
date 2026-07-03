import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import type { MapStop } from '@/lib/mapOverview';

interface RouteMapProps {
  stops: MapStop[];
  selectedStopId: string | null;
  focusStopId: string | null;
  onSelectStop: (stopId: string) => void;
}

export default function RouteMap({ stops }: RouteMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.notice}>
        O mapa interativo está disponível no Android e iOS. Confira abaixo a sequência da rota.
      </Text>
      <Text style={styles.stopCount}>
        {stops.length} {stops.length === 1 ? 'parada na rota' : 'paradas na rota'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  notice: {
    color: Colors.gray,
    fontSize: FontSizes.sm,
    lineHeight: 18,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.overlay,
  },
  stopCount: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '700' },
});
