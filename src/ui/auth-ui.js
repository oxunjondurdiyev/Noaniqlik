/* ═══════════════════════════════════════════════════════════════
   AUTH-UI.JS — index.html dagi kirish / ro'yxatdan o'tish oynasi
   (avval inline <script> edi; CSP uchun tashqi faylga ko'chirildi — P02)
   Sessiya: Firebase Auth holati (AuthManager.onChange), localStorage emas.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $   = id => document.getElementById(id);
  const esc = s => window.UCEscape.escHtml(s);
  const t   = (k, v) => AuthManager.tr(k, v);

  function showErr(id, msg) {
    const el = $(id);
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
  }

  function showAuthScreen() { $('auth-screen').style.display = 'flex'; }
  function hideAuthScreen()  { $('auth-screen').style.display = 'none'; }

  /* ─── Topbar va nav tugmasi — Auth holatiga qarab ─── */
  function updateTopbar(session) {
    if (session) {
      $('topbar-user-name').textContent = session.name || session.login;
      $('topbar-user-role').textContent = session.role === 'admin' ? 'Admin' : 'Xodim';
      $('topbar-user-badge').style.display = 'flex';
      $('btn-topbar-logout').style.display = '';
      $('btn-admin-link').style.display    = session.role === 'admin' ? '' : 'none';
    } else {
      $('topbar-user-badge').style.display = 'none';
      $('btn-topbar-logout').style.display = 'none';
      $('btn-admin-link').style.display    = 'none';
    }
  }

  function updateNav(session) {
    const navBtn = $('btn-nav-login');
    if (!navBtn) return;
    navBtn.style.display = '';
    if (session) {
      navBtn.textContent = session.role === 'admin' ? 'Admin Panel' : 'Kalkulyator';
      navBtn.setAttribute('href', session.role === 'admin' ? 'admin.html' : '#');
      navBtn.dataset.mode = session.role === 'admin' ? 'admin' : 'app';
    } else {
      navBtn.setAttribute('href', '#');
      navBtn.dataset.mode = 'login';
      const lbl = navBtn.getAttribute('data-i18n');
      navBtn.textContent = (lbl && window.i18n) ? i18n.t(lbl) : 'Kirish';
    }
  }

  AuthManager.onChange(session => {
    if (session) hideAuthScreen();
    updateTopbar(session);
    updateNav(session);
  });

  /* ─── Nav login tugmasi ───────────────────────────── */
  const navLoginBtn = $('btn-nav-login');
  if (navLoginBtn) {
    navLoginBtn.addEventListener('click', (e) => {
      const mode = navLoginBtn.dataset.mode || 'login';
      if (mode === 'admin') return;                // admin.html ga oddiy havola
      e.preventDefault();
      if (mode === 'app') {
        const startBtn = $('btn-home-start');
        if (startBtn) startBtn.click();
        return;
      }
      showAuthScreen();
      document.querySelector('[data-auth-tab="login"]').click();
    });
  }

  /* ─── Tab almashtirish ────────────────────────────── */
  document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('auth-panel-' + btn.dataset.authTab).classList.add('active');
      $('auth-tabs-row').style.display = '';
      showErr('login-error', ''); showErr('reg-error', '');
    });
  });

  /* ─── To'lov kutilmoqda paneli ───────────────────── */
  function infoRow(label, valueHtml, valueStyle) {
    return `<div style="display:flex;justify-content:space-between;gap:.75rem">
        <span style="color:var(--text-muted)">${esc(label)}</span>
        <span style="${valueStyle || ''}">${valueHtml}</span>
      </div>`;
  }

  function showPendingPanel(org) {
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    $('auth-tabs-row').style.display = 'none';
    $('auth-panel-pending').classList.add('active');

    const plan = AuthManager.PLANS[org.plan] || AuthManager.PLANS.basic;
    const txId = 'ORG_' + org.id + '_' + Date.now();

    // RISKS R-S5 (2): barcha qiymatlar escape qilinadi
    $('pending-org-info').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.4rem">
        ${infoRow('Ism', esc(UCInvoice.orgDisplayName(org)), 'font-weight:500')}
        ${infoRow('Login', esc(org.login), 'font-family:monospace')}
        ${infoRow('Tarif', esc(plan.name) + ' — ' + (plan.priceMonthly / 1000).toFixed(0) + 'K UZS/oy')}
        ${infoRow("To'lov holati", '⏳ Kutilmoqda', 'color:#eab308')}
      </div>`;

    $('pending-btn-click').onclick = () => window.open(AuthManager.getClickUrl(plan.priceMonthly, txId), '_blank', 'noopener');
    $('pending-btn-payme').onclick = () => window.open(AuthManager.getPaymeUrl(plan.priceMonthly, txId), '_blank', 'noopener');
    $('pending-btn-bank').onclick  = () => {
      $('reg-invoice-content').innerHTML = UCInvoice.buildInvoiceHTML(org, []);
      $('reg-invoice-modal').style.display = 'flex';
    };
  }

  /* ─── Invoice modal (avval inline onclick) ────────── */
  const invModal = $('reg-invoice-modal');
  if (invModal) {
    invModal.addEventListener('click', e => { if (e.target === invModal) invModal.style.display = 'none'; });
    $('reg-invoice-print').addEventListener('click', () => window.print());
    $('reg-invoice-close').addEventListener('click', () => { invModal.style.display = 'none'; });
  }

  $('pending-to-login').addEventListener('click', () => {
    document.querySelector('[data-auth-tab="login"]').click();
  });
  $('link-to-register').addEventListener('click', e => {
    e.preventDefault(); document.querySelector('[data-auth-tab="register"]').click();
  });
  $('link-to-login').addEventListener('click', e => {
    e.preventDefault(); document.querySelector('[data-auth-tab="login"]').click();
  });

  /* ─── Login tavsiyasi (faqat lokal; band/bo'shligi ro'yxatdan
         o'tishda Firebase Auth tomonidan tekshiriladi) ──────── */
  function updateLoginSuggestion() {
    const firstName = $('reg-firstname').value.trim();
    const lastName  = $('reg-lastname').value.trim();
    if (!firstName && !lastName) return;
    $('reg-login').value = AuthManager.suggestLogin(firstName, lastName);
    $('login-check-msg').textContent = '';
  }

  $('reg-firstname').addEventListener('input', updateLoginSuggestion);
  $('reg-lastname').addEventListener('input', updateLoginSuggestion);
  $('btn-suggest-login').addEventListener('click', e => { e.preventDefault(); updateLoginSuggestion(); });

  /* ─── KIRISH ──────────────────────────────────────── */
  async function doLogin() {
    showErr('login-error', '');
    const user = $('login-user').value.trim();
    const pwd  = $('login-pwd').value;
    if (!user || !pwd) { showErr('login-error', t('auth_err_fill_all')); return; }
    const btn = $('btn-do-login');
    btn.disabled = true; btn.textContent = 'Kirilmoqda…';
    try {
      await AuthManager.login(user, pwd);
      $('login-pwd').value = '';
      hideAuthScreen();
    } catch (e) {
      showErr('login-error', e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Kirish →';
    }
  }

  $('btn-do-login').addEventListener('click', doLogin);
  [$('login-user'), $('login-pwd')].forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });

  /* ─── RO'YXATDAN O'TISH ───────────────────────────── */
  $('btn-do-register').addEventListener('click', async () => {
    showErr('reg-error', '');
    const inn       = $('reg-inn').value.trim();
    const phone     = $('reg-phone').value.trim();
    const firstName = $('reg-firstname').value.trim();
    const lastName  = $('reg-lastname').value.trim();
    const login     = $('reg-login').value.trim().toLowerCase();
    const pwd       = $('reg-pwd').value;
    const pwd2      = $('reg-pwd2').value;
    const empCount  = $('reg-empcount').value;

    if (!inn || !phone || !firstName || !lastName || !login || !pwd) {
      showErr('reg-error', t('auth_err_fill_all')); return;
    }
    if (pwd !== pwd2) { showErr('reg-error', t('auth_err_pwd_mismatch')); return; }

    const btn = $('btn-do-register');
    btn.disabled = true; btn.textContent = 'Saqlanmoqda…';
    try {
      const registeredOrg = await AuthManager.register({
        inn, phone, firstName, lastName, login, password: pwd, employeeCount: empCount,
      });
      ['reg-inn', 'reg-phone', 'reg-firstname', 'reg-lastname', 'reg-login', 'reg-pwd', 'reg-pwd2', 'reg-empcount']
        .forEach(fid => { const el = $(fid); if (el) el.value = ''; });
      showPendingPanel(registeredOrg);
    } catch (e) {
      showErr('reg-error', e.message);
    } finally {
      btn.disabled = false; btn.textContent = 'Ro\'yxatdan o\'tish →';
    }
  });

  /* ─── CHIQISH ─────────────────────────────────────── */
  $('btn-topbar-logout').addEventListener('click', async () => {
    await AuthManager.logout();
    hideAuthScreen();
  });

  /* ─── PAROL KO'RISH TUGMASI ──────────────────────── */
  const EYE_ON  = `<svg class="eye-on"  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYE_OFF = `<svg class="eye-off" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  document.querySelectorAll('.pwd-eye').forEach(btn => {
    btn.innerHTML = EYE_ON + EYE_OFF;
    btn.addEventListener('click', () => {
      const inp = $(btn.dataset.target);
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.classList.toggle('visible', show);
      inp.focus();
    });
  });

  // Ichki API (app.js paywall'i uchun)
  window.UCAuthUI = { showAuthScreen, hideAuthScreen };
})();
