import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { BrandIcon } from '@/components/BrandIcon';
import { useRoute } from '@/contexts/RouteContext';
import {
  RawPackage,
  parseSpreadsheetData,
  buildPlanningRoute,
} from '@/lib/packageUtils';
import { parseSpreadsheetText, parseSpreadsheetFile, isBinarySpreadsheet } from '@/lib/spreadsheetParser';

const MAX_NATIVE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const SAMPLE_XLSX_DATA = [
  ['Rastreio', 'Endereço', 'CEP', 'Latitude', 'Longitude', 'Parada'],
  ['SHO123456', 'Rua Augusta, 1200 - Consolação, SP', '01304-001', '-23.5566', '-46.6580', '1'],
  ['SHO123457', 'Rua Augusta, 1200 - Consolação, SP', '01304-001', '-23.5566', '-46.6580', '1'],
  ['SHO123458', 'Av. Paulista, 900 - Bela Vista, SP', '01310-100', '-23.5631', '-46.6544', '2'],
  ['ML987654', 'R. Oscar Freire, 350 - Jardins, SP', '01414-001', '-23.5637', '-46.6730', '3'],
  ['ML987655', 'R. Oscar Freire, 350 - Jardins, SP', '01414-001', '-23.5637', '-46.6730', '3'],
  ['ML987656', 'R. Oscar Freire, 350 - Jardins, SP', '01414-001', '-23.5637', '-46.6730', '3'],
  ['SHO123459', 'Av. Brigadeiro Faria Lima, 1500 - Itaim Bibi, SP', '01451-001', '-23.5770', '-46.6870', '4'],
  ['SHO123460', 'Rua Haddock Lobo, 800 - Cerqueira César, SP', '01414-001', '-23.5570', '-46.6670', '5'],
  ['SHO123461', 'Rua Haddock Lobo, 800 - Cerqueira César, SP', '01414-001', '-23.5570', '-46.6670', '5'],
  ['ML987657', 'Av. Rebouças, 2500 - Pinheiros, SP', '05401-000', '-23.5640', '-46.6920', '6'],
  ['SHO123462', 'Rua da Consolação, 3000 - Consolação, SP', '01416-000', '-23.5520', '-46.6700', '7'],
  ['SHO123463', 'Rua da Consolação, 3000 - Consolação, SP', '01416-000', '-23.5520', '-46.6700', '7'],
  ['ML987658', 'Av. Brasil, 500 - Jardim América, SP', '01430-000', '-23.5550', '-46.6800', '8'],
];

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function isNativeBinarySpreadsheet(fileName: string, mimeType?: string): boolean {
  const extension = getFileExtension(fileName);
  if (extension === 'xlsx' || extension === 'xls') return true;
  if (extension === 'csv') return false;
  const normalizedMime = (mimeType ?? '').toLowerCase();
  return normalizedMime.includes('spreadsheet')
    || normalizedMime.includes('excel')
    || normalizedMime === 'application/vnd.ms-excel';
}

