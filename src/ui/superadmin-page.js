/* ═══════════════════════════════════════════════════════════════
   SUPERADMIN-PAGE.JS — super-admin paneli (superadmin.html)
   ─────────────────────────────────────────────────────────────
   • Mijoz kodida login/parol YO'Q (RISKS R-S2). Kirish — Firebase Auth.
   • Super-admin huquqi: ID token'dagi custom claim `superadmin: true`
     yoki Firestore'dagi `admins/{uid}` hujjati. Bu sahifadagi tekshiruv
     faqat UX uchun — haqiqiy himoya firestore.rules'da (isSuperAdmin()).
   • Sessiya — Firebase Auth holati (uc_sa_session emas, RISKS R-S4).
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $   = id => document.getElementById(id);
  const esc = s => window.UCEscape.escHtml(s);
  const t   = (k, v) => {
    const s = window.i18n ? i18n.t(k) : k;
    const base = s === k && window.AUTH_I18N ? (AUTH_I18N.uz[k] || k) : s;
    return v ? Object.keys(v).reduce((acc, key) => acc.split('{' + key + '}').join(String(v[key])), base) : base;
  };
  const auth = window.firebaseAuth;

  /* ─── Mavzu ──────────────────────────────────────────── */
  try { document.documentElement.setAttribute('data-theme', localStorage.getItem('uc_theme') || 'dark'); } catch (_) {}
  $('sa-btn-theme').addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('uc_theme', next); } catch (_) {}
  });
  if (window.i18n) i18n.apply();

  /* ─── Ko'rinishlar ───────────────────────────────────── */
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

  /* ─── Super-admin huquqini tekshirish ────────────────── */
  async function hasSuperAdminRights(user) {
    const tok = await user.getIdTokenResult(true);
    if (tok.claims && tok.claims.superadmin === true) return true;
    try {
      const doc = await DB.get('admins', user.uid);
      return !!doc;
    } catch (_) {
      return false;
    }
  }

  function toEmail(s) {
    const v = String(s || '').trim().toLowerCase();
    return v.includes('@') ? v : v + '@' + AUTH_EMAIL_DOMAIN;
  }

  async function doLogin() {
    const login = $('sa-login-inp').value.trim();
    const pwd   = $('sa-pwd-inp').value;
    showLoginErr('');
    if (!login || !pwd) { showLoginErr(t('auth_err_fill_all')); return; }
    try {
      await auth.signInWithEmailAndPassword(toEmail(login), pwd);
      $('sa-pwd-inp').value = '';
      // qolgani onAuthStateChanged'da
    } catch (e) {
      const c = e && e.code;
      showLoginErr(t(c === 'auth/too-many-requests' ? 'auth_err_too_many' : 'auth_err_bad_credentials'));
    }
  }

  $('sa-btn-login').addEventListener('click', doLogin);
  [$('sa-login-inp'), $('sa-pwd-inp')].forEach(inp =>
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); })
  );
  $('sa-btn-logout').addEventListener('click', () => auth.signOut());

  if (!auth) {
    showLogin();
    showLoginErr('Firebase Auth yuklanmadi');
    return;
  }

  auth.onAuthStateChanged(async user => {
    if (!user) { showLogin(); return; }
    if (await hasSuperAdminRights(user)) {
      showDashboard();
    } else {
      showLoginErr(t('auth_sa_not_admin'));
      await auth.signOut();
    }
  });

  /* ──────────────────────────────────────────────────────
     REAL-TIME DASHBOARD
  ────────────────────────────────────────────────────── */
  let allOrgs = [];
  let unsubscribeFn = null;
  let activeFilter = 'all';
  let searchQuery = '';
  const planNames = { basic: "Boshlang'ich", standard: 'Standart', pro: 'Pro' };

  function stopRealtime() {
    if (unsubscribeFn) { unsubscribeFn(); unsubscribeFn = null; }
  }

  function startRealtime() {
    stopRealtime();
    unsubscribeFn = DB.onOrgsSnapshot(orgs => {
      allOrgs = orgs;
      updateStats(orgs);
      renderTable();
      $('update-label').textContent = 'Yangilandi: ' + new Date().toLocaleTimeString('uz-UZ');
    }, err => {
      $('update-label').textContent = t('auth_err_permission') + ' (' + (err.code || err.message) + ')';
    });
  }

  function orgName(o) {
    return [o.firstName, o.lastName].filter(Boolean).join(' ') || o.fullName || '';
  }

  function updateStats(orgs) {
    const today = new Date().toISOString().slice(0, 10);
    $('stat-total').textContent   = orgs.length;
    $('stat-active').textContent  = orgs.filter(o => o.active === true).length;
    $('stat-pending').textContent = orgs.filter(o => o.active !== true && o.paymentStatus !== 'paid').length;
    $('stat-today').textContent   = orgs.filter(o => o.registeredAt === today).length;
  }

  function renderTable() {
    let list = allOrgs;
    if (activeFilter === 'active')   list = list.filter(o => o.active === true);
    if (activeFilter === 'inactive') list = list.filter(o => o.active === false && o.paymentStatus === 'paid');
    if (activeFilter === 'pending')  list = list.filter(o => o.active !== true && o.paymentStatus !== 'paid');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        orgName(o).toLowerCase().includes(q) ||
        String(o.inn || '').includes(q) ||
        String(o.login || '').toLowerCase().includes(q) ||
        String(o.phone || '').includes(q)
      );
    }

    const tbody = $('sa-org-tbody');
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9">
        <div class="sa-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          Tashkilot topilmadi
        </div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((org, i) => {
      const isActive    = org.active === true;
      const isPaid      = org.paymentStatus === 'paid';
      const statusClass = isActive ? 'active' : (isPaid ? 'inactive' : 'pending');
      const statusLabel = isActive ? 'Faol' : (isPaid ? 'Nofaol' : 'Kutilmoqda');
      const id          = esc(org.id);
      const req         = org.requestedPlan && org.requestedPlan !== org.plan && planNames[org.requestedPlan]
                          ? org.requestedPlan : null;
      const legacy      = !org.ownerUid ? ' <span class="pay-badge pending" title="Migratsiya qilinmagan (ownerUid yo\'q)">eski</span>' : '';

      return `
        <tr data-org-row="${id}">
          <td class="org-meta">${i + 1}</td>
          <td>
            <div class="org-name">${esc(orgName(org))}${legacy}</div>
            <div class="org-meta" style="font-family:'JetBrains Mono',monospace">${esc(org.login)}</div>
          </td>
          <td class="org-meta" style="font-family:'JetBrains Mono',monospace">${esc(org.inn)}</td>
          <td class="org-meta">${esc(org.phone)}</td>
          <td class="org-meta">${esc(planNames[org.plan] || org.plan)}${req ? `<br><span style="color:var(--accent)">→ ${esc(planNames[req])}?</span>` : ''}
            ${org.planExpiry ? `<br><span>${esc(org.planExpiry)}</span>` : ''}</td>
          <td><span class="pay-badge ${isPaid ? 'paid' : 'pending'}">${isPaid ? '✓ To\'langan' : '⏳ Kutilmoqda'}</span></td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td class="org-meta">${esc(org.registeredAt || '—')}</td>
          <td>
            <div class="action-row">
              ${!isPaid ? `<button type="button" class="btn btn-xs btn-pay-confirm" data-action="pay" data-id="${id}">To'lov tasdiqlash</button>` : ''}
              ${!isActive
                ? `<button type="button" class="btn btn-xs btn-activate" data-action="activate" data-id="${id}">Aktivlashtirish</button>`
                : `<button type="button" class="btn btn-xs btn-deactivate" data-action="deactivate" data-id="${id}">Bloklash</button>`}
              ${req ? `<button type="button" class="btn btn-xs btn-pay-confirm" data-action="plan" data-id="${id}" data-plan="${esc(req)}">${esc(t('sa_apply_plan', { plan: planNames[req] }))}</button>` : ''}
            </div>
          </td>
        </tr>`;
    }).join('');
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
     AMALLAR — faqat o'zgaradigan maydonlar yoziladi (update)
  ────────────────────────────────────────────────────── */
  function todayPlus(days) {
    return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  }

  const ACTIONS = {
    pay: {
      confirm: 'To\'lovni tasdiqlaysizmi? Holat "To\'langan" ga o\'zgaradi.',
      fields: () => ({ paymentStatus: 'paid', paidAt: todayPlus(0) }),
    },
    activate: {
      confirm: 'Tashkilotni aktivlashtirasizmi? Ular tizimga kira oladi.',
      fields: org => {
        const f = { active: true, activatedAt: todayPlus(0) };
        if (!org.planExpiry || org.planExpiry < todayPlus(0)) f.planExpiry = todayPlus(30);
        return f;
      },
    },
    deactivate: {
      confirm: 'Tashkilotni bloklaysizmi? Ular tizimga kira olmaydi.',
      fields: () => ({ active: false }),
    },
    plan: {
      confirm: 'So\'ralgan tarifni qo\'llaysizmi? (to\'lov tasdiqlanganiga ishonch hosil qiling)',
      fields: (org, btn) => ({ plan: btn.dataset.plan, requestedPlan: DB.deleteField() }),
    },
  };

  $('sa-org-tbody').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = ACTIONS[btn.dataset.action];
    if (!action) return;
    const org = allOrgs.find(o => o.id === btn.dataset.id);
    if (!org) return;
    if (!confirm(action.confirm)) return;
    try {
      await DB.update('organizations', org.id, action.fields(org, btn));
      if (btn.dataset.action === 'activate') flashRow(org.id);
    } catch (err) {
      alert('Xato: ' + err.message);
    }
  });

  function flashRow(orgId) {
    const row = Array.from(document.querySelectorAll('tr[data-org-row]')).find(r => r.dataset.orgRow === orgId);
    if (row) { row.classList.add('row-new'); setTimeout(() => row.classList.remove('row-new'), 2200); }
  }
})();
