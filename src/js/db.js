/* ═══════════════════════════════════════════════════════════════
   DB.JS — Firebase Firestore o'rami (UncertaintyCalc)
   ─────────────────────────────────────────────────────────────
   Kirish huquqi firestore.rules da tekshiriladi — bu yerdagi
   funksiyalar faqat qulaylik uchun. Ruxsat berilmagan o'qish/yozish
   Firestore tomonidan PERMISSION_DENIED bilan rad etiladi.

   Kolleksiyalar (firestore.rules):
     organizations/{adminUid}  — tashkilotlar
     employees/{uid}           — xodimlar (orgId maydoni bilan)
     authCleanup/{uid}         — Auth'dan qo'lda o'chirilishi kerak hisoblar

   P02: parol, parol xeshi, `login` bo'yicha anonim qidiruv olib
   tashlandi (isLoginTaken, getByIndex). Login yagonaligini Firebase
   Authentication o'zi kafolatlaydi (bitta email — bitta hisob).
═══════════════════════════════════════════════════════════════ */

const DB = (() => {

  function getDb() {
    if (!window.firebaseDb) {
      throw new Error('Firebase ulanmagan. firebase-config.js ni tekshiring.');
    }
    return window.firebaseDb;
  }

  function withId(doc) {
    return { id: doc.id, ...doc.data() };
  }

  /* ─── BITTA YOZUV (ID bo'yicha) ────────────────────── */
  async function get(store, id) {
    const doc = await getDb().collection(store).doc(String(id)).get();
    return doc.exists ? withId(doc) : undefined;
  }

  /* ─── RO'YXAT (ixtiyoriy where field == value) ─────── */
  async function getAll(store, field, value) {
    let query = getDb().collection(store);
    if (field !== undefined) query = query.where(field, '==', value);
    const snap = await query.get();
    return snap.docs.map(withId);
  }

  /* ─── BERILGAN ID BILAN YARATISH / ALMASHTIRISH ────── */
  async function set(store, id, data) {
    await getDb().collection(store).doc(String(id)).set(data);
    return String(id);
  }

  /* ─── FAQAT BERILGAN MAYDONLARNI YANGILASH ─────────── */
  async function update(store, id, fields) {
    await getDb().collection(store).doc(String(id)).update(fields);
    return String(id);
  }

  /* ─── O'CHIRISH ────────────────────────────────────── */
  async function remove(store, id) {
    await getDb().collection(store).doc(String(id)).delete();
  }

  /* ─── ATOMAR BATCH ─────────────────────────────────── */
  // ops: [{ op: 'set'|'update'|'delete', store, id, data? }]
  async function batch(ops) {
    const db = getDb();
    const b = db.batch();
    ops.forEach(o => {
      const ref = db.collection(o.store).doc(String(o.id));
      if (o.op === 'set') b.set(ref, o.data);
      else if (o.op === 'update') b.update(ref, o.data);
      else if (o.op === 'delete') b.delete(ref);
      else throw new Error('Unknown batch op: ' + o.op);
    });
    await b.commit();
  }

  /* ─── Maydonni o'chirish belgisi ──────────────────── */
  function deleteField() {
    return firebase.firestore.FieldValue.delete();
  }

  /* ─── REAL-TIME ────────────────────────────────────── */
  // Faqat super-admin (qoidalar: organizations list → superadmin).
  function onCollectionSnapshot(store, callback, onError) {
    return getDb().collection(store).onSnapshot(
      snap => callback(snap.docs.map(withId)),
      err => { console.error('[Firestore] ' + store + ':', err.code || err.message); if (onError) onError(err); }
    );
  }

  function onOrgsSnapshot(callback, onError) {
    return onCollectionSnapshot('organizations', orgs => {
      orgs.sort((a, b) => (b.registeredAt || '').localeCompare(a.registeredAt || ''));
      callback(orgs);
    }, onError);
  }

  return { get, getAll, set, update, remove, batch, deleteField, onCollectionSnapshot, onOrgsSnapshot };

})();

window.DB = DB;
