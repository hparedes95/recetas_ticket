import { inflate } from 'pako';

// Extracción de texto de PDF en JavaScript puro (sin dependencias nativas), para
// poder importar tickets/facturas en PDF. Descomprime los streams FlateDecode con
// pako y extrae el texto de los operadores de texto (Tj/TJ). No cubre PDF
// escaneados (imágenes): esos necesitan OCR.

/** Convierte bytes a string "latin1" (1 byte = 1 char) para localizar/parsear */
function bytesToLatin1(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return s;
}

/** Extrae el texto legible de un content stream de PDF */
function extractTextFromContent(s: string): string {
  const lines: string[] = [];
  let line = '';
  const flush = () => {
    const t = line.replace(/\s+/g, ' ').trim();
    if (t) lines.push(t);
    line = '';
  };
  const simpleEsc: Record<string, string> = {
    n: '\n',
    r: '\r',
    t: '\t',
    b: '\b',
    f: '\f',
    '(': '(',
    ')': ')',
    '\\': '\\',
  };
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === '(') {
      // cadena literal (...)
      i++;
      let depth = 1;
      let str = '';
      while (i < n && depth > 0) {
        const ch = s[i];
        if (ch === '\\') {
          const next = s[i + 1];
          if (next && next in simpleEsc) {
            str += simpleEsc[next];
            i += 2;
            continue;
          }
          const oct = s.substr(i + 1, 3).match(/^[0-7]{1,3}/);
          if (oct) {
            str += String.fromCharCode(parseInt(oct[0], 8) & 0xff);
            i += 1 + oct[0].length;
            continue;
          }
          i += 2;
          continue;
        } else if (ch === '(') {
          depth++;
          str += ch;
          i++;
        } else if (ch === ')') {
          depth--;
          if (depth > 0) str += ch;
          i++;
        } else {
          str += ch;
          i++;
        }
      }
      line += str;
    } else if (c === '<' && s[i + 1] === '<') {
      const end = s.indexOf('>>', i + 2);
      i = end === -1 ? n : end + 2;
    } else if (c === '<') {
      const end = s.indexOf('>', i + 1);
      const hex = s.slice(i + 1, end === -1 ? n : end).replace(/[^0-9a-fA-F]/g, '');
      let str = '';
      for (let k = 0; k + 1 < hex.length; k += 2) {
        str += String.fromCharCode(parseInt(hex.substr(k, 2), 16));
      }
      line += str;
      i = end === -1 ? n : end + 1;
    } else if (/[A-Za-z'"*]/.test(c)) {
      let tok = '';
      while (i < n && /[A-Za-z0-9*'"]/.test(s[i])) {
        tok += s[i];
        i++;
      }
      if (tok === 'Td' || tok === 'TD' || tok === 'T*' || tok === 'BT' || tok === "'" || tok === '"') {
        flush();
      }
    } else {
      i++;
    }
  }
  flush();
  return lines.join('\n');
}

/** Extrae el texto de un PDF (best-effort). Devuelve '' si no consigue nada. */
export function extractTextFromPdf(bytes: Uint8Array): string {
  const raw = bytesToLatin1(bytes);
  let out = '';
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(raw)) !== null && count < 400) {
    count++;
    const start = m.index + m[0].length;
    const endIdx = raw.indexOf('endstream', start);
    if (endIdx === -1) break;

    const dictStart = raw.lastIndexOf('<<', m.index);
    const dict = dictStart !== -1 ? raw.slice(dictStart, m.index) : '';

    let chunk = bytes.subarray(start, endIdx);
    let end = chunk.length;
    while (end > 0 && (chunk[end - 1] === 0x0a || chunk[end - 1] === 0x0d)) end--;
    chunk = chunk.subarray(0, end);

    let decoded = '';
    if (/FlateDecode/.test(dict)) {
      try {
        decoded = bytesToLatin1(inflate(chunk));
      } catch {
        decoded = '';
      }
    } else if (!/[A-Za-z]+Decode/.test(dict)) {
      decoded = bytesToLatin1(chunk);
    }

    if (decoded) out += extractTextFromContent(decoded) + '\n';
    re.lastIndex = endIdx + 'endstream'.length;
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
