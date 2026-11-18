/* ═══════════════════════════════════════════════════════════════
   ADMIN-PAGE.JS — admin.html kontrolleri (P02: inline skriptdan ko'chirildi)
   CSP `script-src 'self'` — inline skript va onclick yo'q.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const T = window.UiTemplates;
  const PLANS = AuthManager.PLANS;
  const t = (key, vars) => (vars ? i18n.tf(key, vars) : i18n.t(key));
  const priceK = plan => (plan.priceMonthly / 1000).toFixed(0);

  /* ─── MAVZU ─────────────────────────────────────────── */
  try {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('uc_theme') || 'dark');
  } catch { /* storage yo'q */ }
  $('btn-theme').addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('uc_theme', next); } catch { /* */ }
  });

  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 1500);
    }).catch(() => {});
  }

  let session = null;
  let _lastOrg = null;
  let _lastEmps = [];

  /* ─── AUTH TEKSHIRUVI (Firebase Auth token'i asosida) ─ */
  AuthManager.ready().then(s => {
    if (!s || s.role !== 'admin') { location.href = 'index.html'; return; }
    session = s;
    $('topbar-name').textContent = s.name || s.login;
    render();
  });
  AuthManager.onChange(s => {
    if (!s || s.role !== 'admin') location.href = 'index.html';
  });

  $('btn-logout').addEventListener('click', async () => {
    await AuthManager.logout();
    location.href = 'index.html';
  });

  /* ─── ASOSIY RENDER ──────────────────────────────────── */
  async function render() {
    let org, emps;
    try {
      org  = await DB.get('organizations', session.orgId);
      if (!org) { location.href = 'index.html'; return; }
      emps = await AuthManager.getOrgEmployees(session.orgId);
    } catch (e) {
      showToast(t('adm_load_fail', { msg: e.code || e.message }), 'error');
      return;
    }
    _lastOrg  = org;
    _lastEmps = emps;
    renderStats(org, emps);
    renderOrgInfo(org);
    renderSubscription(org);
    renderEmployees(org, emps);
  }

  // Til almashganda: keshdagi ma'lumotdan qayta chizish (bazaga qayta so'rov yo'q)
  document.addEventListener('langchange', () => {
    if (!session || !_lastOrg) return;
    renderStats(_lastOrg, _lastEmps);
    renderOrgInfo(_lastOrg);
    renderSubscription(_lastOrg);
    renderEmployees(_lastOrg, _lastEmps);
    if ($('invoice-modal').style.display !== 'none') $('invoice-content').innerHTML = T.invoiceHTML(_lastOrg, _lastEmps || [], PLANS);
  });

  function statCard(value, label) {
    const d = document.createElement('div');
    d.className = 'admin-stat';
    const v = document.createElement('span'); v.className = 'admin-stat-value'; v.textContent = value;
    const l = document.createElement('span'); l.className = 'admin-stat-label'; l.textContent = label;
    d.append(v, l);
    return d;
  }

  function renderStats(org, emps) {
    const active = emps.filter(e => e.active).length;
    const plan   = PLANS[org.plan] || PLANS.basic;
    const row = $('stats-row');
    row.replaceChildren(
      statCard(String(active), t('adm_stat_active')),
      statCard(plan.maxUsers === -1 ? '∞' : String(plan.maxUsers), t('adm_stat_limit')),
      statCard(t('c_price_k', { n: priceK(plan) }), t('adm_stat_monthly')),
      statCard(String(org.registeredAt || '—'), t('adm_stat_regdate')),
    );
  }

  function renderOrgInfo(org) {
    $('org-inn-badge').textContent = t('adm_inn_badge', { inn: org.inn || '' });
    $('org-info-grid').innerHTML = T.orgInfoHTML(org);
  }

  function renderSubscription(org) {
    const plan = PLANS[org.plan] || PLANS.basic;
    $('current-plan-badge').textContent = plan.name;

    const expiryEl = $('plan-expiry-text');
    if (org.planExpiry) {
      const daysLeft = Math.ceil((new Date(org.planExpiry) - Date.now()) / 86400000);
      expiryEl.textContent = t('adm_expiry', { date: org.planExpiry, left: daysLeft > 0 ? t('adm_days_left', { n: daysLeft }) : t('adm_expired') });
      expiryEl.className   = 'plan-expiry' + (daysLeft <= 0 ? ' expired' : daysLeft <= 7 ? ' soon' : '');
    } else {
      expiryEl.textContent = t('adm_expiry_none');
      expiryEl.className   = 'plan-expiry';
    }

    // Tarif tanlash — endi so'rov: tarifni super-admin qo'llaydi (firestore.rules)
    const grid = $('plan-upgrade-grid');
    grid.replaceChildren(...Object.entries(PLANS).map(([key, p]) => {
      const card = document.createElement('div');
      card.className = 'plan-upgrade-card' + (org.plan === key ? ' current' : '');
      card.dataset.plan = key;
      const n = document.createElement('div'); n.className = 'plan-name'; n.textContent = p.name;
      const pr = document.createElement('div'); pr.className = 'plan-price'; pr.textContent = t('c_price_month', { n: priceK(p) });
      const lim = document.createElement('div'); lim.className = 'plan-limit'; lim.textContent = p.maxUsers === -1 ? t('adm_unlimited_emp') : t('adm_up_to_emp', { n: p.maxUsers });
      card.append(n, pr, lim);
      if (org.plan === key || org.requestedPlan === key) {
        const tag = document.createElement('div');
        tag.style.cssText = 'font-size:.7rem;color:var(--accent);margin-top:.3rem';
        tag.textContent = org.plan === key ? t('adm_plan_current') : t('adm_plan_requested');
        card.appendChild(tag);
      }
      return card;
    }));
  }

  $('plan-upgrade-grid').addEventListener('click', async ev => {
    const card = ev.target.closest('.plan-upgrade-card');
    if (!card || card.classList.contains('current') || !_lastOrg) return;
    const planKey = card.dataset.plan;
    if (!PLANS[planKey]) return;
    if (!confirm(t('adm_plan_confirm', { plan: PLANS[planKey].name }))) return;
    try {
      await AuthManager.requestPlan(session.orgId, planKey);
      showToast(t('adm_request_sent'), 'success');
      render();
    } catch (e) {
      showToast(t('c_error', { msg: e.message }), 'error');
    }
  });

  /* ─── TO'LOV ─────────────────────────────────────────── */
  function currentPrice() {
    return (PLANS[_lastOrg && _lastOrg.plan] || PLANS.basic).priceMonthly;
  }
  $('btn-pay-click').addEventListener('click', () => {
    if (!_lastOrg) return;
    window.open(AuthManager.getClickUrl(currentPrice(), 'ORG_' + _lastOrg.id + '_' + Date.now()), '_blank', 'noopener');
  });
  $('btn-pay-payme').addEventListener('click', () => {
    if (!_lastOrg) return;
    window.open(AuthManager.getPaymeUrl(currentPrice(), 'ORG_' + _lastOrg.id + '_' + Date.now()), '_blank', 'noopener');
  });
  $('btn-pay-bank').addEventListener('click', () => {
    if (!_lastOrg) return;
    $('invoice-content').innerHTML = T.invoiceHTML(_lastOrg, _lastEmps || [], PLANS);
    $('invoice-modal').style.display = 'flex';
  });

  /* ─── INVOICE MODAL ──────────────────────────────────── */
  function closeInvoice() { $('invoice-modal').style.display = 'none'; }
  $('invoice-modal').addEventListener('click', e => { if (e.target === $('invoice-modal')) closeInvoice(); });
  $('btn-invoice-print').addEventListener('click', () => window.print());
  $('btn-invoice-close').addEventListener('click', closeInvoice);

  /* ─── BIR MARTALIK LOGIN/PAROL OYNASI ─────────────────── */
  // Parol faqat shu yerda, bir marta ko'rsatiladi va hech qayerga yozilmaydi.
  function showCredentials(title, login, password, note) {
    $('cred-title').textContent = title;
    $('cred-login').textContent = login;
    $('cred-password').textContent = password;
    $('cred-note').textContent = note || '';
    $('cred-modal').style.display = 'flex';
  }
  function closeCredentials() {
    $('cred-password').textContent = '';
    $('cred-login').textContent = '';
    $('cred-modal').style.display = 'none';
  }
  $('btn-cred-close').addEventListener('click', closeCredentials);
  $('cred-modal').addEventListener('click', e => {
    const btn = e.target.closest('[data-copy-from]');
    if (btn) copyText($(btn.dataset.copyFrom).textContent, btn);
  });

  /* ─── XODIMLAR ───────────────────────────────────────── */
  function renderEmployees(org, emps) {
    const plan     = PLANS[org.plan] || PLANS.basic;
    const active   = emps.filter(e => e.active).length;
    const maxLabel = plan.maxUsers === -1 ? '∞' : plan.maxUsers;
    $('emp-count-label').textContent = t('adm_emp_count', { active, max: maxLabel });
    $('emp-table-wrap').innerHTML = T.employeesTableHTML(emps);
  }

  // Delegatsiya: inline onclick o'rniga
  $('emp-table-wrap').addEventListener('click', async ev => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'copy') {
      copyText(btn.dataset.value || '', btn);
    } else if (btn.dataset.action === 'delete') {
      if (!confirm(t('adm_del_confirm'))) return;
      try {
        await AuthManager.deleteEmployee(session.orgId, id);
        render();
      } catch (e) {
        showToast(t('c_error', { msg: e.message }), 'error');
      }
    } else if (btn.dataset.action === 'reset-password') {
      if (!confirm(t('adm_reset_confirm'))) return;
      btn.disabled = true;
      try {
        const r = await AuthManager.resetEmployeePassword(session.orgId, id);
        showCredentials(t('adm_new_cred_title'), r.login, r.password,
          t('adm_new_cred_note', { login: r.previousLogin }));
        render();
      } catch (e) {
        showToast(t('c_error', { msg: e.message }), 'error');
      } finally {
        btn.disabled = false;
      }
    }
  });

  /* ─── TELEFON VALIDATSIYA ─────────────────────────────── */
  function validatePhone(raw) {
    const digits = raw.replace(/[\s\-()]/g, '');
    if (/^\+998\d{9}$/.test(digits)) return digits;
    if (/^998\d{9}$/.test(digits))   return '+' + digits;
    if (/^0\d{9}$/.test(digits))     return '+998' + digits.slice(1);
    return null;
  }

  /* ─── XODIM QO'SHISH ─────────────────────────────────── */
  $('btn-add-emp').addEventListener('click', async () => {
    const name  = $('inp-emp-name').value.trim();
    const phone = $('inp-emp-phone').value.trim();
    const role  = $('inp-emp-role').value.trim();
    const errEl = $('emp-add-error');
    const fail = msg => { errEl.textContent = '❌ ' + msg; errEl.style.display = 'block'; };
    errEl.style.display = 'none';

    if (!name) return fail(t('adm_err_name'));
    if (name.split(/\s+/).length < 2) return fail(t('adm_err_fullname'));
    if (!phone) return fail(t('adm_err_phone'));
    const normalizedPhone = validatePhone(phone);
    if (!normalizedPhone) return fail(t('adm_err_phone_fmt'));
    if (!role) return fail(t('adm_err_role'));

    const btn = $('btn-add-emp');
    const orig = [...btn.childNodes];
    btn.disabled = true;
    btn.textContent = t('adm_adding');
    try {
      const emp = await AuthManager.addEmployee(session.orgId, { name, phone: normalizedPhone, role });
      $('inp-emp-name').value  = '';
      $('inp-emp-phone').value = '';
      $('inp-emp-role').value  = '';
      showCredentials(t('adm_emp_added'), emp.login, emp.password, t('adm_emp_added_note'));
      render();
    } catch (e) {
      fail(e.message);
    } finally {
      btn.disabled = false;
      btn.replaceChildren(...orig);
    }
  });

})();
