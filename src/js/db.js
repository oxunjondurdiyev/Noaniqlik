/* ═══════════════════════════════════════════════════════════════
   DB.JS — IndexedDB wrapper (UncertaintyCalc ma'lumotlar bazasi)
   ─────────────────────────────────────────────────────────────
   Schema v1:
     organizations  — tashkilotlar (admin hisoblar)
     employees      — xodimlar (har bir tashkilotga bog'liq)
═══════════════════════════════════════════════════════════════ */

const DB = (() => {

  const DB_NAME    = 'uc_database';
  const DB_VERSION = 1;
  let _db = null;

  /* ─── OCHISH / SCHEMA ──────────────────────────────── */
  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const db = e.target.result;

        /* organizations ─ tashkilotlar */
        if (!db.objectStoreNames.contains('organizations')) {
          const orgs = db.createObjectStore('organizations', {
            keyPath: 'id', autoIncrement: true,
          });
          orgs.createIndex('login', 'login', { unique: true });
          orgs.createIndex('inn',   'inn',   { unique: false }); // INN unikal emas (demo)
        }

        /* employees ─ xodimlar */
        if (!db.objectStoreNames.contains('employees')) {
          const emps = db.createObjectStore('employees', {
            keyPath: 'id', autoIncrement: true,
          });
          emps.createIndex('login', 'login', { unique: true });
          emps.createIndex('orgId', 'orgId', { unique: false });
        }
      };

      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
      req.onblocked = () => reject(new Error('IndexedDB bloklangan — eski oyna/tab ni yoping'));
    });
  }

  /* ─── ICHKI YORDAMCHI ──────────────────────────────── */
  function idbReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  /* ─── UMUMIY API ───────────────────────────────────── */

  /** Bitta yozuv ID bo'yicha */
  async function get(store, id) {
    const db = await open();
    return idbReq(db.transaction(store, 'readonly').objectStore(store).get(id));
  }

  /** Index bo'yicha bitta yozuv */
  async function getByIndex(store, indexName, value) {
    const db = await open();
    const t  = db.transaction(store, 'readonly');
    return idbReq(t.objectStore(store).index(indexName).get(value));
  }

  /** Barcha yozuvlar (ixtiyoriy: index + qiymat bo'yicha filter) */
  async function getAll(store, indexName, value) {
    const db = await open();
    const t  = db.transaction(store, 'readonly');
    const os = t.objectStore(store);
    if (indexName !== undefined) {
      return idbReq(os.index(indexName).getAll(value));
    }
    return idbReq(os.getAll());
  }

  /** Yangi yozuv qo'shish (autoIncrement ID qaytaradi) */
  async function add(store, data) {
    const db = await open();
    const t  = db.transaction(store, 'readwrite');
    const id = await idbReq(t.objectStore(store).add(data));
    return id;
  }

  /** Mavjud yozuvni yangilash (id bo'lishi shart) */
  async function put(store, data) {
    const db = await open();
    return idbReq(db.transaction(store, 'readwrite').objectStore(store).put(data));
  }

  /** Yozuvni o'chirish */
  async function remove(store, id) {
    const db = await open();
    return idbReq(db.transaction(store, 'readwrite').objectStore(store).delete(id));
  }

  /** Login mavjudligini tekshirish (organizations + employees) */
  async function isLoginTaken(login) {
    const [org, emp] = await Promise.all([
      getByIndex('organizations', 'login', login),
      getByIndex('employees',     'login', login),
    ]);
    return !!(org || emp);
  }

  /** Barcha bazani eksport qilish (debug / backup) */
  async function exportAll() {
    const [orgs, emps] = await Promise.all([
      getAll('organizations'),
      getAll('employees'),
    ]);
    return { organizations: orgs, employees: emps, exportedAt: new Date().toISOString() };
  }

  return { open, get, getByIndex, getAll, add, put, remove, isLoginTaken, exportAll };

})();

window.DB = DB;
