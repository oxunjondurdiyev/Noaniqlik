/* P13: scripts/build-site.js — versiyalangan deploy (egasi qarori A, docs/RISKS.md R-22 (b)).
   Namunaviy fayllar bilan: barcha havola turlari, izoh / satr ichidagi o'xshashliklar, tashqi URL, takroriy build
   (idempotent), build.json sxemasi, oq ro'yxat, ishonchsiz holatda to'xtash; so'ng HAQIQIY repo yig'iladi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const B = require('../../scripts/build-site.js');
const { cleanBuildInfo, versionOf } = require('../../src/io/build.js');

const ROOT = path.join(__dirname, '..', '..');
const COMMIT = '0123456789abcdef0123456789abcdef01234567', SHA = COMMIT.slice(0, 12);
const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), `uc-${name}-`));

test('versioned(): ?v= qo\'shiladi, mavjud parametr va #langar saqlanadi, takror qo\'shilmaydi', () => {
  assert.equal(B.versioned('./a.js', SHA), `./a.js?v=${SHA}`);
  assert.equal(B.versioned('./a.js?x=1#top', SHA), `./a.js?x=1&v=${SHA}#top`);
  assert.equal(B.versioned(B.versioned('../b/c.js', SHA), SHA), `../b/c.js?v=${SHA}`);
  assert.equal(B.versioned('./a.js?v=aaaaaaaaaaaa', SHA), `./a.js?v=${SHA}`, 'eski versiya almashtiriladi');
});

const JS = `/* import x from './comment.js'; import('./comment2.js') */
// export * from './line-comment.js';
import def, { a as b } from './dep.js';
import * as ns from "../lib/ns.js";
import './side-effect.js';
export { q } from './re-export.js';
export * from './star.js';
export * as all from './star-as.js';
const text = "import z from './string.js'";
const tpl = \`import('./template.js') \${1 + 1} from './tpl2.js'\`;
const re = /import\\('\\.\\/regex\\.js'\\)/;
const lazy = () => import('./lazy.js');
const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
const ext = () => import('https://cdn.example/x.js');
const u = new URL('https://example.org/a.js');
const other = new URL('./not-a-module.js', location.href);
export const q2 = text + tpl + re + ns + def + b + w + ext + u + other + lazy;
`;

test('rewriteJs: statik import / export … from, dinamik import(), new URL(…, import.meta.url) — izoh, satr, shablon, regex tegilmaydi', () => {
  const out = B.rewriteJs(JS, SHA, 'sample.js');
  const v = `?v=${SHA}`;
  for (const s of [`from './dep.js${v}'`, `from "../lib/ns.js${v}"`, `import './side-effect.js${v}'`, `from './re-export.js${v}'`, `from './star.js${v}'`,
    `from './star-as.js${v}'`, `import('./lazy.js${v}')`, `new URL('./worker.js${v}', import.meta.url)`]) assert.ok(out.includes(s), s);
  // tegilmasligi kerak bo'lganlar AYNAN saqlangan
  for (const s of [`import x from './comment.js'; import('./comment2.js')`, `// export * from './line-comment.js';`, `"import z from './string.js'"`,
    "`import('./template.js') ${1 + 1} from './tpl2.js'`", `/import\\('\\.\\/regex\\.js'\\)/`, `import('https://cdn.example/x.js')`, `new URL('https://example.org/a.js')`,
    `new URL('./not-a-module.js', location.href)`]) assert.ok(out.includes(s), s);
  assert.equal(out.split(v).length - 1, 8, 'aynan 8 ta havola versiyalangan');
  assert.equal(B.rewriteJs(out, SHA, 'sample.js'), out, 'takroriy build — o\'zgarish yo\'q');
  assert.equal(out.replaceAll(v, ''), JS, 'havolalardan boshqa hech narsa o\'zgarmagan');
  // klassik skript (modul emas) — tahlil qilinadi, havola yo'q
  assert.equal(B.rewriteJs('(function () { var x = 1; with (Math) { x = max(x, 2); } })();', SHA, 'classic.js').includes('?v='), false);
});

