/* XSS regressiya testi brauzerda (Playwright, emulatorsiz — oddiy `npm test`).
   B tur komponent nomi = <img src=x onerror=…> → DOM'ga element bo'lib tushmaydi,
   skript ishlamaydi, hisobot/natijada matn sifatida qoladi. Uchala sahifada CSP
   buzilishi yo'q. Playwright yo'q muhitda — skip. */
'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

let chromium = null;
try { ({ chromium } = require('playwright')); } catch (_) {}
const XSS = '<img src=x onerror="window.__xss=1">';

describe('XSS (brauzer)', { skip: chromium ? false : 'playwright o\'rnatilmagan' }, () => {
  let srv, browser, page;
  const csp = [];

  before(async () => {
    srv = await require('../helpers/static-server').start();
    browser = await chromium.launch();
    const ctx = await browser.newContext();
    // Tashqi tarmoq yo'q: Firebase/Fonts so'rovlari bekor qilinadi (offline rejim)
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await ctx.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', e => console.log('CSPV ' + e.violatedDirective + ' ' + e.blockedURI));
    });
    page = await ctx.newPage();
    page.on('console', m => { if (/CSPV|Content Security Policy/.test(m.text())) csp.push(m.text()); });
    page.on('dialog', d => d.dismiss());
  });
  after(async () => { if (browser) await browser.close(); if (srv) srv.server.close(); });

  test('B tur komponent nomi <img src=x onerror=…> matn bo\'lib qoladi', async () => {
    await page.goto(srv.url + '/index.html');
    await page.click('#btn-home-start');
    await page.selectOption('#inp-preset', 'density');
    await page.click('#btn-start');
    await page.click('.tab-btn[data-tab="typeb"]');
    await page.click('#btn-add-typeb');
    const inp = page.locator('.typeb-card input[data-field="name"]').last();
    await inp.fill(XSS);
    await inp.dispatchEvent('change');               // state → qayta render
    await page.evaluate(() => document.getElementById('btn-calc-combined').click());
    await page.click('.tab-btn[data-tab="results"]');
    await page.waitForTimeout(200);

    assert.equal(await page.$$eval('img[src="x"]', n => n.length), 0, 'img elementi yaratilmadi');
    assert.equal(await page.evaluate(() => window.__xss), undefined, 'onerror ishlamadi');
    assert.equal(await page.inputValue('.typeb-card input[data-field="name"] >> nth=-1'), XSS);
    const stateName = await page.evaluate(() => appState.get().typeB.slice(-1)[0].name);
    assert.equal(stateName, XSS);
    const html = await page.evaluate(() => document.body.innerHTML);
    assert.ok(!html.includes(XSS), 'xom HTML sifatida joylanmagan');
  });

  test('showToast va hisobot: matn sifatida', async () => {
    await page.evaluate(x => window.showToast(x, 'error', 200), XSS);
    assert.equal(await page.$$eval('#toast-container img', n => n.length), 0);
    assert.ok((await page.textContent('#toast-container')).includes('<img src=x'));
  });

  test('sahifalarda CSP buzilishi yo\'q (index, admin, superadmin)', async () => {
    for (const p of ['/index.html', '/superadmin.html', '/admin.html']) {
      await page.goto(srv.url + p);
      await page.waitForTimeout(300);
    }
    assert.deepEqual(csp, []);
  });
});
