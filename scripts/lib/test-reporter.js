/* SCRIPTS/LIB/TEST-REPORTER.JS — `node --test` uchun mashinada o'qiladigan reporter (P13, scripts/validation-report.js).
   Har bir hodisa — bitta JSON satri: { type: 'pass' | 'fail' | 'diagnostic', name, file, nesting, kind, todo, skip, error }.
   Davomiylik va vaqt yozilmaydi (validatsiya hisoboti deterministik bo'lishi uchun). */
'use strict';
const path = require('node:path');

module.exports = async function* reporter(source) {
  for await (const ev of source) {
    const d = ev.data || {};
    if (ev.type === 'test:pass' || ev.type === 'test:fail') {
      const err = d.details && d.details.error;
      const cause = err && (err.cause && err.cause.message ? err.cause.message : err.message);
      yield JSON.stringify({
        type: ev.type === 'test:pass' ? 'pass' : 'fail',
        name: d.name, nesting: d.nesting, kind: (d.details && d.details.type) || 'test',
        file: d.file ? path.relative(process.cwd(), d.file).split(path.sep).join('/') : '',
        todo: d.todo === undefined ? null : (d.todo === true ? '' : String(d.todo)),
        skip: d.skip === undefined ? null : (d.skip === true ? '' : String(d.skip)),
        error: ev.type === 'test:fail' && cause ? String(cause).split('\n').slice(0, 6).join('\n').slice(0, 800) : null,
      }) + '\n';
    } else if (ev.type === 'test:diagnostic' && d.nesting === 0) {
      yield JSON.stringify({ type: 'diagnostic', message: String(d.message) }) + '\n';
    }
  }
};