test('rewriteJs: ishonchsiz holatda build to\'xtaydi', () => {
  assert.throws(() => B.rewriteJs('const f = n => import(n);', SHA, 'x.js'), /dinamik import\(\)/);
  assert.throws(() => B.rewriteJs("const f = n => import('./a/' + n + '.js');", SHA, 'x.js'), /dinamik import\(\)/);
  assert.throws(() => B.rewriteJs("new URL(name, import.meta.url);", SHA, 'x.js'), /new URL/);
  assert.throws(() => B.rewriteJs("new Worker('src/ui/mc/worker.js', { type: 'module' });", SHA, 'x.js'), /new Worker/);
  assert.throws(() => B.rewriteJs("importScripts('./a.js');", SHA, 'x.js'), /importScripts/);
  assert.throws(() => B.rewriteJs("import x from 'lodash';", SHA, 'x.js'), /yalang'och modul nomi/);
  assert.throws(() => B.rewriteJs("import x from ;", SHA, 'x.js'), /JS tahlil qilinmadi/);
});

const HTML = `<!DOCTYPE html>
<html><head>
  <!-- <script src="commented.js"></script> -->
  <link rel="stylesheet" href="src/css/a.css" />
  <link rel="modulepreload" href="src/m.js">
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />
</head><body>
  <a href="admin.html">admin</a> <a href="#top">top</a>
  <p>matn: &lt;script src="text.js"&gt;</p>
  <img src="data:image/png;base64,AAAA" alt=""> <img src='img/logo.png' alt="">
  <script nomodule src="src/legacy.js"></script>
  <script src="src/classic.js"></script>
  <script type="module" src="src/m.js"></script>
</body></html>
`;

test('rewriteHtml: <script src>, <link rel=stylesheet|modulepreload>, <img src> — tashqi URL, data:, <a href>, izoh va matn tegilmaydi', () => {
  const out = B.rewriteHtml(HTML, SHA, 'page.html');
  const v = `?v=${SHA}`;
  for (const s of [`href="src/css/a.css${v}"`, `<link rel="modulepreload" href="src/m.js${v}">`, `src='img/logo.png${v}'`, `<script nomodule src="src/legacy.js${v}">`,
    `<script src="src/classic.js${v}">`, `<script type="module" src="src/m.js${v}">`]) assert.ok(out.includes(s), s);
  assert.equal(out.split(v).length - 1, 6);
  assert.equal(out.replaceAll(v, ''), HTML);
  assert.equal(B.rewriteHtml(out, SHA, 'page.html'), out, 'idempotent');
  assert.throws(() => B.rewriteHtml('<body><script>alert(1)</script></body>', SHA, 'x.html'), /inline <script>/);
});

function sampleTree() {
  const root = tmp('src');
  const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), s); };
  w('index.html', '<!DOCTYPE html><html><head><link rel="stylesheet" href="src/a.css"></head><body><script type="module" src="src/app.js"></script></body></html>\n');
  w('.nojekyll', '');
  w('src/app.js', "import { x } from './lib/x.js';\nconst lazy = () => import('../vendor/lib/1.0.0/lib.js');\nexport const y = x + lazy;\n");
  w('src/lib/x.js', "export const x = 1; // import './missing.js'\n");
  w('src/a.css', 'body { color: red; }\n');
  w('vendor/lib/1.0.0/lib.js', "export default 'vendor: import(\"./never.js\")';\n");
  w('tests/secret.test.js', 'x');
  w('docs/references/paid.pdf', 'x');
  w('src/engine/version.js', "exports.ENGINE_VERSION = '9.9.9';\n");
  return { root, w };
}
const WL = { files: ['index.html', '.nojekyll'], dirs: ['src', 'vendor'] };

test('buildSite: oq ro\'yxat, build.json sxemasi, vendor bayt darajasida, tekshiruv; takroriy build bir xil', () => {
  const { root } = sampleTree();
  const out = tmp('out');
  const opts = { root, out, commit: COMMIT, builtAt: '2026-11-19T12:00:00.000Z', validation: null, whitelist: WL, engineHash: 'a'.repeat(64) };
  const r = B.buildSite(opts);
  const read = f => fs.readFileSync(path.join(out, f), 'utf8');
  assert.equal(read('src/app.js'), `import { x } from './lib/x.js?v=${SHA}';\nconst lazy = () => import('../vendor/lib/1.0.0/lib.js?v=${SHA}');\nexport const y = x + lazy;\n`);
  assert.equal(read('src/lib/x.js'), "export const x = 1; // import './missing.js'\n", 'izohdagi o\'xshashlik tegilmagan');
  assert.equal(read('vendor/lib/1.0.0/lib.js'), "export default 'vendor: import(\"./never.js\")';\n", 'vendor fayli o\'zgarmagan');
  assert.match(read('index.html'), new RegExp(`href="src/a\\.css\\?v=${SHA}"[\\s\\S]*src="src/app\\.js\\?v=${SHA}"`));
  assert.ok(!fs.existsSync(path.join(out, 'tests')) && !fs.existsSync(path.join(out, 'docs')), 'oq ro\'yxatdan tashqari papkalar chiqmagan');
  const build = JSON.parse(read('build.json'));
  assert.deepEqual(Object.keys(build), ['format', 'commit', 'shortSha', 'engineVersion', 'engineHash', 'builtAt', 'node', 'versions']);
  assert.deepEqual({ ...build, node: '' }, { format: 'uc-build/1', commit: COMMIT, shortSha: SHA, engineVersion: '9.9.9', engineHash: 'a'.repeat(64), builtAt: '2026-11-19T12:00:00.000Z', node: '', versions: [] });
  assert.ok(cleanBuildInfo(build), 'brauzerdagi tekshiruv (src/io/build.js) build.json ni qabul qiladi');
  assert.equal(versionOf(`https://x.test/src/app.js?v=${build.shortSha}`), SHA);
  assert.equal(r.build.shortSha, SHA);
  // takroriy build — bayt darajasida bir xil (deterministik)
  const snap = () => Object.fromEntries(fs.readdirSync(out, { recursive: true }).filter(f => fs.statSync(path.join(out, f)).isFile()).sort().map(f => [f, read(f)]));
  const first = snap();
  B.buildSite(opts);
  assert.deepEqual(snap(), first);
  // yig'ilgan saytning o'zi ustidan qayta yig'ish — ?v= ikki marta qo'shilmaydi
  const out2 = tmp('out2');
  B.buildSite({ ...opts, root: out, out: out2, whitelist: WL });
  assert.equal(fs.readFileSync(path.join(out2, 'src/app.js'), 'utf8'), read('src/app.js'));
  // manba daraxti o'zgarmagan
  assert.equal(fs.readFileSync(path.join(root, 'src/app.js'), 'utf8').includes('?v='), false);
});

