import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Copy, LocateFixed, MapPin } from 'lucide-react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import { mapStopStatusLabel, type MapStop } from '@/lib/mapOverview';
import { SHOPEE_PRIORITY_LABEL, UNRESOLVED_COORDINATE_LABEL } from '@/lib/routeStopPresentation';

interface RouteSequenceListProps {
  stops: MapStop[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  onNavigateStop?: (stop: MapStop) => void;
  onCopyStop?: (stop: MapStop) => void;
  onRetryLocateStop?: (stop: MapStop) => void;
  retryingStopId?: string | null;
}

export default function RouteSequenceList({
  stops,
  selectedStopId,
  onSelectStop,
  onNavigateStop,
  onCopyStop,
  onRetryLocateStop,
  retryingStopId,
}: RouteSequenceListProps) {
  return (
    <View style={styles.container}>
      {stops.map(stop => {
        const unresolved = stop.latitude === null || stop.longitude === null;

        return (
          <View
            key={stop.id}
            style={[styles.stopRow, selectedStopId === stop.id && styles.stopRowSelected]}
          >
            <TouchableOpacity
              style={styles.selectArea}
              onPress={() => onSelectStop(stop.id)}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={`${stop.badge}: ${stop.address}`}
            >
              <View style={[
                styles.number,
                stop.status === 'current' && styles.numberCurrent,
                stop.status === 'completed' && styles.numberCompleted,
              ]}>
                <Text style={styles.numberText}>
                  {stop.status === 'completed' ? 'âœ“' : stop.badge}
                </Text>
              </View>
              <View style={styles.stopCopy}>
                <Text style={styles.address}>{stop.address}</Text>
                <Text style={styles.meta}>
                  {stop.packageCount} {stop.packageCount === 1 ? 'pacote' : 'pacotes'} Â· {mapStopStatusLabel(stop.status)}
                  {stop.missingSpreadsheetStop ? ` · ${SHOPEE_PRIORITY_LABEL}` : ''}
                  {unresolved ? ` Â· ${UNRESOLVED_COORDINATE_LABEL}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
            {unresolved && onCopyStop ? (
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => onCopyStop(stop)}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel={`Copiar endereÃ§o desta parada: ${stop.address}`}
              >
                <Copy size={18} color={Colors.warning} />
              </TouchableOpacity>
            ) : null}
            {unresolved && onRetryLocateStop ? (
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => onRetryLocateStop(stop)}
                disabled={retryingStopId === stop.id}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel={`Tentar localizar novamente: ${stop.address}`}
              >
                <LocateFixed size={18} color={Colors.warning} />
              </TouchableOpacity>
            ) : null}
            {onNavigateStop ? (
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => onNavigateStop(stop)}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel={`Navegar atÃ© esta parada: ${stop.address}`}
              >
                <MapPin size={20} color={Colors.gold[400]} />
              </TouchableOpacity>
            ) : (
              <MapPin size={18} color={Colors.gold[400]} />
            )}
          </View>
        );
      })}
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
  iconAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
});
