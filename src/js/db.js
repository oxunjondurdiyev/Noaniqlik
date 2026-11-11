/* ═══════════════════════════════════════════════════════════════
   DB.JS — Firebase Firestore wrapper (UncertaintyCalc)
   ─────────────────────────────────────────────────────────────
   Collections (firestore.rules):
     organizations  — tashkilotlar (egasi: ownerUid)
     employees      — xodimlar, hujjat ID = xodimning Auth uid'i
     admins         — super-admin belgisi (faqat o'qish)

   Kirish huquqi mijoz kodida emas, Firestore qoidalarida tekshiriladi.
═══════════════════════════════════════════════════════════════ */

const DB = (() => {

  function getDb() {
    if (!window.firebaseDb) {
      throw new Error('Firebase ulanmagan. firebase-config.js ni tekshiring.');
    }
    return window.firebaseDb;
  }

  /* ─── BITTA YOZUV (ID bo'yicha) ────────────────────── */
  async function get(store, id) {
    const doc = await getDb().collection(store).doc(String(id)).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : undefined;
  }

  /* ─── MAYDON BO'YICHA BITTA YOZUV ──────────────────── */
  async function getByIndex(store, field, value) {
    const snap = await getDb().collection(store).where(field, '==', value).limit(1).get();
    if (snap.empty) return undefined;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /* ─── YOZUVLAR (ixtiyoriy filtr bilan) ──────────────── */
  async function getAll(store, field, value) {
    let query = getDb().collection(store);
    if (field !== undefined) query = query.where(field, '==', value);
    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /* ─── BERILGAN ID BILAN YANGI YOZUV ─────────────────── */
  async function create(store, id, data) {
    await getDb().collection(store).doc(String(id)).set(data);
    return String(id);
  }

  /* ─── QISMAN YANGILASH (faqat berilgan maydonlar) ───── */
  async function update(store, id, fields) {
    await getDb().collection(store).doc(String(id)).update(fields);
    return String(id);
  }

  /* ─── YOZUVNI O'CHIRISH ─────────────────────────────── */
  async function remove(store, id) {
    await getDb().collection(store).doc(String(id)).delete();
  }

  /* ─── MAYDONNI O'CHIRISH QIYMATI ────────────────────── */
  function deleteField() {
    return firebase.firestore.FieldValue.delete();
  }

  /* ─── REAL-TIME: BARCHA TASHKILOTLAR (super-admin) ──── */
  /** Qoidalar faqat super-admin'ga ruxsat beradi.
   *  @param {function(Array)} callback
   *  @param {function(Error)} [onError]
   *  @returns {function} unsubscribe */
  function onOrgsSnapshot(callback, onError) {
    return getDb()
      .collection('organizations')
      .onSnapshot(
        snap => {
          const orgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          orgs.sort((a, b) => (b.registeredAt || '').localeCompare(a.registeredAt || ''));
          callback(orgs);
        },
        err => {
          console.error('[Firestore] onOrgsSnapshot xatosi:', err);
          if (onError) onError(err);
        }
      );
  }

  return { get, getByIndex, getAll, create, update, remove, deleteField, onOrgsSnapshot };

})();

window.DB = DB;