test('buildSite / verifySite: uzilgan havola, taqiqlangan fayl, versiyasiz havola — build to\'xtaydi', () => {
  const a = sampleTree();
  a.w('src/app.js', "import { x } from './lib/missing.js';\n");
  assert.throws(() => B.buildSite({ root: a.root, out: tmp('o'), commit: COMMIT, validation: null, whitelist: WL, engineHash: 'a'.repeat(64) }), /missing\.js.*yo'q/s);
  const b = sampleTree();
  b.w('src/app.js', "import x from '../tests/secret.test.js';\n");
  assert.throws(() => B.buildSite({ root: b.root, out: tmp('o'), commit: COMMIT, validation: null, whitelist: WL, engineHash: 'a'.repeat(64) }), /oq ro'yxatga kirmagan/);
  const c = sampleTree();
  assert.throws(() => B.buildSite({ root: c.root, out: tmp('o'), commit: COMMIT, validation: null, whitelist: { files: ['index.html', '.nojekyll'], dirs: ['src', 'vendor', 'docs'] }, engineHash: 'a'.repeat(64) }), /taqiqlangan fayl: docs\/references\/paid\.pdf/);
  assert.throws(() => B.buildSite({ root: c.root, out: tmp('o'), commit: 'abc', validation: null, whitelist: WL }), /commit SHA/);
  assert.throws(() => B.buildSite({ root: c.root, out: c.root, commit: COMMIT, validation: null, whitelist: WL }), /chiqish papkasi/);
  assert.throws(() => B.buildSite({ root: c.root, out: tmp('o'), commit: COMMIT, validation: tmp('empty'), whitelist: WL, engineHash: 'a'.repeat(64) }), /validatsiya hisoboti topilmadi/);
  // yig'ilgandan keyin buzilgan sayt
  const out = tmp('o');
  B.buildSite({ root: c.root, out, commit: COMMIT, validation: null, whitelist: WL, engineHash: 'a'.repeat(64) });
  assert.doesNotThrow(() => B.verifySite(out, SHA, { vendorSource: c.root }));
  fs.writeFileSync(path.join(out, 'src/lib/x.js'), "import './y.js';\nexport const x = 1;\n");
  fs.writeFileSync(path.join(out, 'src/lib/y.js'), '');
  assert.throws(() => B.verifySite(out, SHA, {}), /versiyasiz havola "\.\/y\.js"/);
  fs.writeFileSync(path.join(out, 'src/lib/x.js'), 'export const x = 1;\n');
  fs.writeFileSync(path.join(out, 'vendor/lib/1.0.0/lib.js'), 'export default 2;\n');
  assert.throws(() => B.verifySite(out, SHA, { vendorSource: c.root }), /vendor fayli/);
  fs.rmSync(path.join(out, '.nojekyll'));
  assert.throws(() => B.verifySite(out, SHA, {}), /\.nojekyll yo'q/);
});

test('parseChangelog: versiya, sana, sarlavha', () => {
  const v = B.parseChangelog('# CHANGELOG\n\n## [2.9.0] — P07b: oshkor bo\'lmagan model (JCGM 102:2011) (2026-11-19)\n\nmatn\n\n## [2.8.1] — Westgard\n\n### Ichki\n');
  assert.deepEqual(v, [{ version: '2.9.0', date: '2026-11-19', title: 'P07b: oshkor bo\'lmagan model (JCGM 102:2011)' }, { version: '2.8.1', date: '', title: 'Westgard' }]);
  const real = B.parseChangelog(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'));
  assert.ok(real.length >= 10 && real.every(x => /^\d+\.\d+\.\d+$/.test(x.version)));
  assert.equal(real[0].version, require('../../src/engine/version.js').ENGINE_VERSION, 'CHANGELOG ning birinchi yozuvi — joriy ENGINE_VERSION');
});

test('HAQIQIY repo: sayt yig\'iladi — versiyasiz mahalliy havola yo\'q, taqiqlangan fayl yo\'q, dvigatel xeshi mos, manba o\'zgarmagan', () => {
  const out = tmp('site');
  const before = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'src/js/calc.js'), 'utf8');
  const r = B.buildSite({ out, commit: COMMIT, builtAt: '2026-11-19T12:00:00.000Z', validation: null });
  const all = fs.readdirSync(out, { recursive: true }).map(f => String(f).split(path.sep).join('/'));
  assert.ok(r.refs > 300, `versiyalangan havolalar: ${r.refs}`);
  for (const f of all) assert.ok(!B.FORBIDDEN.some(re => re.test(f)), f);
  // devDependency lar va test / hujjat manbalari saytga chiqmagan
  for (const bad of ['node_modules', 'tests', 'docs', 'scripts', 'package.json', '.github']) assert.ok(!fs.existsSync(path.join(out, bad)), bad);
  for (const must of ['index.html', 'admin.html', 'superadmin.html', 'validation.html', '.nojekyll', 'build.json', 'LICENSE', 'src/engine/index.js', 'src/ui/mc/worker.js',
    'vendor/sheetjs/0.20.3/xlsx.js', 'vendor/sheetjs/0.20.3/LICENSE', 'schemas/methodology.schema.json', 'templates/builtin/index.json',
    'manual/uz.html', 'manual/ru.html', 'manual/en.html', 'validation/docs/KNOWN_LIMITATIONS.html', 'validation/docs/REQUIREMENTS.html', 'validation/docs/RTM.html']) assert.ok(fs.existsSync(path.join(out, must)), must);
  const build = JSON.parse(fs.readFileSync(path.join(out, 'build.json'), 'utf8'));
  assert.equal(build.engineHash, require('../security/engine.sha256.json').sha256);
  assert.equal(build.engineVersion, require('../../src/engine/version.js').ENGINE_VERSION);
  assert.ok(cleanBuildInfo(build));
  // muhim havolalar
  const v = `?v=${SHA}`;
  assert.ok(fs.readFileSync(path.join(out, 'src/ui/mc/runner.js'), 'utf8').includes(`new URL('./worker.js${v}', import.meta.url)`));
  assert.ok(fs.readFileSync(path.join(out, 'src/ui/mc/worker.js'), 'utf8').includes(`'../../engine/index.js${v}'`));
  assert.ok(fs.readFileSync(path.join(out, 'src/io/vendor.js'), 'utf8').includes(`import('../../vendor/sheetjs/0.20.3/xlsx.js${v}')`));
  assert.ok(fs.readFileSync(path.join(out, 'index.html'), 'utf8').includes(`<script type="module" src="src/js/calc.js${v}"></script>`));
  // skriptsiz sahifalar
  for (const f of all.filter(x => /^(manual|validation)\/.*\.html$/.test(x))) {
    const html = fs.readFileSync(path.join(out, f), 'utf8');
    assert.ok(!/<script\b/i.test(html) && !/\son[a-z]+=/i.test(html), f);
    assert.match(html, /Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'/, f);
  }
  // CSP o'zgarmagan (manba sahifadagi bilan bir xil)
  const csp = s => /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(s)[1];
  assert.equal(csp(fs.readFileSync(path.join(out, 'index.html'), 'utf8')), csp(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
  assert.equal(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'src/js/calc.js'), 'utf8'), before, 'manba fayllari o\'zgarmagan');
  fs.rmSync(out, { recursive: true, force: true });
});

test('deploy workflow: test job dan keyin, rasmiy Pages action\'lari (aniq versiya), minimal ruxsatlar', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/deploy.yml'), 'utf8');
  assert.match(y, /uses: actions\/upload-pages-artifact@v\d+(\.\d+)*\b/);
  assert.match(y, /uses: actions\/deploy-pages@v\d+(\.\d+)*\b/);
  assert.match(y, /pages: write/);
  assert.match(y, /id-token: write/);
  assert.match(y, /contents: read/);
  assert.ok(!/contents: write|packages: write|actions: write/.test(y));
  assert.match(y, /needs: \[?[a-z, -]*test/);
  assert.match(y, /node scripts\/build-site\.js/);
  assert.match(y, /npm ci/);
  assert.ok(!/npm install(?! -g)|@latest|@main|@master/.test(y), 'aniq versiyalar');
});
