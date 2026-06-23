import { useCallback, useState } from 'react';
import { useRoute } from '@/contexts/RouteContext';
import { parseSpreadsheetData, groupPackagesByStop, generateId, RawPackage } from '@/lib/packageUtils';
import { parseSpreadsheetText, parseSpreadsheetFile, isBinarySpreadsheet } from '@/lib/spreadsheetParser';

export type ImportState = 'idle' | 'loading' | 'success' | 'error';

export interface ImportResult {
  rawPackages: RawPackage[];
  detectedColumns: string[];
  fileName: string;
}

export function useImport() {
  const { setCurrentRoute, getSummary } = useRoute();
  const [state, setState] = useState<ImportState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult>({ rawPackages: [], detectedColumns: [], fileName: '' });

  const processRaw = useCallback((rows: any[][], headers: string[], fileName: string) => {
    const packages = parseSpreadsheetData(rows, headers);
    if (packages.length === 0) {
      setError('Nenhum pacote encontrado. Verifique as colunas da planilha.');
      setState('error');
      return;
    }
    setResult({ rawPackages: packages, detectedColumns: headers, fileName });
    setError(null);
    setState('success');
  }, []);

  const importText = useCallback((text: string, fileName = 'Dados colados') => {
    if (!text.trim()) {
      setError('Cole os dados da planilha no campo acima.');
      setState('error');
      return;
    }
    setState('loading');
    try {
      const { headers, rows } = parseSpreadsheetText(text);
      if (headers.length === 0 || rows.length === 0) {
        setError('Dados inválidos. Cole dados tabulados ou CSV.');
        setState('error');
        return;
      }
      processRaw(rows, headers, fileName);
    } catch (e: any) {
      setError('Erro ao processar: ' + (e.message ?? ''));
      setState('error');
    }
  }, [processRaw]);

  const importFile = useCallback(async (file: File) => {
    setState('loading');
    setError(null);
    try {
      let headers: string[];
      let rows: string[][];
      if (isBinarySpreadsheet(file.name)) {
        const parsed = await parseSpreadsheetFile(file);
        headers = parsed.headers;
        rows = parsed.rows;
      } else {
        const text = await file.text();
        const parsed = parseSpreadsheetText(text);
        headers = parsed.headers;
        rows = parsed.rows;
      }
      if (headers.length === 0 || rows.length === 0) {
        setError('Arquivo vazio ou sem dados suficientes.');
        setState('error');
        return;
      }
      processRaw(rows, headers, file.name);
    } catch (err: any) {
      setError('Erro ao ler o arquivo: ' + (err.message ?? ''));
      setState('error');
    }
  }, [processRaw]);

  const confirmImport = useCallback(() => {
    if (result.rawPackages.length === 0) return;
    const stops = groupPackagesByStop(result.rawPackages);
    const totalPackages = stops.reduce((sum, s) => sum + s.packageCount, 0);
    setCurrentRoute({
      id: generateId(),
      name: `Rota ${new Date().toLocaleDateString('pt-BR')}`,
      stops,
      status: 'planning' as const,
      estimatedDistanceKm: Math.round(stops.length * 3.5 * 10) / 10,
      completedStops: 0,
      totalPackages,
      deliveredPackages: 0,
      startTime: null,
      durationMinutes: 0,
    });
  }, [result.rawPackages, setCurrentRoute]);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setResult({ rawPackages: [], detectedColumns: [], fileName: '' });
  }, []);

  return {
    state,
    error,
    rawPackages: result.rawPackages,
    detectedColumns: result.detectedColumns,
    fileName: result.fileName,
    importText,
    importFile,
    confirmImport,
    reset,
  };
}
