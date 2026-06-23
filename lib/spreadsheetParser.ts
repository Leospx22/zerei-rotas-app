// Lightweight CSV parser - works on both web and native

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => splitCSVLine(line));
  return { headers, rows };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// Parse TSV (tab-separated) - common Excel copy-paste format
export function parseTSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split('\t').map(c => c.trim()));
  return { headers, rows };
}

// Auto-detect delimiter and parse plain text
export function parseSpreadsheetText(text: string): { headers: string[]; rows: string[][] } {
  if (text.includes('\t')) return parseTSV(text);
  return parseCSV(text);
}

// Parse binary spreadsheet files (.xlsx, .xls) using SheetJS
export async function parseSpreadsheetFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (jsonData.length === 0) return { headers: [], rows: [] };

  const headers = jsonData[0].map(h => String(h).trim());
  const rows = jsonData.slice(1)
    .map(row => row.map(cell => String(cell).trim()))
    .filter(row => row.some(cell => cell.length > 0));

  return { headers, rows };
}

// Check if a file is a binary spreadsheet format (xlsx/xls)
export function isBinarySpreadsheet(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'xlsx' || ext === 'xls';
}
