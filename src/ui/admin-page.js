/* ═══════════════════════════════════════════════════════════════
   ADMIN-PAGE.JS — admin.html kontrolleri (P02: inline skriptdan ko'chirildi)
   CSP `script-src 'self'` — inline skript va onclick yo'q.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const T = window.UiTemplates;
  const PLANS = AuthManager.PLANS;

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
      showToast('Ma\'lumotni yuklab bo\'lmadi: ' + (e.code || e.message), 'error');
      return;
    }
    _lastOrg  = org;
    _lastEmps = emps;
    renderStats(org, emps);
    renderOrgInfo(org);
    renderSubscription(org);
    renderEmployees(org, emps);
  }

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
      statCard(String(active), 'Faol xodimlar'),
      statCard(plan.maxUsers === -1 ? '∞' : String(plan.maxUsers), 'Tarif limiti'),
      statCard((plan.priceMonthly / 1000).toFixed(0) + 'K UZS', 'Oylik to\'lov'),
      statCard(String(org.registeredAt || '—'), 'Ro\'yxat sanasi'),
    );
  }

  function renderOrgInfo(org) {
    $('org-inn-badge').textContent = 'INN: ' + (org.inn || '');
    $('org-info-grid').innerHTML = T.orgInfoHTML(org);
  }

  function renderSubscription(org) {
    const plan = PLANS[org.plan] || PLANS.basic;
    $('current-plan-badge').textContent = plan.name;

    const expiryEl = $('plan-expiry-text');
    if (org.planExpiry) {
      const daysLeft = Math.ceil((new Date(org.planExpiry) - Date.now()) / 86400000);
      expiryEl.textContent = `Obuna tugash sanasi: ${org.planExpiry} · ${daysLeft > 0 ? daysLeft + ' kun qoldi' : 'MUDDATI O\'TDI'}`;
      expiryEl.className   = 'plan-expiry' + (daysLeft <= 0 ? ' expired' : daysLeft <= 7 ? ' soon' : '');
    } else {
      expiryEl.textContent = 'Obuna muddati super-admin tomonidan belgilanadi';
      expiryEl.className   = 'plan-expiry';
    }

    // Tarif tanlash — endi so'rov: tarifni super-admin qo'llaydi (firestore.rules)
    const grid = $('plan-upgrade-grid');
    grid.replaceChildren(...Object.entries(PLANS).map(([key, p]) => {
      const card = document.createElement('div');
      card.className = 'plan-upgrade-card' + (org.plan === key ? ' current' : '');
      card.dataset.plan = key;
      const n = document.createElement('div'); n.className = 'plan-name'; n.textContent = p.name;
      const pr = document.createElement('div'); pr.className = 'plan-price'; pr.textContent = (p.priceMonthly / 1000).toFixed(0) + 'K UZS/oy';
      const lim = document.createElement('div'); lim.className = 'plan-limit'; lim.textContent = p.maxUsers === -1 ? 'Cheksiz xodim' : p.maxUsers + ' xodimgacha';
      card.append(n, pr, lim);
      if (org.plan === key || org.requestedPlan === key) {
        const tag = document.createElement('div');
        tag.style.cssText = 'font-size:.7rem;color:var(--accent);margin-top:.3rem';
        tag.textContent = org.plan === key ? '✓ Joriy tarif' : '⏳ So\'rov yuborilgan';
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
    if (!confirm(`"${PLANS[planKey].name}" tarifiga o'tish so'rovini yuborasizmi? Tarifni to'lovdan keyin super-admin qo'llaydi.`)) return;
    try {
      await AuthManager.requestPlan(session.orgId, planKey);
      showToast('So\'rov yuborildi', 'success');
      render();
    } catch (e) {
      showToast('Xato: ' + e.message, 'error');
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
    $('emp-count-label').textContent = `${active} / ${maxLabel} xodim`;
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
      if (!confirm('Ushbu xodimni bazadan butunlay o\'chirishni tasdiqlaysizmi?\nBu amalni qaytarib bo\'lmaydi.')) return;
      try {
        await AuthManager.deleteEmployee(session.orgId, id);
        render();
      } catch (e) {
        showToast('Xato: ' + e.message, 'error');
      }
    } else if (btn.dataset.action === 'reset-password') {
      if (!confirm('Xodimga YANGI login va parol yaratilsinmi?\nEski login ishlamay qoladi.')) return;
      btn.disabled = true;
      try {
        const r = await AuthManager.resetEmployeePassword(session.orgId, id);
        showCredentials('Yangi kirish ma\'lumotlari', r.login, r.password,
          `Eski login (${r.previousLogin}) endi ishlamaydi. Parol faqat hozir ko'rsatiladi — xodimga xavfsiz yo'l bilan bering.`);
        render();
      } catch (e) {
        showToast('Xato: ' + e.message, 'error');
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

    if (!name) return fail('Ism familyani kiriting');
    if (name.split(/\s+/).length < 2) return fail('Ism va familyani to\'liq kiriting (masalan: Ahmad Karimov)');
    if (!phone) return fail('Telefon raqamini kiriting');
    const normalizedPhone = validatePhone(phone);
    if (!normalizedPhone) return fail('Telefon formati noto\'g\'ri. Masalan: +998901234567 yoki 0901234567');
    if (!role) return fail('Lavozimni kiriting');

    const btn = $('btn-add-emp');
    const orig = [...btn.childNodes];
    btn.disabled = true;
    btn.textContent = 'Qo\'shilmoqda…';
    try {
      const emp = await AuthManager.addEmployee(session.orgId, { name, phone: normalizedPhone, role });
      $('inp-emp-name').value  = '';
      $('inp-emp-phone').value = '';
      $('inp-emp-role').value  = '';
      showCredentials('Xodim qo\'shildi', emp.login, emp.password,
        'Parol faqat hozir ko\'rsatiladi va hech qayerda saqlanmaydi — xodimga xavfsiz yo\'l bilan bering. Unutilsa, "Parolni tiklash" tugmasidan foydalaning.');
      render();
    } catch (e) {
      fail(e.message);
    } finally {
      btn.disabled = false;
      btn.replaceChildren(...orig);
    }
  });

})();
