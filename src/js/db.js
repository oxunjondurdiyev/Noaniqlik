/* ═══════════════════════════════════════════════════════════════
   DB.JS — Firebase Firestore wrapper (UncertaintyCalc)
   ─────────────────────────────────────────────────────────────
   IndexedDB o'rniga Firebase Firestore ishlatiladi.
   Real-time multi-user ma'lumot almashish uchun.

   Collections:
     organizations  — tashkilotlar (admin hisoblar)
     employees      — xodimlar (har bir tashkilotga bog'liq)
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

  /* ─── INDEX BO'YICHA BITTA YOZUV ───────────────────── */
  async function getByIndex(store, indexName, value) {
    const snap = await getDb()
      .collection(store)
      .where(indexName, '==', value)
      .limit(1)
      .get();
    if (snap.empty) return undefined;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /* ─── BARCHA YOZUVLAR ───────────────────────────────── */
  async function getAll(store, indexName, value) {
    let query = getDb().collection(store);
    if (indexName !== undefined) {
      query = query.where(indexName, '==', value);
    }
    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /* ─── YANGI YOZUV QO'SHISH ─────────────────────────── */
  /** Firestore auto-ID (string) qaytaradi */
  async function add(store, data) {
    const ref = await getDb().collection(store).add(data);
    return ref.id;
  }

  /* ─── MAVJUD YOZUVNI YANGILASH ──────────────────────── */
  async function put(store, data) {
    const { id, ...rest } = data;
    await getDb().collection(store).doc(String(id)).set(rest, { merge: true });
    return id;
  }

  /* ─── YOZUVNI O'CHIRISH ─────────────────────────────── */
  async function remove(store, id) {
    await getDb().collection(store).doc(String(id)).delete();
  }

  /* ─── LOGIN MAVJUDLIGINI TEKSHIRISH ─────────────────── */
  async function isLoginTaken(login) {
    const [org, emp] = await Promise.all([
      getByIndex('organizations', 'login', login),
      getByIndex('employees',     'login', login),
    ]);
    return !!(org || emp);
  }

  /* ─── BARCHA BAZANI EKSPORT ─────────────────────────── */
  async function exportAll() {
    const [orgs, emps] = await Promise.all([
      getAll('organizations'),
      getAll('employees'),
    ]);
    return { organizations: orgs, employees: emps, exportedAt: new Date().toISOString() };
  }

  /* ─── REAL-TIME: BARCHA TASHKILOTLAR ────────────────── */
  /** Super-admin uchun: yangi ro'yxatdan o'tganlarni real vaqtda ko'rish.
   *  @param {function(orgs: Array)} callback  — har safar o'zgarganda chaqiriladi
   *  @returns {function} unsubscribe — tinglashni to'xtatish uchun
   */
  function onOrgsSnapshot(callback) {
    return getDb()
      .collection('organizations')
      .orderBy('registeredAt', 'desc')
      .onSnapshot(
        snap => {
          const orgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          callback(orgs);
        },
        err => console.error('[Firestore] onOrgsSnapshot xatosi:', err)
      );
  }

  return {
    get,
    getByIndex,
    getAll,
    add,
    put,
    remove,
    isLoginTaken,
    exportAll,
    onOrgsSnapshot,
  };

})();

window.DB = DB;
