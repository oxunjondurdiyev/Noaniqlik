/* ═══════════════════════════════════════════════════════════════
   APP.JS — Main application controller
   Initializes all modules, wires up events
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── TRIAL MANAGER ─────────────────────────────── */
  // Kirish rejimi — src/js/access-mode.js (window.UCAccess; egasi qarori 2026-11-24: ochiq test rejimi).
  // 'open-test' da hisoblagich va to'lov oynasi o'chiq; 'subscription' da — 7 ta sinov hisobi.
  const ACCESS     = window.UCAccess.policy();
  const FREE_LIMIT = ACCESS.trialLimit;
  const TRIAL_KEY  = 'uc_trial_count';

  function getTrialCount() {
    return parseInt(localStorage.getItem(TRIAL_KEY) || '0', 10);
  }
  function incrementTrial() {
    localStorage.setItem(TRIAL_KEY, getTrialCount() + 1);
  }
  function signedIn() {
    return !!(window.AuthManager && window.AuthManager.getSession());
  }
  function isTrialActive() {
    return window.UCAccess.canStartSession({ signedIn: signedIn(), used: getTrialCount() });
  }

  function showPaywall() {
    const modal = document.getElementById('trial-paywall');
    if (!modal) return;
    // Progressni yangilash
    const used      = Math.min(getTrialCount(), FREE_LIMIT);
    const dotsEl    = modal.querySelector('.paywall-dots');
    if (dotsEl) {
      dotsEl.innerHTML = Array.from({ length: FREE_LIMIT }, (_, i) =>
        `<span class="pdot ${i < used ? 'filled' : ''}"></span>`
      ).join('');
    }
    modal.style.display = 'flex';
  }

  function hidePaywall() {
    const modal = document.getElementById('trial-paywall');
    if (modal) modal.style.display = 'none';
  }

  function updateTrialBanner() {
    const banner  = document.getElementById('trial-banner');
    if (!banner) return;
    if (signedIn() || FREE_LIMIT === null) { banner.hidden = true; return; }

    const used      = getTrialCount();
    const remaining = FREE_LIMIT - used;

    banner.hidden = false;
    if (remaining <= 0) {
      banner.className = 'trial-banner trial-danger';
      banner.textContent = i18n.t('trial_over');
    } else {
      banner.className = `trial-banner ${remaining <= 2 ? 'trial-warn' : 'trial-info'}`;
      // Tarjima escape qilinadi; <b> faqat sonlar atrofida (foydalanuvchi ma'lumoti emas)
      banner.innerHTML = escHtml(i18n.t('trial_left'))
        .replace('{used}', `<b>${used}/${FREE_LIMIT}</b>`).replace('{left}', `<b>${remaining}</b>`);
    }
  }

  /* ─── DOM CACHE ─────────────────────────────────── */
  const homeScreen    = document.getElementById('home-screen');
  const appShell      = document.getElementById('app');

  /* ─── SCREEN NAVIGATION ──────────────────────────── */
  function showScreen(name) {
    homeScreen   .classList.toggle('hidden', name !== 'home');
    appShell     .classList.toggle('hidden', name !== 'app');
    const tplScreen = document.getElementById('templates-screen');
    if (tplScreen) tplScreen.classList.toggle('hidden', name !== 'templates');
    const dash = document.getElementById('dash-screen');          // Bosh sahifa (src/ui/home/)
    if (dash) dash.classList.toggle('hidden', name !== 'dash');
    document.dispatchEvent(new CustomEvent('screenchange', { detail: { screen: name } }));
    if (name !== 'home') window.scrollTo(0, 0);
  }

  /* Trial tekshiruvi (yangi sessiya boshlanganda). false — paywall ko'rsatildi. */
  function beginSession() {
    if (!isTrialActive()) {
      showPaywall();
      return false;
    }
    if (window.UCAccess.countsTrial({ signedIn: signedIn() })) {
      incrementTrial();
      updateTrialBanner();
    }
    return true;
  }

  /* ─── UTILITIES ─────────────────────────────────── */
  // showToast — src/ui/toast.js (xabar faqat textContent orqali, P02)

  window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });
    // P16: qobiq (src/ui/shell/app.js) — chap menyu, stepper va joylashuv yo'li shu hodisadan yangilanadi
    document.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: tabName } }));
  };

  // Yagona escape: src/ui/escape.js (P02)
  const escHtml = window.escHtml;

  /* ─── THEME — event delegation (works for ALL screens) ── */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('uc_theme', next);
  }

  function initTheme() {
    const saved = localStorage.getItem('uc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    /* Single delegated listener — catches buttons on ALL screens */
    document.addEventListener('click', e => {
      if (e.target.closest('.theme-toggle')) toggleTheme();
    });
  }

  /* ─── LANGUAGE — event delegation ───────────────── */
  function initLang() {
    i18n.apply();
    document.addEventListener('langchange', updateTrialBanner);
    document.addEventListener('click', e => {
      const btn = e.target.closest('.lang-btn');
      if (!btn || !btn.dataset.lang) return;
      i18n.setLang(btn.dataset.lang);
      Table.render();
      TypeB.render();
      Results.render();
    });
  }

  /* ─── HOME PAGE ─────────────────────────────────── */
  function initHome() {
    // "Kalkulyatorni ochish" — brauzer Bosh sahifani ko'rgani belgilanadi: keyingi ochilishda tanishtiruv sahifasi emas, Bosh sahifa
    const openDash = () => { markSeenDash(); showScreen('dash'); };
    document.getElementById('btn-home-start').addEventListener('click',  openDash);
    document.getElementById('btn-home-start2').addEventListener('click', openDash);
    /* Formula cycling animation */
    const items = document.querySelectorAll('.fc-item');
    const dots  = document.querySelectorAll('.fc-dot');
    let cur = 0;
    setInterval(() => {
      items[cur].classList.remove('active');
      dots[cur].classList.remove('active');
      cur = (cur + 1) % items.length;
      items[cur].classList.add('active');
      dots[cur].classList.add('active');
    }, 2800);
  }

  /* ─── YANGI HISOB (P22-1: UX-01) ─────────────────────
     "Hisoblashni sozlash" oynasi (N, P, "Sozlamani yuklash") olib tashlandi: Bosh sahifadagi "Yangi hisob" to'g'ridan-to'g'ri
     Model qadamini ochadi. P — formuladan, N — jadvaldan (src/ui/flow/model.js). Namunalar — shablonlar katalogida. */
  function newCalculation() {
    if (!beginSession()) return false;
    appState.set(window.UCFlow.blankCalc());
    showScreen('app');
    Table.render();
    TypeB.render();
    Results.render();
    if (window.UCShell) window.UCShell.goStep('model'); else switchTab('model');
    const f = document.getElementById('model-formula');
    if (f) f.focus();
    return true;
  }

  function initReset() {
    document.getElementById('btn-reset').addEventListener('click', () => {
      // P22-2: ilova ichidagi tasdiq dialogi (src/ui/shell/app.js); qobiq yuklanmagan bo'lsa — avvalgi brauzer tasdig'i
      if (window.UCShell && window.UCShell.runAction) window.UCShell.runAction('new');
      else if (confirm(i18n.t('confirm_new_session'))) newCalculation();
    });
  }

  /* ─── TAB SWITCHING ─────────────────────────────── */
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  /* ─── PAYWALL MODAL tugmalari ────────────────────── */
  function initPaywall() {
    const modal = document.getElementById('trial-paywall');
    if (!modal) return;

    modal.querySelector('#paywall-btn-register').addEventListener('click', () => {
      hidePaywall();
      showScreen('home');
      window.UCAuthScreen.show('register');
    });

    modal.querySelector('#paywall-btn-login').addEventListener('click', () => {
      hidePaywall();
      showScreen('home');
      window.UCAuthScreen.show('login');
    });
  }

  /* ─── BOOTSTRAP ─────────────────────────────────── */
  function bootstrap() {
    initTheme();
    initLang();
    initHome();
    initReset();
    updateTrialBanner();
    initTabs();
    initPaywall();
    Table.init();
    TypeB.init();
    Results.init();

    // Saqlangan (boshlangan) hisob bo'lsa — ekran to'g'ridan-to'g'ri ish maydoniga ALMASHTIRILMAYDI: Bosh sahifada
    // "Davom ettirish" kartasi bilan ko'rsatiladi (src/ui/home/app.js; egasi qarori 2026-11-23). Eski saqlangan
    // holatlar ham hisobga olinadi (src/ui/flow/model.js::hasSession — P22-1).
    const saved = window.UCFlow.hasSession(appState.get());
    const hash = window.location.hash;
    const session = window.AuthManager && window.AuthManager.getSession ? window.AuthManager.getSession() : null;
    showScreen(startScreen(hash, { saved, seen: hasSeenDash(), loggedIn: isMember(session) }));
    // Sessiya (Firebase Auth) keyinroq aniqlanadi: kirgan foydalanuvchi (admin / xodim) — doim Bosh sahifa.
    // Faqat foydalanuvchi hali tanishtiruv sahifasidan chiqmagan va hash berilmagan bo'lsa almashtiriladi.
    if (window.AuthManager && window.AuthManager.ready) {
      window.AuthManager.ready().then(sess => {
        if (isMember(sess) && !homeScreen.classList.contains('hidden') && startScreen(hash, { loggedIn: true }) === 'dash') showScreen('dash');
      }).catch(() => { /* sessiya aniqlanmadi — tanlangan ekran qoladi */ });
    }
  }

  /* Bosh sahifa ko'rilgani belgisi (shaxsiy ma'lumot emas; faqat shu brauzerda) */
  const SEEN_DASH_KEY = 'uc_seen_dash';
  function hasSeenDash() { try { return localStorage.getItem(SEEN_DASH_KEY) === '1'; } catch (_) { return false; } }
  function markSeenDash() { try { localStorage.setItem(SEEN_DASH_KEY, '1'); } catch (_) { /* xotira o'chirilgan */ } }
  function isMember(session) { return !!session && (session.role === 'admin' || session.role === 'employee'); }

  /* Boshlang'ich ekran (egasi qarori 2026-11-23).
     1) URL hash bor bo'lsa — hash ustun: #home — tanishtiruv (kirish) sahifasi, #app — ish maydoni (saqlangan hisob
        bo'lsa; aks holda Bosh sahifa), #lab — Vizual laboratoriya (qobiq o'zi ochadi — src/ui/shell/app.js).
     2) Kirgan foydalanuvchi (admin / xodim) — doim Bosh sahifa.
     3) Kirmagan va bu brauzerda hech qachon hisob boshlamagan (saqlangan holat ham, uc_seen_dash belgisi ham yo'q) —
        tanishtiruv sahifasi (home).
     4) Qolgan hamma holatda — Bosh sahifa (dash); saqlangan hisob bo'lsa "Davom ettirish" kartasi bilan. */
  function startScreen(hash, o) {
    const s = o || {};
    const h = String(hash || '').replace(/^#/, '');
    if (h === 'home') return 'home';
    if (h === 'lab') return 'app';
    if (h === 'app') return s.saved ? 'app' : 'dash';
    if (s.loggedIn) return 'dash';
    if (!s.saved && !s.seen) return 'home';
    return 'dash';
  }

  // Shablonlar moduli (src/ui/tpl/app.js) uchun
  /* renderSidebar — moslik uchun (sessiya paneli P22-1 da olib tashlandi; chaqiruvchilar: tpl, io, home) */
  window.App = { showScreen, renderSidebar: () => {}, beginSession, newCalculation, startScreen };

  document.addEventListener('DOMContentLoaded', bootstrap);

})();
