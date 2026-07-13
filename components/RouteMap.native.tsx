import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';
import { buildSafeMapPayload, type MapStop } from '@/lib/mapOverview';

interface RouteMapProps {
  stops: MapStop[];
  selectedStopId: string | null;
  focusStopId: string | null;
  onSelectStop: (stopId: string) => void;
}

const ENABLE_MAP_DIAGNOSTICS =
  __DEV__ || process.env.EXPO_PUBLIC_ROUTE_MAP_DIAGNOSTICS === 'true';

function logMapDiagnostic(event: string, details: Record<string, unknown> = {}) {
  if (!ENABLE_MAP_DIAGNOSTICS) return;
  console.info('[ZR MAP]', event, details);
}

function markerColor(status: MapStop['status'], selected: boolean): string {
  if (selected) return Colors.primary[400];
  if (status === 'completed') return Colors.darkGray;
  if (status === 'current') return Colors.gold[400];
  return Colors.gold[600];
}

export default function RouteMap({ stops, selectedStopId, focusStopId, onSelectStop }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const fitAttemptedRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isContainerLaidOut, setIsContainerLaidOut] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [renderMarkers, setRenderMarkers] = useState(false);
  const [renderPolyline, setRenderPolyline] = useState(false);
  const safePayload = useMemo(
    () => buildSafeMapPayload(stops, selectedStopId),
    [selectedStopId, stops]
  );

  useEffect(() => {
    setIsMounted(true);
    logMapDiagnostic('component-mounted', {
      validCoordinates: safePayload.coordinates.length,
      markerCount: safePayload.markers.length,
      polylineCount: safePayload.polylineCoordinates.length,
      canRenderNativeMap: safePayload.canRenderNativeMap,
    });
    return undefined;
  }, []);

  useEffect(() => {
    setIsMapReady(false);
    setRenderMarkers(false);
    setRenderPolyline(false);
    fitAttemptedRef.current = false;
  }, [safePayload.initialRegion?.latitude, safePayload.initialRegion?.longitude, safePayload.markers.length]);

  useEffect(() => {
    if (!isMapReady) return;
    const markerTimer = setTimeout(() => {
      setRenderMarkers(true);
      logMapDiagnostic('markers-enabled', { markerCount: safePayload.markers.length });
    }, 50);
    return () => clearTimeout(markerTimer);
  }, [isMapReady, safePayload.markers.length]);

  useEffect(() => {
    if (!renderMarkers || safePayload.polylineCoordinates.length < 2) return;
    const polylineTimer = setTimeout(() => {
      setRenderPolyline(true);
      logMapDiagnostic('polyline-enabled', { polylineCount: safePayload.polylineCoordinates.length });
    }, 50);
    return () => clearTimeout(polylineTimer);
  }, [renderMarkers, safePayload.polylineCoordinates.length]);

  useEffect(() => {
    if (
      !isMapReady ||
      !isContainerLaidOut ||
      !renderMarkers ||
      safePayload.coordinates.length <= 1 ||
      fitAttemptedRef.current
    ) {
      return;
    }

    fitAttemptedRef.current = true;
    const timer = setTimeout(() => {
      try {
        logMapDiagnostic('fit-attempt', { coordinateCount: safePayload.coordinates.length });
        mapRef.current?.fitToCoordinates(safePayload.coordinates, {
          edgePadding: { top: 56, right: 48, bottom: 56, left: 48 },
          animated: false,
        });
      } catch (error) {
        logMapDiagnostic('fit-failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [isContainerLaidOut, isMapReady, renderMarkers, safePayload.coordinates]);

  useEffect(() => {
    if (!isMapReady || !focusStopId) return;
    const marker = safePayload.markers.find(candidate => candidate.stop.id === focusStopId);
    if (!marker) return;
    try {
      mapRef.current?.animateToRegion({
        latitude: marker.stop.latitude,
        longitude: marker.stop.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 300);
    } catch (error) {
      logMapDiagnostic('focus-failed', {
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }, [focusStopId, isMapReady, safePayload.markers]);

  if (!safePayload.canRenderNativeMap || !safePayload.initialRegion) {
    return (
      <View style={styles.unavailable}>
        <Text style={styles.unavailableTitle}>Não foi possível carregar o mapa agora.</Text>
        <Text style={styles.unavailableText}>Você ainda pode usar a lista da rota.</Text>
      </View>
    );
  }

  const shouldMountMap = isMounted && isContainerLaidOut;

  return (
    <View
      style={styles.mapShell}
      onLayout={() => setIsContainerLaidOut(true)}
    >
      {!shouldMountMap ? (
        <View style={styles.preparingMap}>
          <Text style={styles.preparingText}>Preparando mapa...</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={safePayload.initialRegion}
          toolbarEnabled={false}
          onMapReady={() => {
            logMapDiagnostic('map-ready', {
              markerCount: safePayload.markers.length,
              polylineCount: safePayload.polylineCoordinates.length,
            });
            setIsMapReady(true);
          }}
        >
          {renderMarkers ? safePayload.markers.map(({ key, stop }) => {
            const selected = safePayload.selectedStopId === stop.id;
            return (
              <Marker
                key={key}
                identifier={key}
                coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                title={stop.badge}
                description={stop.address}
                pinColor={markerColor(stop.status, selected)}
                onPress={() => onSelectStop(stop.id)}
              />
            );
          }) : null}
          {renderPolyline && safePayload.polylineCoordinates.length >= 2 ? (
            <Polyline
              coordinates={safePayload.polylineCoordinates}
              strokeColor={Colors.gold[500]}
              strokeWidth={3}
            />
          ) : null}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapShell: {
    width: '100%',
    height: 390,
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.cardBg,
  },
  map: { width: '100%', height: '100%' },
  unavailable: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.cardBg,
  },
  unavailableTitle: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '800', textAlign: 'center' },
  unavailableText: { color: Colors.gray, fontSize: FontSizes.sm, textAlign: 'center' },
  preparingMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  preparingText: { color: Colors.gray, fontSize: FontSizes.sm, textAlign: 'center' },
});
