/* ═══════════════════════════════════════════════════════════════
   AI/KEY.JS — "o'z kaliti" rejimi: foydalanuvchining Anthropic API kaliti (P14, egasi qarori A).
   Kalit FAQAT sessionStorage da (tab yopilsa yo'qoladi). Doimiy brauzer xotirasiga, IndexedDB ga, Firebase ga,
   eksportga, auditga, konsol logiga HECH QACHON yozilmaydi (tests/ai/key.test.js).
   Bu modul faqat ai.html sahifasida yuklanadi (src/ui/ai/own-key.js); asosiy sahifalarda kalit umuman bo'lmaydi.
   Saqlash obyekti tashqaridan beriladi (test uchun) — standart: shu oynaning sessionStorage i.
═══════════════════════════════════════════════════════════════ */
export const KEY_NAME = 'uc_ai_key_v1';

const store = s => s || globalThis.sessionStorage;

export function getKey(s) { try { return store(s).getItem(KEY_NAME) || ''; } catch (e) { return ''; } }
export function setKey(value, s) { try { store(s).setItem(KEY_NAME, String(value || '').trim()); return true; } catch (e) { return false; } }
export function clearKey(s) { try { store(s).removeItem(KEY_NAME); } catch (e) { /* saqlash mavjud emas */ } }
