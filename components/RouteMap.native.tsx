import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { BorderRadius, Colors, FontSizes } from '@/constants/theme';
import RouteSequenceList from '@/components/RouteSequenceList';
import type { MapStop } from '@/lib/mapOverview';

interface RouteMapProps {
  stops: MapStop[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
}

export default function RouteMap({ stops, selectedStopId, onSelectStop }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const locatedStops = useMemo(
    () => stops.filter(
      (stop): stop is MapStop & { latitude: number; longitude: number } =>
        stop.latitude !== null && stop.longitude !== null
    ),
    [stops]
  );
  const coordinates = useMemo(
    () => locatedStops.map(stop => ({ latitude: stop.latitude, longitude: stop.longitude })),
    [locatedStops]
  );

  useEffect(() => {
    if (coordinates.length === 0) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: false,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [coordinates]);

  if (locatedStops.length === 0) {
    return (
      <RouteSequenceList
        stops={stops}
        selectedStopId={selectedStopId}
        onSelectStop={onSelectStop}
      />
    );
  }

  const initial = locatedStops[0];

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={{
        latitude: initial.latitude,
        longitude: initial.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
      toolbarEnabled={false}
    >
      {coordinates.length > 1 ? (
        <Polyline coordinates={coordinates} strokeColor={Colors.gold[500]} strokeWidth={3} />
      ) : null}
      {locatedStops.map(stop => {
        const selected = selectedStopId === stop.id;
        const completed = stop.status === 'completed';
        const current = stop.status === 'current';
        return (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            onPress={() => onSelectStop(stop.id)}
            tracksViewChanges={selected}
            accessibilityLabel={`Parada ${stop.order}: ${stop.address}`}
          >
            <View style={[
              styles.marker,
              current && styles.markerCurrent,
              completed && styles.markerCompleted,
              selected && styles.markerSelected,
            ]}>
              <Text style={styles.markerText}>{completed ? '✓' : stop.order}</Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 390, borderRadius: BorderRadius.lg },
  marker: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.gold[600],
  },
  markerCurrent: { borderColor: Colors.gold[200], backgroundColor: Colors.gold[400] },
  markerCompleted: { backgroundColor: Colors.darkGray },
  markerSelected: { borderColor: Colors.gold[200], transform: [{ scale: 1.15 }] },
  markerText: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: '900' },
});
