import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { BorderRadius, Colors, FontSizes } from '@/constants/theme';
import { getLocatedMapStops, type MapStop } from '@/lib/mapOverview';

interface RouteMapProps {
  stops: MapStop[];
  selectedStopId: string | null;
  focusStopId: string | null;
  onSelectStop: (stopId: string) => void;
}

export default function RouteMap({ stops, selectedStopId, focusStopId, onSelectStop }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isMapLaidOut, setIsMapLaidOut] = useState(false);
  const [tracksMarkerChanges, setTracksMarkerChanges] = useState(true);
  const locatedStops = useMemo(
    () => getLocatedMapStops(stops),
    [stops]
  );
  const coordinates = useMemo(
    () => locatedStops.map(stop => ({ latitude: stop.latitude, longitude: stop.longitude })),
    [locatedStops]
  );

  useEffect(() => {
    if (!isMapReady || !isMapLaidOut || coordinates.length === 0) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: false,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [coordinates, isMapLaidOut, isMapReady]);

  useEffect(() => {
    setTracksMarkerChanges(true);
    const timer = setTimeout(() => setTracksMarkerChanges(false), 1000);
    return () => clearTimeout(timer);
  }, [selectedStopId, stops]);

  useEffect(() => {
    if (!isMapReady || !focusStopId) return;
    const stop = locatedStops.find(candidate => candidate.id === focusStopId);
    if (!stop) return;
    mapRef.current?.animateToRegion({
      latitude: stop.latitude,
      longitude: stop.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 300);
  }, [focusStopId, isMapReady, locatedStops]);

  if (locatedStops.length === 0) {
    return (
      <View style={styles.unavailable}>
        <Text style={styles.unavailableText}>Nenhuma parada com coordenadas válidas.</Text>
      </View>
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
      onMapReady={() => setIsMapReady(true)}
      onLayout={() => setIsMapLaidOut(true)}
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
            tracksViewChanges={tracksMarkerChanges}
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
  unavailable: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.cardBg,
  },
  unavailableText: { color: Colors.gray, fontSize: FontSizes.md },
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
