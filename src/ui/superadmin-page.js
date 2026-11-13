/* ═══════════════════════════════════════════════════════════════
   SUPERADMIN-PAGE.JS — superadmin.html kontrolleri (P02)
   ─────────────────────────────────────────────────────────────
   • Mijoz kodida login/parol YO'Q. Kirish — Firebase Auth,
     huquq — token'dagi custom claim `superadmin: true`
     (scripts/set-superadmin-claim.mjs). localStorage'dagi
     "uc_sa_session" bayrog'i olib tashlandi (R-S2, R-S4).
   • Panelni ochib olish yetarli emas: Firestore qoidalari
     claim'siz so'rovlarni rad etadi.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const T = window.UiTemplates;
  const Core = window.AuthCore;
  const PLANS = AuthManager.PLANS;

  /* ─── Mavzu ──────────────────────────────────────────── */
  try {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('uc_theme') || 'dark');
  } catch { /* */ }
  $('sa-btn-theme').addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('uc_theme', next); } catch { /* */ }
  });

  /* ─── Login ──────────────────────────────────────────── */
  let unsubscribers = [];

  function stopRealtime() {
    unsubscribers.forEach(fn => { try { fn(); } catch { /* */ } });
    unsubscribers = [];
  }

  function showDashboard() {
    $('sa-login-screen').style.display = 'none';
    $('sa-dashboard').style.display = 'block';
    startRealtime();
  }

  function showLogin() {
    stopRealtime();
    $('sa-login-screen').style.display = 'flex';
    $('sa-dashboard').style.display = 'none';
  }

  function showLoginErr(msg) {
    const el = $('sa-login-error');
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
  }

  async function doLogin() {
    showLoginErr('');
    const login = $('sa-login-inp').value.trim();
    const pwd   = $('sa-pwd-inp').value;
    if (!login || !pwd) { showLoginErr('Login va parolni kiriting'); return; }
    const btn = $('sa-btn-login');
    btn.disabled = true;
    try {
      await AuthManager.loginSuperadmin(login, pwd);
      $('sa-pwd-inp').value = '';
      showDashboard();
    } catch (e) {
      showLoginErr(e.message);
    } finally {
      btn.disabled = false;
    }
  }

  $('sa-btn-login').addEventListener('click', doLogin);
  [$('sa-login-inp'), $('sa-pwd-inp')].forEach(inp =>
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); })
  );

  $('sa-btn-logout').addEventListener('click', async () => {
    stopRealtime();
    await AuthManager.logout();
    showLogin();
  });

  /* ─── Boshlang'ich holat: Auth token'idan ────────────── */
  AuthManager.ready().then(s => {
    if (s && s.role === 'superadmin') showDashboard();
    else showLogin();
  });
  AuthManager.onChange(s => {
    if (!s || s.role !== 'superadmin') showLogin();
  });

  /* ──────────────────────────────────────────────────────
     REAL-TIME DASHBOARD
  ────────────────────────────────────────────────────── */
  let allOrgs      = [];
  let activeFilter = 'all';
  let searchQuery  = '';

  function startRealtime() {
    stopRealtime();
    unsubscribers.push(DB.onOrgsSnapshot(orgs => {
      allOrgs = orgs;
      updateStats(orgs);
      renderTable();
      $('update-label').textContent = 'Yangilandi: ' + new Date().toLocaleTimeString('uz-UZ');
    }, err => {
      $('update-label').textContent = 'Xato: ' + (err.code || err.message);
    }));
    unsubscribers.push(DB.onCollectionSnapshot('authCleanup', list => {
      list.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
      $('sa-cleanup-count').textContent = String(list.length);
      $('sa-cleanup-tbody').innerHTML = T.cleanupRowsHTML(list);
    }));
  }

  /* ─── Statistika ─────────────────────────────────────── */
  function updateStats(orgs) {
    const today = new Date().toISOString().slice(0, 10);
    $('stat-total').textContent   = orgs.length;
    $('stat-active').textContent  = orgs.filter(o => o.active === true).length;
    $('stat-pending').textContent = orgs.filter(o => o.active !== true && o.paymentStatus !== 'paid').length;
    $('stat-today').textContent   = orgs.filter(o => o.registeredAt === today).length;
  }

  /* ─── Jadval render ──────────────────────────────────── */
  function renderTable() {
    let list = allOrgs;
    if (activeFilter === 'active')   list = list.filter(o => o.active === true);
    if (activeFilter === 'inactive') list = list.filter(o => o.active === false && o.paymentStatus === 'paid');
    if (activeFilter === 'pending')  list = list.filter(o => o.active !== true  && o.paymentStatus !== 'paid');
    if (activeFilter === 'requests') list = list.filter(o => o.requestedPlan && o.requestedPlan !== o.plan);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        Core.orgDisplayName(o).toLowerCase().includes(q) ||
        String(o.inn || '').includes(q) ||
        String(o.login || '').toLowerCase().includes(q) ||
        String(o.phone || '').includes(q)
      );
    }
    $('sa-org-tbody').innerHTML = T.superadminRowsHTML(list, PLANS);
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderTable();
    });
  });

  $('sa-search').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderTable();
  });

  /* ──────────────────────────────────────────────────────
     AMALLAR (delegatsiya; inline onclick yo'q)
  ────────────────────────────────────────────────────── */
  const today = () => new Date().toISOString().slice(0, 10);

  function extendedExpiry(org) {
    // Joriy muddat hali tugamagan bo'lsa — undan, aks holda bugundan +30 kun
    const base = org && org.planExpiry && Date.parse(org.planExpiry) > Date.now()
      ? Date.parse(org.planExpiry) : Date.now();
    return Core.isoDatePlusDays(30, base);
  }

  const ACTIONS = {
    'confirm-payment': {
      ask: 'To\'lovni tasdiqlaysizmi? Holat "To\'langan" ga o\'zgaradi.',
      fields: () => ({ paymentStatus: 'paid', paidAt: today() }),
    },
    activate: {
      ask: 'Tashkilotni aktivlashtirasizmi? Ular tizimga kira oladi.',
      fields: org => {
        const f = { active: true, activatedAt: today() };
        if (!org.planExpiry || Date.parse(org.planExpiry) <= Date.now()) f.planExpiry = extendedExpiry(org);
        return f;
      },
    },
    deactivate: {
      ask: 'Tashkilotni bloklaysizmi? Ular tizimga kira olmaydi.',
      fields: () => ({ active: false }),
    },
    'apply-plan': {
      ask: 'So\'ralgan tarifni qo\'llaysizmi? Obuna muddati 30 kunga yangilanadi.',
      fields: (org, btn) => PLANS[btn.dataset.plan]
        ? { plan: btn.dataset.plan, requestedPlan: DB.deleteField(), planExpiry: extendedExpiry(null) }
        : null,
    },
    extend: {
      ask: 'Obuna muddatini 30 kunga uzaytirasizmi?',
      fields: org => ({ planExpiry: extendedExpiry(org) }),
    },
  };

  $('sa-org-tbody').addEventListener('click', async ev => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const act = ACTIONS[btn.dataset.action];
    const org = allOrgs.find(o => o.id === btn.dataset.id);
    if (!act || !org) return;
    if (!confirm(act.ask)) return;
    const fields = act.fields(org, btn);
    if (!fields) return;
    btn.disabled = true;
    try {
      await DB.update('organizations', org.id, fields);
      flashRow(org.id);
    } catch (e) {
      showToast('Xato: ' + (e.code || e.message), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  $('sa-cleanup-tbody').addEventListener('click', async ev => {
    const btn = ev.target.closest('button[data-action="cleanup-done"]');
    if (!btn) return;
    if (!confirm('Bu Auth hisobini Firebase konsolida (Authentication → Users) o\'chirdingizmi?\nYozuv navbatdan olib tashlanadi.')) return;
    try {
      await DB.remove('authCleanup', btn.dataset.id);
    } catch (e) {
      showToast('Xato: ' + (e.code || e.message), 'error');
    }
  });

  function flashRow(orgId) {
    const row = [...document.querySelectorAll('#sa-org-tbody tr[data-row-id]')].find(r => r.dataset.rowId === orgId);
    if (row) { row.classList.add('row-new'); setTimeout(() => row.classList.remove('row-new'), 2200); }
  }

})();
