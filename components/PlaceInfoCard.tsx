import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

      {place.parkingNote ? (
        <InfoRow
          icon={<CarFront size={15} color={Colors.gray} />}
          label="Estacionamento"
          text={place.parkingNote}
        />
      ) : null}
      {place.accessNote ? (
        <InfoRow
          icon={<KeyRound size={15} color={Colors.gray} />}
          label="Acesso / Portaria"
          text={place.accessNote}
        />
      ) : null}
      {place.deliveryNote ? (
        <InfoRow
          icon={<Package size={15} color={Colors.gold[400]} />}
          label="Local de entrega"
          text={place.deliveryNote}
        />
      ) : null}
      {place.localTip ? (
        <InfoRow
          icon={<Lightbulb size={15} color={Colors.warning} />}
          label="Dica do local"
          text={place.localTip}
        />
      ) : null}
    </AppCard>
  );
}

function InfoRow({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <AppText variant="label" color={Colors.offWhite} style={styles.infoText} numberOfLines={2}>
        <Text style={styles.infoLabel}>{label}: </Text>
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
  infoLabel: {
    color: Colors.gray,
    fontWeight: '700',
  },
});
