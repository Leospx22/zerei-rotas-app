import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Package,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { useRoute } from '@/contexts/RouteContext';
import { usePersistence } from '@/hooks/usePersistence';
import {
  collectAllOccurrenceRecords,
  formatOccurrenceDateTime,
  getOccurrenceDisplayTimestamps,
  hasOccurrenceEditChanges,
  occurrenceReasonLabel,
  occurrenceResolutionLabel,
  partitionOccurrenceRecords,
  type CollectedOccurrenceRecord,
  type OccurrenceResolution,
} from '@/lib/occurrenceRecords';
import { SHOPEE_OCCURRENCE_REASONS } from '@/lib/occurrenceReasons';
import { formatStopBadge } from '@/lib/routeStopPresentation';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';

interface OccurrenceCardProps {
  record: CollectedOccurrenceRecord;
  onResolve?: (record: CollectedOccurrenceRecord, resolution: OccurrenceResolution) => void;
  onEdit: (record: CollectedOccurrenceRecord) => void;
  onDelete: (record: CollectedOccurrenceRecord) => void;
}

function OccurrenceCard({ record, onResolve, onEdit, onDelete }: OccurrenceCardProps) {
  const timestamps = getOccurrenceDisplayTimestamps(record);
  const registeredAt = formatOccurrenceDateTime(timestamps.registeredAt) ?? 'Não informado';
  const updatedAt = formatOccurrenceDateTime(timestamps.updatedAt);
  const isResolved = Boolean(record.occurrenceResolution);

  return (
    <View style={[styles.card, isResolved ? styles.resolvedCard : styles.pendingCard]}>
      <View style={styles.packageHeader}>
        <Package size={18} color={Colors.gold[400]} />
        <View style={styles.packageHeaderText}>
          <Text style={styles.label}>Pacote</Text>
          <Text style={styles.packageCode}>{record.packageCode ?? record.packageId}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <MapPin size={16} color={Colors.gray} />
        <View style={styles.detailContent}>
          <Text style={styles.label}>Endereço</Text>
          <Text style={styles.value}>{record.address}</Text>
          {record.normalizedAddress && record.normalizedAddress !== record.address ? (
            <Text style={styles.normalizedAddress}>{record.normalizedAddress}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.reasonBox, isResolved && styles.resolvedReasonBox]}>
        <Text style={styles.label}>Motivo</Text>
        <Text style={[styles.reason, isResolved && styles.resolvedReason]}>
          {occurrenceReasonLabel(record.reason)}
        </Text>
      </View>

      <View style={styles.metadataRow}>
        <Text style={styles.label}>Rota / Parada</Text>
        <Text style={styles.value}>
          {record.routeName ?? 'Rota não informada'} •{' '}
          {record.stopNumber !== undefined ? `Parada ${formatStopBadge(record.stopNumber)}` : 'Parada não informada'}
        </Text>
      </View>

      <View>
        <Text style={styles.label}>Registrado em</Text>
        <Text style={styles.value}>{registeredAt}</Text>
      </View>

      {updatedAt ? (
        <View>
          <Text style={styles.label}>Atualizado em</Text>
          <Text style={styles.value}>{updatedAt}</Text>
        </View>
      ) : null}

      {record.occurrenceResolution ? (
        <View style={styles.resolutionBox}>
          <View style={styles.resolutionHeader}>
            <CheckCircle2 size={17} color={Colors.success} />
            <View>
              <Text style={styles.label}>Resultado</Text>
              <Text style={styles.resolutionText}>
                {occurrenceResolutionLabel(record.occurrenceResolution)}
              </Text>
            </View>
          </View>
        </View>
      ) : onResolve ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deliveredButton]}
            onPress={() => onResolve(record, 'delivered')}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Marcar ${record.packageCode ?? record.packageId} como entregue`}
          >
            <Text style={styles.deliveredButtonText}>Entregue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.returnedButton]}
            onPress={() => onResolve(record, 'returned_to_hub')}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Marcar ${record.packageCode ?? record.packageId} como devolvido ao Hub`}
          >
            <Text style={styles.returnedButtonText}>Devolvido ao Hub</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.editActionButton]}
            onPress={() => onEdit(record)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Editar ocorrência de ${record.packageCode ?? record.packageId}`}
          >
            <Pencil size={15} color={Colors.gold[400]} />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteActionButton]}
            onPress={() => onDelete(record)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Excluir ocorrência de ${record.packageCode ?? record.packageId}`}
          >
            <Trash2 size={15} color={Colors.error} />
            <Text style={styles.deleteButtonText}>Excluir ocorrência</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isResolved ? (
        <View style={styles.resolvedActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(record)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Editar ocorrência de ${record.packageCode ?? record.packageId}`}
          >
            <Pencil size={15} color={Colors.gold[400]} />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(record)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Excluir ocorrência de ${record.packageCode ?? record.packageId}`}
          >
            <Trash2 size={15} color={Colors.error} />
            <Text style={styles.deleteButtonText}>Excluir ocorrência</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default function OccurrencesScreen() {
  const router = useRouter();
  const {
    currentRoute,
    routeHistory,
    reloadHistory,
    resolvePackageOccurrence,
    editPackageOccurrence,
    deletePackageOccurrence,
  } = useRoute();
  const {
    resolveHistoryOccurrence,
    editHistoryOccurrence,
    deleteHistoryOccurrence,
  } = usePersistence();
  const [resolutionRequest, setResolutionRequest] = useState<{
    record: CollectedOccurrenceRecord;
    resolution: OccurrenceResolution;
  } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [editTarget, setEditTarget] = useState<CollectedOccurrenceRecord | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editResolution, setEditResolution] = useState<OccurrenceResolution | undefined>();
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CollectedOccurrenceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const occurrenceRecords = useMemo(
    () => collectAllOccurrenceRecords(currentRoute, routeHistory),
    [currentRoute, routeHistory]
  );
  const sections = useMemo(
    () => partitionOccurrenceRecords(occurrenceRecords),
    [occurrenceRecords]
  );
  const visibleOccurrenceCount =
    sections.pending.length + sections.resolvedRecently.length;
  const editHasChanges = editTarget
    ? hasOccurrenceEditChanges(editTarget, editReason, editResolution)
    : false;

  useFocusEffect(
    useCallback(() => {
      reloadHistory().catch(() => {});
    }, [reloadHistory])
  );

  const requestResolution = useCallback((
    record: CollectedOccurrenceRecord,
    resolution: OccurrenceResolution
  ) => {
    setResolutionRequest({ record, resolution });
  }, []);

  const confirmResolution = useCallback(async () => {
    if (!resolutionRequest || isResolving) return;
    const { record, resolution } = resolutionRequest;
    setIsResolving(true);
    try {
      if (record.source === 'current') {
        resolvePackageOccurrence(record.packageId, resolution);
        setResolutionRequest(null);
        return;
      }
      if (!record.historyCompletedAt) {
        Alert.alert('Não foi possível resolver a ocorrência.');
        return;
      }
      const resolved = await resolveHistoryOccurrence(
        record.routeId,
        record.historyCompletedAt,
        record.packageId,
        resolution
      );
      if (!resolved) {
        Alert.alert('Não foi possível resolver a ocorrência.');
        return;
      }
      await reloadHistory();
      setResolutionRequest(null);
    } finally {
      setIsResolving(false);
    }
  }, [
    isResolving,
    reloadHistory,
    resolutionRequest,
    resolveHistoryOccurrence,
    resolvePackageOccurrence,
  ]);

  const openEdit = useCallback((record: CollectedOccurrenceRecord) => {
    setEditTarget(record);
    setEditReason(record.reason ?? '');
    setEditResolution(record.occurrenceResolution);
  }, []);

  const closeEdit = useCallback(() => {
    if (isSavingEdit) return;
    setEditTarget(null);
    setEditReason('');
    setEditResolution(undefined);
  }, [isSavingEdit]);

  const saveEdit = useCallback(async () => {
    if (!editTarget || !editHasChanges || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      if (editTarget.source === 'current') {
        editPackageOccurrence(
          editTarget.packageId,
          editReason,
          editTarget.occurrenceResolution ? editResolution : undefined
        );
        setEditTarget(null);
        return;
      }
      if (!editTarget.historyCompletedAt) {
        Alert.alert('Não foi possível salvar as alterações.');
        return;
      }
      const edited = await editHistoryOccurrence(
        editTarget.routeId,
        editTarget.historyCompletedAt,
        editTarget.packageId,
        editReason,
        editTarget.occurrenceResolution ? editResolution : undefined
      );
      if (!edited) {
        Alert.alert('Não foi possível salvar as alterações.');
        return;
      }
      await reloadHistory();
      setEditTarget(null);
    } finally {
      setIsSavingEdit(false);
    }
  }, [
    editHistoryOccurrence,
    editPackageOccurrence,
    editReason,
    editResolution,
    editHasChanges,
    editTarget,
    isSavingEdit,
    reloadHistory,
  ]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.source === 'current') {
        deletePackageOccurrence(deleteTarget.packageId);
        setDeleteTarget(null);
        return;
      }
      if (!deleteTarget.historyCompletedAt) {
        Alert.alert('Não foi possível excluir a ocorrência.');
        return;
      }
      const deleted = await deleteHistoryOccurrence(
        deleteTarget.routeId,
        deleteTarget.historyCompletedAt,
        deleteTarget.packageId
      );
      if (!deleted) {
        Alert.alert('Não foi possível excluir a ocorrência.');
        return;
      }
      await reloadHistory();
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }, [
    deleteHistoryOccurrence,
    deletePackageOccurrence,
    deleteTarget,
    isDeleting,
    reloadHistory,
  ]);

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <AlertCircle size={22} color={Colors.error} />
          <Text style={styles.title}>Ocorrências</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, styles.pendingCount]}>{sections.pending.length}</Text>
          <Text style={styles.summaryLabel}>Pendentes</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, styles.resolvedCount]}>
            {sections.resolvedRecently.length}
          </Text>
          <Text style={styles.summaryLabel}>Resolvidas recentemente</Text>
        </View>
      </View>

      {visibleOccurrenceCount === 0 ? (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color={Colors.cardBorder} />
          <Text style={styles.emptyText}>Nenhuma ocorrência registrada</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Pendentes</Text>
          {sections.pending.length === 0 ? (
            <View style={styles.sectionEmptyState}>
              <Text style={styles.sectionEmptyText}>Nenhuma ocorrência pendente</Text>
            </View>
          ) : (
            sections.pending.map(record => (
              <OccurrenceCard
                key={`pending-${record.routeId}-${record.packageId}`}
                record={record}
                onResolve={requestResolution}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))
          )}

          {sections.resolvedRecently.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Resolvidas recentemente</Text>
              {sections.resolvedRecently.map(record => (
                <OccurrenceCard
                  key={`resolved-${record.routeId}-${record.packageId}`}
                  record={record}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
      <Modal
        visible={resolutionRequest !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setResolutionRequest(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setResolutionRequest(null)}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {resolutionRequest?.resolution === 'delivered'
                ? 'Marcar ocorrência como entregue?'
                : 'Marcar como devolvido ao Hub?'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setResolutionRequest(null)}
                disabled={isResolving}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmResolution}
                disabled={isResolving}
                accessibilityRole="button"
              >
                <Text style={styles.modalConfirmText}>
                  {isResolving ? 'Salvando...' : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDeleteTarget(null)}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Excluir esta ocorrência?</Text>
            <Text style={styles.modalMessage}>
              Esta ação removerá o registro desta ocorrência.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDeleteTarget(null)}
                disabled={isDeleting}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={confirmDelete}
                disabled={isDeleting}
                accessibilityRole="button"
              >
                <Text style={styles.modalDeleteText}>
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={editTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeEdit}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
          />
          <View style={styles.editModalCard}>
            <Text style={styles.modalTitle}>Editar ocorrência</Text>

            <Text style={styles.fieldLabel}>Motivo</Text>
            <View style={styles.optionGrid}>
              {SHOPEE_OCCURRENCE_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.optionChip, editReason === reason && styles.optionChipSelected]}
                  onPress={() => setEditReason(reason)}
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityState={{ selected: editReason === reason }}
                >
                  <Text style={[
                    styles.optionChipText,
                    editReason === reason && styles.optionChipTextSelected,
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editTarget?.occurrenceResolution ? (
              <>
                <Text style={styles.fieldLabel}>Resultado</Text>
                <View style={styles.optionGrid}>
                  {(['delivered', 'returned_to_hub'] as const).map(resolution => (
                    <TouchableOpacity
                      key={resolution}
                      style={[
                        styles.optionChip,
                        editResolution === resolution && styles.optionChipSelected,
                      ]}
                      onPress={() => setEditResolution(resolution)}
                      activeOpacity={0.78}
                      accessibilityRole="button"
                      accessibilityState={{ selected: editResolution === resolution }}
                    >
                      <Text style={[
                        styles.optionChipText,
                        editResolution === resolution && styles.optionChipTextSelected,
                      ]}>
                        {occurrenceResolutionLabel(resolution)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeEdit}
                disabled={isSavingEdit}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  !editHasChanges && styles.modalButtonDisabled,
                ]}
                onPress={saveEdit}
                disabled={!editHasChanges || isSavingEdit}
                accessibilityRole="button"
              >
                <Text style={styles.modalConfirmText}>
                  {isSavingEdit ? 'Salvando...' : 'Salvar alterações'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: '800' },
  headerSpacer: { width: 44 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  summaryDivider: { width: 1, backgroundColor: Colors.cardBorder },
  summaryCount: { fontSize: FontSizes.xxl, fontWeight: '900' },
  pendingCount: { color: Colors.error },
  resolvedCount: { color: Colors.success },
  summaryLabel: { color: Colors.gray, fontSize: FontSizes.sm, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '800' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  emptyText: { color: Colors.gray, fontSize: FontSizes.lg, fontWeight: '700' },
  sectionEmptyState: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.cardBg,
  },
  sectionEmptyText: { color: Colors.gray, fontSize: FontSizes.md },
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  pendingCard: { borderLeftWidth: 3, borderLeftColor: Colors.error },
  resolvedCard: { borderLeftWidth: 3, borderLeftColor: Colors.success },
  packageHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  packageHeaderText: { flex: 1 },
  packageCode: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  detailContent: { flex: 1, gap: 2 },
  label: {
    color: Colors.gray,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: { color: Colors.white, fontSize: FontSizes.md, lineHeight: 20 },
  normalizedAddress: { color: Colors.gold[400], fontSize: FontSizes.sm },
  reasonBox: {
    gap: 4,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  reason: { color: Colors.error, fontSize: FontSizes.md, fontWeight: '800' },
  resolvedReasonBox: { borderColor: Colors.cardBorder, backgroundColor: Colors.background },
  resolvedReason: { color: Colors.white },
  metadataRow: { gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionButton: {
    minHeight: 46,
    flexGrow: 1,
    flexBasis: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  deliveredButton: { borderColor: Colors.successBorder, backgroundColor: Colors.successBg },
  deliveredButtonText: { color: Colors.success, fontSize: FontSizes.md, fontWeight: '800' },
  returnedButton: { borderColor: Colors.warningBorder, backgroundColor: Colors.warningBg },
  returnedButtonText: { color: Colors.warning, fontSize: FontSizes.md, fontWeight: '800' },
  editActionButton: { borderColor: Colors.gold[700], backgroundColor: Colors.overlay },
  deleteActionButton: { borderColor: Colors.errorBorder, backgroundColor: Colors.errorBg },
  resolutionBox: {
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    backgroundColor: Colors.successBg,
  },
  resolutionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resolutionText: { color: Colors.success, fontSize: FontSizes.md, fontWeight: '800' },
  resolvedActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Spacing.sm },
  editButton: {
    minHeight: 40,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gold[700],
    backgroundColor: Colors.overlay,
  },
  editButtonText: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '800' },
  deleteButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    backgroundColor: Colors.errorBg,
  },
  deleteButtonText: { color: Colors.error, fontSize: FontSizes.sm, fontWeight: '800' },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  modalTitle: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: '800' },
  modalMessage: { color: Colors.gray, fontSize: FontSizes.md, lineHeight: 20 },
  fieldLabel: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '800' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  optionChip: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  optionChipSelected: { borderColor: Colors.gold[500], backgroundColor: Colors.overlay },
  optionChipText: { color: Colors.gray, fontSize: FontSizes.sm, fontWeight: '700' },
  optionChipTextSelected: { color: Colors.gold[400] },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  modalButton: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  modalCancelButton: { borderColor: Colors.cardBorder, backgroundColor: Colors.background },
  modalCancelText: { color: Colors.gray, fontSize: FontSizes.md, fontWeight: '800' },
  modalConfirmButton: { borderColor: Colors.gold[700], backgroundColor: Colors.gold[500] },
  modalDeleteButton: { borderColor: Colors.errorBorder, backgroundColor: Colors.errorBg },
  modalButtonDisabled: { opacity: 0.45 },
  modalConfirmText: { color: Colors.primary[900], fontSize: FontSizes.md, fontWeight: '900' },
  modalDeleteText: { color: Colors.error, fontSize: FontSizes.md, fontWeight: '900' },
});
