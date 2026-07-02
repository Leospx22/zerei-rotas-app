import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppButton, AppChip, AppText } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import type { DeliveryType, PlaceInfo } from '@/lib/placeIntelligence';

export interface PlaceInfoDraft {
  deliveryType: DeliveryType;
  parkingNote: string;
  accessNote: string;
  deliveryNote: string;
  localTip: string;
}

export interface PlaceInfoEditorModalProps {
  visible: boolean;
  address: string;
  initialPlaceInfo: PlaceInfo | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: PlaceInfoDraft) => void;
  onDelete: () => void;
}

const DELIVERY_TYPES: ReadonlyArray<{ value: DeliveryType; label: string }> = [
  { value: 'portaria', label: 'Portaria' },
  { value: 'condominio', label: 'Condomínio' },
  { value: 'comercio', label: 'Loja / Comércio' },
  { value: 'endereco', label: 'Endereço comum' },
];

const PARKING_SUGGESTIONS = [
  'Em frente',
  'Rua lateral',
  'Difícil estacionar',
  'Zona Azul',
];
const ACCESS_SUGGESTIONS = [
  'Portaria 24h',
  'Interfone',
  'Entrada lateral',
  'Sem portaria',
];
const DELIVERY_SUGGESTIONS = [
  'Portaria',
  'Recepção',
  'Loja',
  'Caixa',
  'Depósito',
  'Cliente',
];

const EMPTY_DRAFT: PlaceInfoDraft = {
  deliveryType: 'portaria',
  parkingNote: '',
  accessNote: '',
  deliveryNote: '',
  localTip: '',
};

export function PlaceInfoEditorModal({
  visible,
  address,
  initialPlaceInfo,
  saving,
  onClose,
  onSave,
  onDelete,
}: PlaceInfoEditorModalProps) {
  const [draft, setDraft] = React.useState<PlaceInfoDraft>(EMPTY_DRAFT);

  React.useEffect(() => {
    if (!visible) return;
    setDraft(
      initialPlaceInfo
        ? {
            deliveryType: initialPlaceInfo.deliveryType,
            parkingNote: initialPlaceInfo.parkingNote ?? '',
            accessNote: initialPlaceInfo.accessNote ?? '',
            deliveryNote: initialPlaceInfo.deliveryNote ?? '',
            localTip: initialPlaceInfo.localTip ?? '',
          }
        : EMPTY_DRAFT
    );
  }, [address, initialPlaceInfo, visible]);

  const updateDraft = <Key extends keyof PlaceInfoDraft>(
    key: Key,
    value: PlaceInfoDraft[Key]
  ) => {
    setDraft(previous => ({ ...previous, [key]: value }));
  };

  const requestDelete = () => {
    Alert.alert(
      'Apagar informações deste local?',
      'As informações salvas para este endereço serão removidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={saving ? undefined : onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={saving ? undefined : onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar editor"
        />
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.heading}>
                <AppText variant="pageTitle">Informações do local</AppText>
                <AppText variant="body" color={Colors.gray} numberOfLines={2}>
                  {address}
                </AppText>
              </View>

              <View style={styles.field}>
                <AppText variant="bodyStrong">Tipo do local</AppText>
                <View style={styles.chips}>
                  {DELIVERY_TYPES.map(option => (
                    <AppChip
                      key={option.value}
                      label={option.label}
                      selected={draft.deliveryType === option.value}
                      onPress={() => updateDraft('deliveryType', option.value)}
                    />
                  ))}
                </View>
              </View>

              <SuggestionField
                label="Estacionamento"
                value={draft.parkingNote}
                suggestions={PARKING_SUGGESTIONS}
                onChange={value => updateDraft('parkingNote', value)}
              />
              <SuggestionField
                label="Acesso / Portaria"
                value={draft.accessNote}
                suggestions={ACCESS_SUGGESTIONS}
                onChange={value => updateDraft('accessNote', value)}
              />
              <SuggestionField
                label="Local de entrega"
                value={draft.deliveryNote}
                suggestions={DELIVERY_SUGGESTIONS}
                onChange={value => updateDraft('deliveryNote', value)}
              />

              <View style={styles.field}>
                <AppText variant="bodyStrong">Dica do local</AppText>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={draft.localTip}
                  onChangeText={value => updateDraft('localTip', value)}
                  placeholder="Ex.: porteiro pede documento"
                  placeholderTextColor={Colors.darkGray}
                  multiline
                  maxLength={240}
                  textAlignVertical="top"
                  accessibilityLabel="Dica do local"
                />
              </View>

              <View style={styles.actions}>
                <AppButton
                  label="Salvar informações"
                  size="large"
                  loading={saving}
                  onPress={() => onSave(draft)}
                />
                <AppButton
                  label="Cancelar"
                  variant="ghost"
                  disabled={saving}
                  onPress={onClose}
                />
                {initialPlaceInfo ? (
                  <AppButton
                    label="Apagar informações"
                    variant="danger"
                    disabled={saving}
                    onPress={requestDelete}
                  />
                ) : null}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

interface SuggestionFieldProps {
  label: string;
  value: string;
  suggestions: readonly string[];
  onChange: (value: string) => void;
}

function SuggestionField({ label, value, suggestions, onChange }: SuggestionFieldProps) {
  return (
    <View style={styles.field}>
      <AppText variant="bodyStrong">{label}</AppText>
      <View style={styles.chips}>
        {suggestions.map(suggestion => (
          <AppChip
            key={suggestion}
            label={suggestion}
            selected={value === suggestion}
            onPress={() => onChange(suggestion)}
          />
        ))}
        <AppChip
          label="Não informado"
          selected={!value}
          onPress={() => onChange('')}
        />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="Observação opcional"
        placeholderTextColor={Colors.darkGray}
        maxLength={160}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  keyboardArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  handle: {
    width: 44,
    height: 4,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBorder,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  heading: {
    gap: Spacing.xs,
  },
  field: {
    gap: Spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    color: Colors.white,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 96,
  },
  actions: {
    gap: Spacing.sm,
  },
});
