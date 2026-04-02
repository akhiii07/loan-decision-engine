/**
 * inr-format.js
 * Live Indian-denomination display below every ₹ input.
 * Shows formatted value (₹ 1,00,000) + human label (1 L / 10 Cr) as user types.
 * Does NOT change the actual input value — engine reads type=number fields cleanly.
 */
(function () {
  'use strict';

  /* ── Indian comma formatter ── */
  function formatINR(n) {
    if (!n || isNaN(n) || n <= 0) return '';
    var s = Math.floor(n).toString();
    if (s.length <= 3) return '\u20b9\u00a0' + s;
    var last3 = s.slice(-3);
    var rest   = s.slice(0, s.length - 3);
    return '\u20b9\u00a0' + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }

  /* ── Human label: L / Cr ── */
  function humanLabel(n) {
    if (!n || n <= 0) return '';
    if (n >= 10000000) return (n / 10000000).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
    if (n >= 100000)   return (n / 100000).toFixed(2).replace(/\.?0+$/, '')   + ' L';
    if (n >= 1000)     return (n / 1000).toFixed(1).replace(/\.?0+$/, '')     + ' K';
    return '';
  }

  /* ── Attach a live display span after each .input-prefix wrapper ── */
  function attach(wrap) {
    var inp = wrap.querySelector('input[type="number"]');
    if (!inp) return;

    var disp = document.createElement('span');
    disp.className = 'inr-live';
    wrap.parentNode.insertBefore(disp, wrap.nextSibling);

    inp.addEventListener('input', function () {
      var raw = parseFloat(this.value);
      if (!raw || isNaN(raw) || raw <= 0) {
        disp.textContent = '';
        return;
      }
      var label = humanLabel(raw);
      disp.textContent = formatINR(raw) + (label ? '\u2002\u2014\u2002' + label : '');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.input-prefix').forEach(attach);
  });
})();
