/* XSS regressiya testlari: bazadan kelgan qiymatlar HTML sifatida talqin qilinmaydi.
   jsdom (devDependency) — haqiqiy HTML parser bilan tekshiriladi.
   Ref: docs/PLAN.md P02 "XSS regressiya testlari"; RISKS R-S5. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const T = require('../../src/ui/templates.js');
const { createToast } = require('../../src/ui/toast.js');

const PAYLOADS = [
  '<img src=x onerror=alert(1)>',
  '"><svg onload=alert(1)>',
  `'><script>alert(1)</script>`,
  '<a href="javascript:alert(1)">x</a>',
];

function parse(html, wrap = 'div') {
  const body = wrap === 'tbody' ? '<table><tbody id="root"></tbody></table>' : `<${wrap} id="root"></${wrap}>`;
  const dom = new JSDOM(`<!doctype html><body>${body}</body>`);
  const root = dom.window.document.getElementById('root');
  root.innerHTML = html;
  return { root, doc: dom.window.document };
}

function assertInert(root, payload) {
  assert.equal(root.querySelectorAll('img, svg[onload], script, a[href^="javascript"], iframe').length, 0, 'element injected');
  for (const el of root.querySelectorAll('*')) {
    for (const a of el.attributes) {
      assert.ok(!/^on/i.test(a.name), `event handler attribute ${a.name} on <${el.tagName}>`);
    }
  }
  assert.ok(root.textContent.includes(payload), 'payload must be shown as literal text');
}

const org = p => ({ id: 'org1', firstName: p, lastName: p, login: 'a.b', inn: '123456789', phone: p,
                    plan: 'basic', active: false, paymentStatus: 'pending', registeredAt: p, requestedPlan: 'pro' });

for (const p of PAYLOADS) {
  test(`tashkilot nomi (pending-org-info): ${p}`, () => {
    const { root } = parse(T.pendingOrgInfoHTML(org(p)));
    assertInert(root, p);
  });
  test(`hisob-faktura: ${p}`, () => {
    const { root } = parse(T.invoiceHTML(org(p), []));
    assertInert(root, p);
  });
  test(`admin: tashkilot ma'lumoti: ${p}`, () => {
    const { root } = parse(T.orgInfoHTML(org(p)));
    assertInert(root, p);
  });
  test(`admin: xodimlar jadvali (ism, lavozim, telefon): ${p}`, () => {
    const emps = [{ id: `x" data-action="delete`, name: p, role: p, phone: p, login: 'e.x', createdAt: p, active: true }];
    const { root } = parse(T.employeesTableHTML(emps));
    assertInert(root, p);
    // id atributdan "chiqib ketmaydi"
    root.querySelectorAll('button[data-id]').forEach(b => assert.equal(b.dataset.id, `x" data-action="delete`));
  });
  test(`super-admin: tashkilotlar jadvali: ${p}`, () => {
    const { root } = parse(T.superadminRowsHTML([org(p)]), 'tbody');
    assertInert(root, p);
  });
  test(`super-admin: authCleanup jadvali: ${p}`, () => {
    const { root } = parse(T.cleanupRowsHTML([{ id: 'u1', login: p, reason: 'deleted', at: p }]), 'tbody');
    assertInert(root, p);
  });
  test(`showToast: xabar faqat matn: ${p}`, () => {
    const dom = new JSDOM('<!doctype html><body></body>');
    const toast = createToast(dom.window.document, p, 'error', 10);
    assert.equal(toast.querySelector('span').textContent, p);
    assert.equal(toast.querySelectorAll('img, script, a').length, 0);
    assert.equal(toast.querySelectorAll('svg').length, 1); // faqat statik ikonka
    assert.equal(toast.querySelector('svg').getAttribute('onload'), null);
  });
}

test('xodimlar jadvalida parol ustuni va parol qiymati yo\'q', () => {
  const html = T.employeesTableHTML([{ id: 'e1', name: 'A B', login: 'a.b', rawPwd: 'SECRET-123', active: true }]);
  assert.ok(!html.includes('SECRET-123'));
  assert.ok(!/Parol<\/th>/.test(html));
});

test('shablonlarda inline on*= hodisa atributlari yo\'q', () => {
  const all = [T.pendingOrgInfoHTML(org('x')), T.invoiceHTML(org('x'), []), T.orgInfoHTML(org('x')),
    T.employeesTableHTML([{ id: 'e', name: 'n', login: 'l', active: true }]),
    T.superadminRowsHTML([org('x')]), T.cleanupRowsHTML([{ id: 'u', login: 'l', reason: 'deleted', at: 'd' }])].join('');
  assert.ok(!/\son[a-z]+\s*=/i.test(all));
});
