import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { extractTextFromPdf } from './pdfText';

// Importa el ticket desde un documento (PDF, TXT, CSV…). El texto de los PDF se
// extrae en JavaScript puro (ver pdfText.ts). No cubre PDF escaneados (imágenes).

export interface DocImportResult {
  /** Texto extraído del documento (puede estar vacío) */
  text: string;
  /** Nombre del fichero */
  name: string;
  kind: 'pdf' | 'texto' | 'otro';
  /** true si conseguimos algo de texto */
  hasText: boolean;
}

/**
 * Abre el selector de documentos, lee el fichero y devuelve su texto.
 * Devuelve null si el usuario cancela.
 */
export async function pickAndReadDocument(): Promise<DocImportResult | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets || res.assets.length === 0) return null;

  const asset = res.assets[0];
  const name = asset.name || 'documento';
  const lower = name.toLowerCase();
  const isPdf = asset.mimeType === 'application/pdf' || lower.endsWith('.pdf');
  const file = new File(asset.uri);

  if (isPdf) {
    const bytes = await file.bytes();
    const text = extractTextFromPdf(bytes);
    return { text, name, kind: 'pdf', hasText: text.trim().length > 0 };
  }

  let text = '';
  try {
    text = await file.text();
  } catch {
    text = '';
  }
  const kind: DocImportResult['kind'] = /\.(txt|csv|tsv|md|text)$/.test(lower) ? 'texto' : 'otro';
  return { text, name, kind, hasText: text.trim().length > 0 };
}
