import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import { mapStopStatusLabel, type MapStop } from '@/lib/mapOverview';

interface RouteSequenceListProps {
  stops: MapStop[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  onNavigateStop?: (stop: MapStop) => void;
}

export default function RouteSequenceList({
  stops,
  selectedStopId,
  onSelectStop,
  onNavigateStop,
}: RouteSequenceListProps) {
  return (
    <View style={styles.container}>
      {stops.map(stop => (
        <View
          key={stop.id}
          style={[styles.stopRow, selectedStopId === stop.id && styles.stopRowSelected]}
        >
          <TouchableOpacity
            style={styles.selectArea}
            onPress={() => onSelectStop(stop.id)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Parada ${stop.order}: ${stop.address}`}
          >
            <View style={[
              styles.number,
              stop.status === 'current' && styles.numberCurrent,
              stop.status === 'completed' && styles.numberCompleted,
            ]}>
              <Text style={styles.numberText}>{stop.status === 'completed' ? '✓' : stop.order}</Text>
            </View>
            <View style={styles.stopCopy}>
              <Text style={styles.address}>{stop.address}</Text>
              <Text style={styles.meta}>
                {stop.packageCount} {stop.packageCount === 1 ? 'pacote' : 'pacotes'} · {mapStopStatusLabel(stop.status)}
                {stop.latitude === null || stop.longitude === null ? ' · Sem coordenadas' : ''}
              </Text>
            </View>
          </TouchableOpacity>
          {onNavigateStop ? (
            <TouchableOpacity
              style={styles.navigateAction}
              onPress={() => onNavigateStop(stop)}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={`Navegar até esta parada: ${stop.address}`}
            >
              <MapPin size={20} color={Colors.gold[400]} />
            </TouchableOpacity>
          ) : (
            <MapPin size={18} color={Colors.gold[400]} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  stopRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  stopRowSelected: { borderColor: Colors.gold[500] },
  selectArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  number: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gold[600],
  },
  numberCurrent: { borderWidth: 2, borderColor: Colors.white, backgroundColor: Colors.gold[400] },
  numberCompleted: { backgroundColor: Colors.darkGray },
  numberText: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: '900' },
  stopCopy: { flex: 1, gap: 3 },
  address: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '700' },
  meta: { color: Colors.gray, fontSize: FontSizes.sm },
  navigateAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
});
