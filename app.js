/* מעקב פגישות — נתונים נשמרים מקומית במכשיר בלבד */

(function () {
  'use strict';

  var KEY = 'therapy.sessions.v1';
  var sessions = [];        // [{ id: string, ts: number }]
  var storageOk = true;
  var view = new Date();    // החודש המוצג
  view.setDate(1);

  var el = {
    monthName: document.getElementById('monthName'),
    prev: document.getElementById('prevMonth'),
    next: document.getElementById('nextMonth'),
    dots: document.getElementById('dots'),
    countNum: document.getElementById('countNum'),
    countLabel: document.getElementById('countLabel'),
    logBtn: document.getElementById('logBtn'),
    todayNote: document.getElementById('todayNote'),
    arrive: document.getElementById('arrivePrompt'),
    list: document.getElementById('list'),
    totalAll: document.getElementById('totalAll'),
    addDate: document.getElementById('addDate'),
    addTime: document.getElementById('addTime'),
    addBtn: document.getElementById('addBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importFile: document.getElementById('importFile'),
    storageWarn: document.getElementById('storageWarn'),
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText'),
    toastAction: document.getElementById('toastAction')
  };

  /* ---------- אחסון ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      sessions = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(sessions)) sessions = [];
    } catch (e) {
      sessions = [];
      storageOk = false;
    }
  }

  function save() {
    if (!storageOk) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(sessions));
    } catch (e) {
      storageOk = false;
      el.storageWarn.hidden = false;
    }
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- עזרי תאריך ---------- */

  var monthFmt = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
  var dayFmt = new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' });
  var timeFmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });

  function sameMonth(ts, d) {
    var t = new Date(ts);
    return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth();
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  function inMonth(d) {
    return sessions.filter(function (s) { return sameMonth(s.ts, d); })
                   .sort(function (a, b) { return b.ts - a.ts; });
  }

  function loggedToday() {
    var now = new Date();
    return sessions.filter(function (s) { return sameDay(new Date(s.ts), now); })
                   .sort(function (a, b) { return b.ts - a.ts; });
  }

  /* ---------- תצוגה ---------- */

  function render(animateLast) {
    el.monthName.textContent = monthFmt.format(view);

    var items = inMonth(view);
    var n = items.length;

    el.countNum.textContent = n;
    el.countLabel.textContent = n === 0 ? 'אין עדיין פגישות בחודש הזה'
                              : n === 1 ? 'פגישה אחת בחודש הזה'
                              : n + ' פגישות בחודש הזה';

    el.dots.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var dot = document.createElement('span');
      dot.className = 'dot' + (animateLast && i === 0 ? ' dot--new' : '');
      el.dots.appendChild(dot);
    }

    var today = new Date();
    var isThisMonth = sameMonth(today.getTime(), view);
    el.next.disabled = isThisMonth;

    var t = loggedToday();
    el.todayNote.textContent = t.length === 0 ? '\u00A0'
      : t.length === 1 ? 'נרשמה פגישה היום ב-' + timeFmt.format(new Date(t[0].ts))
      : 'נרשמו היום ' + t.length + ' פגישות';

    el.list.innerHTML = '';
    if (items.length === 0) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'החודש עוד ריק.';
      el.list.appendChild(li);
    } else {
      items.forEach(function (s) {
        var d = new Date(s.ts);
        var row = document.createElement('li');

        var day = document.createElement('span');
        day.className = 'list__day';
        day.textContent = dayFmt.format(d);

        var time = document.createElement('span');
        time.className = 'list__time';
        time.textContent = timeFmt.format(d);

        var del = document.createElement('button');
        del.className = 'list__del';
        del.type = 'button';
        del.setAttribute('aria-label', 'מחיקת הפגישה מ-' + dayFmt.format(d));
        del.textContent = '✕';
        del.addEventListener('click', function () { remove(s.id, d); });

        row.appendChild(day);
        row.appendChild(time);
        row.appendChild(del);
        el.list.appendChild(row);
      });
    }

    el.totalAll.textContent = sessions.length ? 'סך הכל ' + sessions.length : '';
  }

  /* ---------- פעולות ---------- */

  function add(ts, opts) {
    var s = { id: newId(), ts: ts };
    sessions.push(s);
    save();

    var d = new Date(ts);
    view = new Date(d.getFullYear(), d.getMonth(), 1);
    render(true);

    if (!opts || !opts.silent) {
      toast('הפגישה נרשמה', 'ביטול', function () {
        remove(s.id, null, true);
      });
    }
    return s;
  }

  function remove(id, d, silent) {
    if (!silent && d && !confirm('למחוק את הפגישה מ-' + dayFmt.format(d) + '?')) return;
    sessions = sessions.filter(function (s) { return s.id !== id; });
    save();
    render();
    if (!silent) toast('הפגישה נמחקה');
  }

  function logNow() {
    var t = loggedToday();
    if (t.length > 0 && !confirm('כבר רשמת פגישה היום. להוסיף עוד אחת?')) return;

    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    el.logBtn.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 700);

    if (navigator.vibrate) navigator.vibrate(12);
    el.logBtn.classList.remove('is-armed');
    el.arrive.hidden = true;

    add(Date.now());
  }

  /* ---------- הודעה קופצת ---------- */

  var toastTimer = null;

  function toast(text, actionLabel, onAction) {
    clearTimeout(toastTimer);
    el.toastText.textContent = text;
    el.toast.hidden = false;

    if (actionLabel) {
      el.toastAction.hidden = false;
      el.toastAction.textContent = actionLabel;
      el.toastAction.onclick = function () {
        hideToast();
        onAction();
      };
    } else {
      el.toastAction.hidden = true;
      el.toastAction.onclick = null;
    }

    toastTimer = setTimeout(hideToast, actionLabel ? 8000 : 2500);
  }

  function hideToast() {
    el.toast.hidden = true;
    el.toastAction.onclick = null;
  }

  /* ---------- גיבוי ---------- */

  function exportData() {
    var payload = { app: 'therapy-tracker', version: 1, exported: new Date().toISOString(), sessions: sessions };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'meetings-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var incoming = Array.isArray(data) ? data : data.sessions;
        if (!Array.isArray(incoming)) throw new Error('bad file');

        var seen = {};
        sessions.forEach(function (s) { seen[s.ts] = true; });

        var added = 0;
        incoming.forEach(function (s) {
          var ts = typeof s.ts === 'number' ? s.ts : Date.parse(s.ts);
          if (!ts || seen[ts]) return;
          seen[ts] = true;
          sessions.push({ id: s.id || newId(), ts: ts });
          added++;
        });

        save();
        render();
        toast(added ? 'נוספו ' + added + ' פגישות' : 'הכל כבר היה קיים');
      } catch (e) {
        toast('הקובץ לא נקרא. צריך קובץ גיבוי של האפליקציה.');
      }
    };
    reader.readAsText(file);
  }

  /* ---------- חיווט ---------- */

  el.logBtn.addEventListener('click', logNow);

  el.prev.addEventListener('click', function () {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    render();
  });

  el.next.addEventListener('click', function () {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    render();
  });

  el.addBtn.addEventListener('click', function () {
    if (!el.addDate.value) { toast('צריך לבחור תאריך'); return; }
    var parts = el.addDate.value.split('-');
    var time = (el.addTime.value || '17:00').split(':');
    var ts = new Date(+parts[0], +parts[1] - 1, +parts[2], +time[0], +time[1]).getTime();
    if (ts > Date.now() + 60000) { toast('אי אפשר לרשום פגישה בעתיד'); return; }
    add(ts);
  });

  el.exportBtn.addEventListener('click', exportData);

  el.importFile.addEventListener('change', function () {
    if (this.files && this.files[0]) importData(this.files[0]);
    this.value = '';
  });

  /* פתיחה עם ?log=1 — למשל מקיצור של אייפון בהגעה למקום */
  if (/[?&]log=/.test(location.search)) {
    el.arrive.hidden = false;
    el.logBtn.classList.add('is-armed');
    history.replaceState(null, '', location.pathname);
  }

  load();
  if (!storageOk) el.storageWarn.hidden = false;
  el.addDate.value = new Date().toISOString().slice(0, 10);
  render();

  /* ---------- Service Worker ---------- */

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', function () {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              var bar = document.getElementById('updateBar');
              bar.hidden = false;
              document.getElementById('updateBtn').onclick = function () {
                sw.postMessage({ type: 'SKIP_WAITING' });
              };
            }
          });
        });
      }).catch(function () { /* בלי HTTPS זה פשוט לא ירשם */ });

      var refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        refreshing = true;
        location.reload();
      });
    });
  }
})();
