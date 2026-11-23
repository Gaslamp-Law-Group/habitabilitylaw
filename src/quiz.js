// phone taps, on every page: which button was tapped, never who tapped it
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href^="tel:"]');
  if (!a) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'phone_click', click_location: a.getAttribute('data-loc') || 'other' });
});

(function () {
  var form = document.getElementById('quiz');
  if (!form) return;
  var t = JSON.parse(document.getElementById('quiz-i18n').textContent);
  var steps = [].slice.call(form.querySelectorAll('.q-step'));
  var bar = form.querySelector('.q-bar');
  var count = form.querySelector('.q-count');
  var back = form.querySelector('.q-back');
  var err = form.querySelector('.q-err');
  function setErr(m) { err = steps[i].querySelector('.q-err') || err; err.textContent = m; }
  var first = Number(form.dataset.start || 0);
  var i = first;
  var started = false;
  form.classList.add('js');

  function track(event, data) {
    window.dataLayer = window.dataLayer || [];
    var o = { event: event };
    for (var k in data) o[k] = data[k];
    window.dataLayer.push(o); // step numbers only, never answers
  }

  function show(n, focus) {
    i = n;
    steps.forEach(function (s, k) { s.hidden = k !== n; });
    count.textContent = t.count.replace('{n}', n + 1).replace('{t}', steps.length);
    bar.style.width = Math.round(((n + 1) / steps.length) * 100) + '%';
    back.hidden = n === 0;
    setErr('');
    if (focus) {
      var lg = steps[n].querySelector('legend');
      if (lg) lg.focus({ preventScroll: true });
      track('quiz_step', { step: n + 1 });
    }
  }

  function stepValid() {
    var s = steps[i];
    if (s.dataset.need === 'check' && !s.querySelector('input:checked')) {
      setErr(t.pick);
      return false;
    }
    return true;
  }

  form.addEventListener('change', function (e) {
    if (!started) { started = true; track('quiz_start', {}); }
    if (e.target.type === 'radio') {
      setTimeout(function () { show(i + 1, true); }, 160);
    }
  });
  form.addEventListener('click', function (e) {
    if (e.target.closest('.q-next')) { if (stepValid()) show(i + 1, true); }
    if (e.target.closest('.q-back')) { if (i > 0) show(i - 1, true); }
  });

  // carry ad click IDs and UTMs into the lead for offline conversion import
  // A new ad click replaces the stored set; otherwise the last ad click is kept for 90 days,
  // so a tenant who comes back later to finish the quiz is still tied to the ad that brought them.
  try {
    var qs = new URLSearchParams(location.search);
    var fields = [].slice.call(form.querySelectorAll('input[data-track]'));
    var fresh = {}, any = false;
    fields.forEach(function (el) { var v = qs.get(el.name); if (v) { fresh[el.name] = v.slice(0, 200); any = true; } });
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem('hl_attr') || '{}'); } catch (e2) {}
    if (any) {
      saved = { t: Date.now(), v: fresh };
      try { localStorage.setItem('hl_attr', JSON.stringify(saved)); } catch (e3) {}
    } else if (!saved.t || Date.now() - saved.t > 90 * 864e5) {
      saved = { v: {} };
    }
    fields.forEach(function (el) { el.value = (saved.v && saved.v[el.name]) || ''; });
  } catch (e) {}

  function val(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.dataset.score | 0 : 0;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name.value.trim();
    var phone = form.elements.phone.value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    var zip = form.elements.zip.value.trim();
    if (name.length < 2) { setErr(t.errName); form.elements.name.focus(); return; }
    if (phone.length !== 10) { setErr(t.errPhone); form.elements.phone.focus(); return; }
    if (!/^9\d{4}$/.test(zip)) { setErr(t.errZip); form.elements.zip.focus(); return; }
    setErr('');
    form.elements.lead_score.value = val('duration') + val('notice') + val('residence') + val('occupants');

    var btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    var done = function () {
      track('lead_submit', { page: form.elements.page.value, lang: form.elements.lang.value });
      form.querySelector('.q-body').hidden = true;
      var d = form.querySelector('.q-done');
      d.querySelector('h3').textContent = t.doneTitle.replace('{name}', name.split(' ')[0]);
      d.hidden = false;
      d.querySelector('h3').focus();
    };
    if (form.dataset.preview) { done(); return; }
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      done();
    }).catch(function () {
      btn.disabled = false;
      setErr(t.errSend);
    });
  });

  show(first, false);
})();
