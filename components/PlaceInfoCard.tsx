import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Building2, CarFront, KeyRound, Lightbulb, Package } from 'lucide-react-native';
import { AppCard, AppText } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import type { DeliveryType, PlaceInfo } from '@/lib/placeIntelligence';

export interface PlaceInfoCardProps {
  place: PlaceInfo;
}

const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  portaria: 'Portaria',
  condominio: 'Condomínio',
  comercio: 'Comércio',
  endereco: 'Endereço comum',
};

export function PlaceInfoCard({ place }: PlaceInfoCardProps) {
  return (
    <AppCard variant="default" padding="small" style={styles.card}>
      <View style={styles.titleRow}>
        <Building2 size={18} color={Colors.gold[400]} />
        <AppText variant="bodyStrong">{DELIVERY_TYPE_LABELS[place.deliveryType]}</AppText>
      </View>

      {place.deliveryNote ? (
        <InfoRow icon={<Package size={15} color={Colors.gold[400]} />} text={place.deliveryNote} />
      ) : null}
      {place.accessNote ? (
        <InfoRow icon={<KeyRound size={15} color={Colors.gray} />} text={place.accessNote} />
      ) : null}
      {place.parkingNote ? (
        <InfoRow icon={<CarFront size={15} color={Colors.gray} />} text={place.parkingNote} />
      ) : null}
      {place.localTip ? (
        <InfoRow icon={<Lightbulb size={15} color={Colors.warning} />} text={place.localTip} />
      ) : null}
    </AppCard>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <AppText variant="label" color={Colors.offWhite} style={styles.infoText} numberOfLines={2}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
    backgroundColor: Colors.overlay,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
  },
});