function normalizeSheetRows(data: unknown[][]): { headers: string[]; rows: string[][] } {
  const normalized = data
    .map(row => row.map(cell => String(cell ?? '').trim()))
    .filter(row => row.some(cell => cell.length > 0));

  if (normalized.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  return {
    headers: normalized[0],
    rows: normalized.slice(1),
  };
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'verifique o formato da planilha.';
}

function getPickedAsset(result: any) {
  if (!result || result.canceled) return null;
  if (result.assets?.[0]) return result.assets[0];
  if (result.type === 'success' && result.uri) return result;
  return null;
}

export default function ImportScreen() {
  const router = useRouter();
  const { currentRoute, setCurrentRoute } = useRoute();
  const [loading, setLoading] = useState(false);
  const [rawPackages, setRawPackages] = useState<RawPackage[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importedRouteId, setImportedRouteId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const processSpreadsheet = useCallback((data: any[][], headers: string[]) => {
    try {
      const packages = parseSpreadsheetData(data, headers);
      if (packages.length === 0) {
        setError('Nenhum pacote encontrado. Verifique as colunas da planilha.');
        return;
      }
      const route = buildPlanningRoute(packages);
      setDetectedColumns(headers);
      setRawPackages(packages);
      setImportedRouteId(route.id);
      setCurrentRoute(route);
      setError(null);
    } catch (err) {
      setError('Erro ao processar a planilha: ' + getErrorMessage(err));
    }
  }, [setCurrentRoute]);

  const loadSampleData = () => {
    setLoading(true);
    setTimeout(() => {
      const headers = SAMPLE_XLSX_DATA[0];
      const rows = SAMPLE_XLSX_DATA.slice(1);
      processSpreadsheet(rows, headers);
      setFileName('rotas_exemplo.xlsx');
      setLoading(false);
    }, 500);
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      setError('Cole os dados da planilha no campo acima.');
      return;
    }
    setLoading(true);
    try {
      const { headers, rows } = parseSpreadsheetText(pasteText);
      if (headers.length === 0 || rows.length === 0) {
        setError('Dados inválidos. Cole dados tabulados ou CSV.');
        setLoading(false);
        return;
      }
      processSpreadsheet(rows, headers);
      setFileName('Dados colados');
    } catch (e: any) {
      setError('Erro ao processar: ' + (e.message ?? ''));
    }
    setLoading(false);
  };

  const handleFileSelect = async () => {
    if (Platform.OS === 'web') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) return;
          setFileName(file.name);
          setLoading(true);
          setError(null);
          try {
            let headers: string[];
            let rows: string[][];
            if (isBinarySpreadsheet(file.name)) {
              const result = await parseSpreadsheetFile(file);
              headers = result.headers;
              rows = result.rows;
            } else {
              const text = await file.text();
              const result = parseSpreadsheetText(text);
              headers = result.headers;
              rows = result.rows;
            }
            if (headers.length === 0 || rows.length === 0) {
              setError('Arquivo vazio ou sem dados suficientes.');
              setLoading(false);
              return;
            }
            processSpreadsheet(rows, headers);
          } catch (err: any) {
            setError('Erro ao ler o arquivo: ' + (err.message ?? ''));
          }
          setLoading(false);
        };
        input.click();
      } catch {
        setError('Não foi possível abrir o seletor de arquivos.');
      }
      return;
    }

    // Native (Android / iOS)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      const asset = getPickedAsset(result);
      if (!asset) return;

      const uriFileName = decodeURIComponent(asset.uri.split('/').pop() ?? '');
      const name = asset.name || uriFileName || 'arquivo';
      const mimeType = asset.mimeType;
      setFileName(name);
      setLoading(true);
      setError(null);

      try {
        let headers: string[];
        let rows: string[][];

        if (!asset.uri) {
          throw new Error('O arquivo selecionado não possui um caminho válido.');
        }
        if (typeof asset.size === 'number' && asset.size > MAX_NATIVE_FILE_SIZE_BYTES) {
          throw new Error('Arquivo muito grande. Selecione uma planilha de até 10 MB.');
        }

        if (isNativeBinarySpreadsheet(name, mimeType)) {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64',
          });
          const workbook = XLSX.read(base64, { type: 'base64' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            throw new Error('A planilha não possui abas para importar.');
          }
          const sheet = workbook.Sheets[sheetName];
          const jsonData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          const normalized = normalizeSheetRows(jsonData);
          headers = normalized.headers;
          rows = normalized.rows;
        } else {
          const text = await FileSystem.readAsStringAsync(asset.uri);
          if (!text.trim()) {
            throw new Error('O arquivo CSV está vazio.');
          }
          const parsed = parseSpreadsheetText(text.replace(/^\uFEFF/, ''));
          headers = parsed.headers;
          rows = parsed.rows;
        }

        if (headers.length === 0 || rows.length === 0) {
          setError('Arquivo vazio ou sem dados suficientes.');
          return;
        }

        processSpreadsheet(rows, headers);
      } catch (err: any) {
        setError('Erro ao ler o arquivo: ' + getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    } catch (err: any) {
      setError('Não foi possível abrir o seletor de arquivos: ' + getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (rawPackages.length === 0) return;
    if (!currentRoute || currentRoute.id !== importedRouteId) {
      const route = buildPlanningRoute(rawPackages);
      setImportedRouteId(route.id);
      setCurrentRoute(route);
    }
    router.replace('/(tabs)/routes/import-summary');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <BrandIcon size={24} />
          <Text style={styles.headerTitle}>Importar Planilha</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.autoDetectCard}>
        <CheckCircle2 size={18} color={Colors.success} />
        <Text style={styles.autoDetectText}>
          Colunas detectadas automaticamente: SPX TN, Stop, Destination Address, Postal Code, Latitude, Longitude
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Enviar Planilha</Text>
      <TouchableOpacity style={styles.uploadCard} onPress={handleFileSelect}>
        <LinearGradient colors={[Colors.cardBg, Colors.overlay]} style={styles.uploadGradient}>
          <FileSpreadsheet size={36} color={Colors.gold[400]} />
          <Text style={styles.uploadTitle}>Enviar Arquivo</Text>
          <Text style={styles.uploadSubtitle}>.xlsx, .xls ou .csv</Text>
          <View style={styles.uploadBadge}>
            <Upload size={16} color={Colors.gold[400]} />
            <Text style={styles.uploadBadgeText}>Selecionar Arquivo</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou cole os dados</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.pasteSection}>
        <View style={styles.pasteHintRow}>
          <ClipboardPaste size={16} color={Colors.gold[400]} />
          <Text style={styles.pasteHint}>Cole dados do Excel (tabulado) ou CSV</Text>
        </View>
        <TextInput
          style={styles.pasteInput}
          multiline
          numberOfLines={6}
          placeholder="Cole aqui os dados copiados do Excel..."
          placeholderTextColor={Colors.gray}
          value={pasteText}
          onChangeText={setPasteText}
          textAlignVertical="top"
        />
        <TouchableOpacity style={styles.parseButton} onPress={handlePasteImport}>
          <Text style={styles.parseButtonText}>Processar Dados</Text>
        </TouchableOpacity>
      </View>

      {fileName ? (
        <View style={styles.fileInfoCard}>
          <FileSpreadsheet size={20} color={Colors.gold[400]} />
          <Text style={styles.fileNameText}>{fileName}</Text>
          <CheckCircle2 size={18} color={Colors.success} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <AlertCircle size={18} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {detectedColumns.length > 0 ? (
        <View style={styles.columnsCard}>
          <Text style={styles.columnsTitle}>Colunas Detectadas:</Text>
          <View style={styles.columnsRow}>
            {detectedColumns.map((col, i) => (
              <View key={i} style={styles.columnBadge}>
                <Text style={styles.columnBadgeText}>{col}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {rawPackages.length > 0 ? (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>
            Previa: {rawPackages.length} pacotes encontrados
          </Text>
          {rawPackages.slice(0, 5).map((pkg, i) => (
            <View key={i} style={styles.packageRow}>
              <View style={styles.packageIndexCircle}>
                <Text style={styles.packageIndex}>{i + 1}</Text>
              </View>
              <View style={styles.packageInfo}>
                <Text style={styles.packageTracking}>{pkg.trackingNumber}</Text>
                <Text style={styles.packageAddress} numberOfLines={1}>
                  {pkg.destinationAddress}
                </Text>
              </View>
            </View>
          ))}
          {rawPackages.length > 5 ? (
            <Text style={styles.moreText}>
              ... e mais {rawPackages.length - 5} pacotes
            </Text>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.sampleButton} onPress={loadSampleData}>
        <Text style={styles.sampleButtonText}>
          Carregar dados de exemplo
        </Text>
      </TouchableOpacity>

      {rawPackages.length > 0 ? (
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <LinearGradient
            colors={[Colors.gold[500], Colors.gold[700]]}
            style={styles.continueGradient}
          >
            <Text style={styles.continueText}>Continuar</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  autoDetectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  autoDetectText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.success,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  pasteSection: { gap: Spacing.sm, marginBottom: Spacing.md },
  pasteHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pasteHint: {
    fontSize: FontSizes.sm,
    color: Colors.gold[400],
    fontWeight: '500',
  },
  pasteInput: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.white,
    minHeight: 120,
  },
  parseButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parseButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.gold[400],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.cardBorder },
  dividerText: { fontSize: FontSizes.sm, color: Colors.gray },
  uploadCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md },
  uploadGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(212, 160, 23, 0.27)',
    borderRadius: BorderRadius.lg,
  },
  uploadTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  uploadSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  uploadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  uploadBadgeText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.gold[400],
  },
  fileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fileNameText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.white,
    fontWeight: '500',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.error,
  },
  columnsCard: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  columnsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  columnsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  columnBadge: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  columnBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.gold[400],
  },
  previewSection: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  previewTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  packageIndexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageIndex: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.gold[400],
  },
  packageInfo: { flex: 1 },
  packageTracking: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.gold[400],
  },
  packageAddress: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  moreText: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  sampleButton: {
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sampleButtonText: {
    fontSize: FontSizes.md,
    color: Colors.gold[400],
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  continueButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  continueGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  continueText: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.primary[900],
  },
});
