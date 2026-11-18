/* ═══════════════════════════════════════════════════════════════
   XLSX-WRITE.JS — varaqlar modelini (.xlsx) faylga yozish (P05b). Sof modul: DOM yo'q, tarmoq yo'q.
   SheetJS chaqiruvchi tomonidan beriladi (src/io/vendor.js::loadXlsx — yagona yuklash nuqtasi).
   Qoidalar:
     • faqat QIYMATLAR yoziladi — formula yo'q (katakda `f` maydoni hech qachon bo'lmaydi);
     • son → { t: 'n' } to'liq aniqlikda (SheetJS sonni String(v) — eng qisqa aniq ko'rinishda yozadi), yaxlitlanmaydi;
     • matn → { t: 's' } — satr '=', '+', '-', '@' bilan boshlansa ham MATN katagi (Excel uni formula deb o'qimaydi);
     • chekli bo'lmagan son modelda allaqachon matn ('∞'); bu yerda uchrasa — bo'sh katak.
═══════════════════════════════════════════════════════════════ */
import { colName } from './export-table.js';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Bitta varaq (SheetJS worksheet obyekti) */
export function buildSheet(rows) {
  const ws = {};
  let maxC = 0;
  const widths = [];
  (rows || []).forEach((row, r) => {
    (row || []).forEach((v, c) => {
      if (v === null || v === undefined) return;
      let cellObj = null;
      if (typeof v === 'number') { if (Number.isFinite(v)) cellObj = { t: 'n', v }; } else cellObj = { t: 's', v: String(v) };
      if (!cellObj) return;
      ws[colName(c) + (r + 1)] = cellObj;
      if (c > maxC) maxC = c;
      const len = String(v).length;
      if (!widths[c] || widths[c] < len) widths[c] = len;
    });
  });
  ws['!ref'] = 'A1:' + colName(maxC) + Math.max(1, (rows || []).length);
  ws['!cols'] = Array.from({ length: maxC + 1 }, (_, c) => ({ wch: Math.max(8, Math.min(48, (widths[c] || 8) + 2)) }));
  return ws;
}

/** Model → SheetJS workbook */
export function buildWorkbook(XLSX, model) {
  const wb = XLSX.utils.book_new();
  for (const s of model.sheets) XLSX.utils.book_append_sheet(wb, buildSheet(s.rows), s.name);
  return wb;
}

/** Model → .xlsx baytlari (Uint8Array) */
export function writeXlsx(XLSX, model) {
  const out = XLSX.write(buildWorkbook(XLSX, model), { type: 'array', bookType: 'xlsx', compression: true });
  return out instanceof Uint8Array ? out : new Uint8Array(out);
}
