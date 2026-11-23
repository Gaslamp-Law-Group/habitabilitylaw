// Zero-dependency static build. Usage: node build.mjs [--preview]
// --preview makes the quiz skip sending (for previews with no form backend).
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, issues, landers, copy } from './content.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const preview = process.argv.includes('--preview');
const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const js = readFileSync(join(root, 'src/quiz.js'), 'utf8');
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });

const fill = (s) => s.replaceAll('{phone}', site.phoneDisplay).replaceAll('{firm}', site.firm)
  .replaceAll('{attorney}', site.attorney).replaceAll('{address}', site.address);
const other = (lang) => (lang === 'en' ? 'es' : 'en');
// file path inside dist for a page
const file = (lang, slug) => (lang === 'es' ? 'es/' : '') + (slug || 'index') + '.html';
// relative link between two pages (works on any host, including previews)
const rel = (fromLang, toLang, slug) => {
  const name = (slug || 'index') + '.html';
  if (fromLang === toLang) return name;
  return toLang === 'es' ? 'es/' + name : '../' + name;
};
const canonical = (lang, slug) => site.domain + '/' + (lang === 'es' ? 'es/' : '') + (slug || '');

// Hidden lead fields filled from the landing URL: UTMs plus Google (gclid, gbraid, wbraid), Microsoft and Meta click IDs.
const TRACK_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid'];
const gtmHead = site.gtmId ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${site.gtmId}');</script>` : '';
const gtmBody = site.gtmId ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${site.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : '';

function tiles(name, labels, { type = 'radio', keys, scores, checked, cls = '' } = {}) {
  return `<div class="tiles ${cls}">` + labels.map((label, i) => {
    const v = keys ? keys[i] : label;
    const sc = scores ? ` data-score="${scores[i]}"` : '';
    const ck = checked === v ? ' checked' : '';
    return `<label class="tile"><input type="${type}" name="${name}" value="${v}" id="${name}-${i}"${sc}${ck}><span>${label}</span></label>`;
  }).join('') + '</div>';
}

function quiz(lang, issueKey, pageName) {
  const q = copy[lang].quiz;
  const keys = Object.keys(q.issues);
  const step = ([legend, hint], body, need = '') =>
    `<fieldset class="q-step"${need ? ` data-need="${need}"` : ''}><legend tabindex="-1">${legend}</legend>${hint ? `<p class="q-hint">${hint}</p>` : ''}${body}</fieldset>`;
  const i18n = { count: q.count, pick: q.pick, errName: q.errName, errPhone: q.errPhone, errZip: q.errZip, errSend: fill(q.errSend), doneTitle: q.doneTitle };
  return `
<form class="quiz" id="quiz" name="case-review" method="POST" data-netlify="true" netlify-honeypot="bot-field" data-start="${issueKey ? 1 : 0}"${preview ? ' data-preview="1"' : ''} novalidate>
  <input type="hidden" name="form-name" value="case-review">
  <input type="hidden" name="lang" value="${lang}">
  <input type="hidden" name="page" value="${pageName}">
  <input type="hidden" name="lead_score" value="">
  ${TRACK_FIELDS.map((k) => `<input type="hidden" name="${k}" value="" data-track>`).join('')}
  <p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
  <div class="q-body">
    <div class="q-head"><span class="q-count" aria-live="polite"></span><button type="button" class="q-back" hidden>${q.back}</button></div>
    <div class="q-track"><div class="q-bar"></div></div>
    ${step(q.q1, tiles('issue', keys.map((k) => q.issues[k]), { type: 'checkbox', keys, checked: issueKey }) + `<p class="q-err" role="alert"></p><button type="button" class="btn wide q-next">${q.next}</button>`, 'check')}
    ${step(q.q2, tiles('duration', q.duration, { scores: [0, 1, 2, 3] }))}
    ${step(q.q3, tiles('notice', q.notice, { scores: [2, 1, 0], cls: 'one' }))}
    ${step(q.q4, tiles('residence', q.residence, { scores: [2, 1, 0], cls: 'one' }))}
    ${step(q.q5, tiles('occupants', ['1', '2', '3', '4', '5+'], { scores: [0, 1, 2, 3, 3], cls: 'five' }))}
    ${step(q.q6, `
      <div class="field"><label for="f-name">${q.name}</label><input id="f-name" name="name" autocomplete="name" required></div>
      <div class="field-row">
        <div class="field"><label for="f-phone">${q.phone}</label><input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>
        <div class="field"><label for="f-zip">${q.zip}</label><input id="f-zip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="5" required></div>
      </div>
      <div class="field"><label for="f-email">${q.email}</label><input id="f-email" name="email" type="email" autocomplete="email"></div>
      <p class="q-err" role="alert"></p>
      <button type="submit" class="btn wide">${q.submit}</button>
      <p class="consent">${q.consent}</p>`)}
  </div>
  <div class="q-done" hidden>
    <h3 tabindex="-1"></h3>
    <p>${fill(q.done1)}</p><p>${q.done2}</p>
    <ul class="plain" style="margin-top:.8rem">${copy[lang].record.map(([a]) => `<li>${a}</li>`).join('')}</ul>
    ${preview ? `<p class="preview-note">${q.preview}</p>` : ''}
  </div>
</form>
<script type="application/json" id="quiz-i18n">${JSON.stringify(i18n)}</script>`;
}

function shell(lang, { slug, title, desc, body, altSlug, bar = true, lander = false, noindex = false }) {
  const c = copy[lang];
  const f = c.footer;
  return `<!DOCTYPE html>
<html lang="${c.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${desc ? `<meta name="description" content="${desc}">` : ''}
${noindex ? '<meta name="robots" content="noindex,follow">' : ''}
<link rel="canonical" href="${canonical(lang, slug)}">
<link rel="alternate" hreflang="${other(lang)}" href="${canonical(other(lang), altSlug)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap" rel="stylesheet">
<!-- TRACKING: set site.gtmId in content.mjs to load Google Tag Manager. The page pushes quiz_start, quiz_step, lead_submit and phone_click to dataLayer. -->
<script>window.dataLayer=window.dataLayer||[];window.dataLayer.push({page_lang:'${lang}',page_name:'${slug || 'home'}'});</script>
${gtmHead}
<style>${css}</style>
</head>
<body>
${gtmBody}
<header class="top"><div class="wrap">
  ${lander ? `<span class="brand">Habitability Law<small>${c.brandSub}</small></span>` : `<a class="brand" href="${rel(lang, lang, '')}">Habitability Law<small>${c.brandSub}</small></a>`}
  <div class="top-actions">
    <a class="lang" href="${rel(lang, other(lang), altSlug)}" lang="${other(lang)}">${c.otherLang}</a>
    <a class="phone" href="tel:${site.phoneTel}" data-loc="header"><span>${c.callLabel}</span>${site.phoneDisplay}</a>
  </div>
</div></header>
<main>${body}</main>
<footer><div class="wrap">
  <p class="firm">${f.ad} ${fill(f.who)}</p>
  <p>${f.fee}</p>
  <p>${f.legal}</p>
  <p><a href="${rel(lang, lang, c.privacy.slug)}">${f.privacy}</a></p>
</div></footer>
${bar ? `<div class="bar"><a class="btn ghost" href="tel:${site.phoneTel}" data-loc="bar">${c.callLabel}</a><a class="btn" href="#quiz">${c.cta}</a></div>` : ''}
<script>${js}</script>
</body>
</html>`;
}

function sharedSections(lang) {
  const c = copy[lang];
  return `
<section class="sec sec-white"><div class="wrap split">
  <div><h2>${c.recoverTitle}</h2><p class="lede">${c.recoverLede}</p></div>
  <ul class="plain">${c.recover.map(([a, b]) => `<li><b>${a}</b>${b}</li>`).join('')}</ul>
</div></section>
<section class="sec"><div class="wrap">
  <h2>${c.stepsTitle}</h2>
  <ol class="steps">${c.steps.map(([a, b]) => `<li><div><h3>${a}</h3><p>${b}</p></div></li>`).join('')}</ol>
</div></section>
<section class="sec sec-white"><div class="wrap split">
  <div><h2>${c.recordTitle}</h2><p class="lede">${c.recordLede}</p></div>
  <ul class="plain">${c.record.map(([a, b]) => `<li><b>${a}</b>${b}</li>`).join('')}</ul>
</div></section>
<section class="sec faq"><div class="wrap split">
  <h2>${c.faqTitle}</h2>
  <div>${c.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
</div></section>
<section class="close"><div class="wrap">
  <h2>${c.closeTitle}</h2>
  <div class="row"><a class="btn dark" href="#quiz">${c.cta}</a><span class="tel">${c.orCall} <a href="tel:${site.phoneTel}" data-loc="close">${site.phoneDisplay}</a></span></div>
</div></section>`;
}

function hero(lang, h1, sub, issueKey, pageName, kicker) {
  const c = copy[lang];
  return `
<section class="hero"><div class="wrap">
  <div>
    ${kicker ? `<p class="kicker">${kicker}</p>` : ''}
    <h1>${h1}</h1>
    <p class="hero-sub">${sub}</p>
    <ul class="proof">${c.proof.map((p) => `<li>${p}</li>`).join('')}</ul>
  </div>
  ${quiz(lang, issueKey, pageName)}
</div></section>`;
}

function write(path, html) {
  const full = join(out, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
}

for (const lang of ['en', 'es']) {
  const c = copy[lang];

  // homepage
  write(file(lang, ''), shell(lang, {
    slug: '', altSlug: '', title: c.home.title, desc: c.home.desc,
    body: hero(lang, c.home.h1, c.home.sub, null, 'home') + `
<section class="sec"><div class="wrap">
  <h2>${c.issuesTitle}</h2>
  <ul class="issues" style="margin-top:1.75rem">${issues.map((it) => `<li><a href="${rel(lang, lang, it.slug[lang])}"><strong>${c.issueNames[it.key][0]}</strong><span>${c.issueNames[it.key][1]}</span></a></li>`).join('')}</ul>
</div></section>` + sharedSections(lang),
  }));

  // ad landing pages: no links out except language, phone and privacy
  for (const it of [...issues, ...landers]) {
    const p = c.pages[it.key];
    const preselect = issues.includes(it) ? it.key : null;
    write(file(lang, it.slug[lang]), shell(lang, {
      slug: it.slug[lang], altSlug: it.slug[other(lang)], title: p.title, desc: p.desc || p.sub, lander: true, noindex: !!it.noindex,
      body: hero(lang, p.h1, p.sub, preselect, it.key, p.kicker) + `
<section class="sec"><div class="wrap split">
  <h2>${c.signsTitle}</h2>
  <div><ul class="plain">${p.signs.map((s) => `<li>${s}</li>`).join('')}</ul><p class="law">${p.law}</p></div>
</div></section>` + sharedSections(lang),
    }));
  }

  // privacy
  const pv = c.privacy;
  write(file(lang, pv.slug), shell(lang, {
    slug: pv.slug, altSlug: copy[other(lang)].privacy.slug, title: pv.title + ' | Habitability Law', bar: false,
    body: `<div class="wrap doc"><h1>${pv.title}</h1>${pv.body.map(([h, t]) => `<h2>${h}</h2><p>${fill(t)}</p>`).join('')}</div>`,
  }));
}
console.log('Built to dist/' + (preview ? ' (preview mode)' : ''));
