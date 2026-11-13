/* ═══════════════════════════════════════════════════════════════
   INDEX-AUTH.JS — index.html dagi kirish / ro'yxatdan o'tish UI
   (P02: inline skriptdan ko'chirildi; CSP `script-src 'self'`)
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const T = window.UiTemplates;
  const PLANS = AuthManager.PLANS;

  function showErr(id, msg) {
    const el = $(id);
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
  }

  function showAuthScreen() { $('auth-screen').style.display = 'flex'; }
  function hideAuthScreen() { $('auth-screen').style.display = 'none'; }

  /* ─── Sessiya → UI (Firebase Auth holatidan) ─────── */
  const navBtn = $('btn-nav-login');

  function applySession(session) {
    if (session && (session.role === 'admin' || session.role === 'employee')) {
      $('topbar-user-name').textContent = session.name || session.login || '';
      $('topbar-user-role').textContent = session.role === 'admin' ? 'Admin' : 'Xodim';
      $('topbar-user-badge').style.display = 'flex';
      $('btn-topbar-logout').style.display = '';
      $('btn-admin-link').style.display    = session.role === 'admin' ? '' : 'none';
      if (navBtn) {
        navBtn.textContent = session.role === 'admin' ? 'Admin Panel' : 'Kalkulyator';
        navBtn.dataset.mode = session.role;
      }
    } else {
      $('topbar-user-badge').style.display = 'none';
      $('btn-topbar-logout').style.display = 'none';
      $('btn-admin-link').style.display    = 'none';
      if (navBtn) {
        navBtn.textContent = 'Kirish';
        navBtn.dataset.mode = 'login';
        navBtn.style.display = '';
      }
    }
  }

  AuthManager.ready().then(applySession);
  AuthManager.onChange(applySession);

  if (navBtn) {
    navBtn.addEventListener('click', e => {
      e.preventDefault();
      const mode = navBtn.dataset.mode;
      if (mode === 'admin') { location.href = 'admin.html'; return; }
      if (mode === 'employee') { const s = $('btn-home-start'); if (s) s.click(); return; }
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
  let _pendingOrg = null;

  function showPendingPanel(org) {
    _pendingOrg = org;
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    $('auth-tabs-row').style.display = 'none';
    $('auth-panel-pending').classList.add('active');
    $('pending-org-info').innerHTML = T.pendingOrgInfoHTML(org, PLANS);
  }

  function pendingTx() { return 'ORG_' + _pendingOrg.id + '_' + Date.now(); }
  function pendingPrice() { return (PLANS[_pendingOrg.plan] || PLANS.basic).priceMonthly; }

  $('pending-btn-click').addEventListener('click', () => {
    if (_pendingOrg) window.open(AuthManager.getClickUrl(pendingPrice(), pendingTx()), '_blank', 'noopener');
  });
  $('pending-btn-payme').addEventListener('click', () => {
    if (_pendingOrg) window.open(AuthManager.getPaymeUrl(pendingPrice(), pendingTx()), '_blank', 'noopener');
  });
  $('pending-btn-bank').addEventListener('click', () => {
    if (!_pendingOrg) return;
    $('reg-invoice-content').innerHTML = T.invoiceHTML(_pendingOrg, [], PLANS);
    $('reg-invoice-modal').style.display = 'flex';
  });

  /* ─── Hisob-faktura oynasi (inline onclick o'rniga) ── */
  const invModal = $('reg-invoice-modal');
  invModal.addEventListener('click', e => { if (e.target === invModal) invModal.style.display = 'none'; });
  $('reg-invoice-print').addEventListener('click', () => window.print());
  $('reg-invoice-close').addEventListener('click', () => { invModal.style.display = 'none'; });

  $('pending-to-login').addEventListener('click', () => {
    document.querySelector('[data-auth-tab="login"]').click();
  });
  $('link-to-register').addEventListener('click', e => {
    e.preventDefault(); document.querySelector('[data-auth-tab="register"]').click();
  });
  $('link-to-login').addEventListener('click', e => {
    e.preventDefault(); document.querySelector('[data-auth-tab="login"]').click();
  });

  /* ─── Login tavsiyasi (lokal; bazaga anonim so'rov yo'q) ── */
  // Login bandligi ro'yxatdan o'tish paytida Firebase Auth tomonidan
  // tekshiriladi ("Bu login band").
  function updateLoginSuggestion() {
    const firstName = $('reg-firstname').value.trim();
    const lastName  = $('reg-lastname').value.trim();
    if (!firstName && !lastName) return;
    $('reg-login').value = AuthManager.suggestLogin(firstName, lastName);
    checkLoginFormat();
  }

  function checkLoginFormat() {
    const login = window.AuthCore.normalizeLogin($('reg-login').value);
    const msg   = $('login-check-msg');
    if (!login) { msg.textContent = ''; return; }
    const ok = window.AuthCore.isValidLogin(login);
    msg.textContent = ok ? '✓ Format to\'g\'ri' : '✗ 3–32 belgi: a-z, 0-9, ". _ -"';
    msg.style.color = ok ? 'var(--success)' : 'var(--danger)';
  }

  $('reg-firstname').addEventListener('input', updateLoginSuggestion);
  $('reg-lastname').addEventListener('input', updateLoginSuggestion);
  $('reg-login').addEventListener('input', checkLoginFormat);
  $('btn-suggest-login').addEventListener('click', e => {
    e.preventDefault(); updateLoginSuggestion();
  });

  /* ─── KIRISH ──────────────────────────────────────── */
  async function doLogin() {
    showErr('login-error', '');
    const user = $('login-user').value.trim();
    const pwd  = $('login-pwd').value;
    if (!user || !pwd) { showErr('login-error', 'Login va parolni kiriting'); return; }
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
    const inn        = $('reg-inn').value.trim();
    const phone      = $('reg-phone').value.trim();
    const firstName  = $('reg-firstname').value.trim();
    const lastName   = $('reg-lastname').value.trim();
    const login      = $('reg-login').value.trim().toLowerCase();
    const pwd        = $('reg-pwd').value;
    const pwd2       = $('reg-pwd2').value;
    const empCount   = $('reg-empcount').value;

    if (!inn || !phone || !firstName || !lastName || !login || !pwd) {
      showErr('reg-error', 'Barcha maydonlarni to\'ldiring'); return;
    }
    if (pwd !== pwd2) {
      showErr('reg-error', 'Parollar mos kelmaydi'); return;
    }

    const btn = $('btn-do-register');
    btn.disabled = true; btn.textContent = 'Saqlanmoqda…';
    try {
      const registeredOrg = await AuthManager.register({
        inn, phone, firstName, lastName,
        login, password: pwd, employeeCount: empCount,
      });
      ['reg-inn', 'reg-phone', 'reg-firstname', 'reg-lastname', 'reg-login', 'reg-pwd', 'reg-pwd2', 'reg-empcount'].forEach(fid => {
        const el = $(fid);
        if (el) el.value = '';
      });
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

  /* ─── PAROL KO'RISH TUGMASI (foydalanuvchi o'zi yozgan parol) ── */
  const EYE_ON  = '<svg class="eye-on"  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg class="eye-off" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  document.querySelectorAll('.pwd-eye').forEach(btn => {
    btn.innerHTML = EYE_ON + EYE_OFF;   // statik ikonka, foydalanuvchi ma'lumoti emas
    btn.addEventListener('click', () => {
      const inp = $(btn.dataset.target);
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.classList.toggle('visible', show);
      inp.focus();
    });
  });

})();
