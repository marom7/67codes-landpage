
// =============================================
// shifts67 — app.js
// Frontend ↔ API (with demo fallback)
// 67.codes | marom.cloud
//
// מנסה להתחבר ל-API. אם לא מצליח — עובר 
// אוטומטית למצב DEMO עם נתוני דמה.
// =============================================
const API_BASE = 'http://localhost:5067/api';

// ── Mode ──
let DEMO_MODE = false;

// ── Role config ──
const ROLE_DISPLAY = {
  'קופאי':       { icon: '🛒', css: 'role-cashier' },
  'מתדלק':       { icon: '⛽', css: 'role-attendant' },
  'מנהל תחנה':   { icon: '👔', css: 'role-manager' },
};

const SHIFT_TYPES = [
  { key: 'morning',   name: 'בוקר',    time: '06:00 – 14:00', start: '06:00', end: '14:00', css: 'morning' },
  { key: 'afternoon', name: 'צהריים',  time: '14:00 – 22:00', start: '14:00', end: '22:00', css: 'afternoon' },
  { key: 'night',     name: 'לילה',    time: '22:00 – 06:00', start: '22:00', end: '06:00', css: 'night' },
];

const HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// ── State ──
let weekOffset = 0;
let employees = [];
let roles = [];
let shiftsData = [];
let shiftsMap = {};
let nextDemoId = 1000;

// =============================================
// DEMO DATA
// =============================================
const DEMO = {
  roles: [
    { id: 1, name: 'קופאי' },
    { id: 2, name: 'מתדלק' },
    { id: 3, name: 'מנהל תחנה' },
  ],
  stations: [
    { id: 1, name: 'תחנת הטייסים', city: 'אשדוד', status: 'active' },
    { id: 2, name: 'תחנת התקווה',  city: 'אשדוד', status: 'active' },
  ],
  employees: [
    { id: 1, first_name: 'יוסי',  last_name: 'כהן',      phone: '050-1111111', status: 'active', stations: [{ station_id: 1, is_primary: true },  { station_id: 2, is_primary: false }] },
    { id: 2, first_name: 'דנה',   last_name: 'לוי',       phone: '050-2222222', status: 'active', stations: [{ station_id: 1, is_primary: true }] },
    { id: 3, first_name: 'אחמד',  last_name: 'חסן',       phone: '050-3333333', status: 'active', stations: [{ station_id: 1, is_primary: true }] },
    { id: 4, first_name: 'מריה',  last_name: 'גרינברג',   phone: '050-4444444', status: 'active', stations: [{ station_id: 1, is_primary: true },  { station_id: 2, is_primary: false }] },
    { id: 5, first_name: 'עומר',  last_name: 'בן דוד',    phone: '050-5555555', status: 'active', stations: [{ station_id: 2, is_primary: true }] },
    { id: 6, first_name: 'נועה',  last_name: 'אברהם',     phone: '050-6666666', status: 'active', stations: [{ station_id: 2, is_primary: true }] },
    { id: 7, first_name: 'רון',   last_name: 'שמעוני',    phone: '050-7777777', status: 'active', stations: [{ station_id: 1, is_primary: true }] },
    { id: 8, first_name: 'טל',    last_name: 'מזרחי',     phone: '050-8888888', status: 'active', stations: [{ station_id: 2, is_primary: true }] },
  ],
  shifts: [],
};

function seedDemoShifts() {
  DEMO.shifts = [];
  const weekStart = getWeekStart(new Date());
  let id = 1;

  // Station 1 — תחנת הטייסים
  for (let d = 0; d < 6; d++) {
    const ds = fmtDate(addDays(weekStart, d));
    const dayType = d === 5 ? 'saturday' : 'regular';

    DEMO.shifts.push(
      { id: id++, employee_id: 1, first_name: 'יוסי',  last_name: 'כהן',    station_id: 1, role_id: 1, role_name: 'קופאי',  shift_date: ds, time_start: '06:00', time_end: '14:00', day_type: dayType, status: 'scheduled' },
      { id: id++, employee_id: 2, first_name: 'דנה',   last_name: 'לוי',     station_id: 1, role_id: 1, role_name: 'קופאי',  shift_date: ds, time_start: '06:00', time_end: '14:00', day_type: dayType, status: 'scheduled' },
      { id: id++, employee_id: 3, first_name: 'אחמד',  last_name: 'חסן',     station_id: 1, role_id: 2, role_name: 'מתדלק',  shift_date: ds, time_start: '06:00', time_end: '14:00', day_type: dayType, status: 'scheduled' },
      { id: id++, employee_id: 4, first_name: 'מריה',  last_name: 'גרינברג', station_id: 1, role_id: 1, role_name: 'קופאי',  shift_date: ds, time_start: '14:00', time_end: '22:00', day_type: dayType, status: 'scheduled' },
      { id: id++, employee_id: 7, first_name: 'רון',   last_name: 'שמעוני',  station_id: 1, role_id: 2, role_name: 'מתדלק',  shift_date: ds, time_start: '14:00', time_end: '22:00', day_type: dayType, status: 'scheduled' },
    );
    if (d < 5) {
      DEMO.shifts.push(
        { id: id++, employee_id: 3, first_name: 'אחמד', last_name: 'חסן', station_id: 1, role_id: 2, role_name: 'מתדלק', shift_date: ds, time_start: '22:00', time_end: '06:00', day_type: dayType, status: 'scheduled' },
      );
    }
  }

  // Station 2 — תחנת התקווה
  for (let d = 0; d < 6; d++) {
    const ds = fmtDate(addDays(weekStart, d));
    const dayType = d === 5 ? 'saturday' : 'regular';

    DEMO.shifts.push(
      { id: id++, employee_id: 5, first_name: 'עומר', last_name: 'בן דוד', station_id: 2, role_id: 1, role_name: 'קופאי', shift_date: ds, time_start: '06:00', time_end: '14:00', day_type: dayType, status: 'scheduled' },
      { id: id++, employee_id: 6, first_name: 'נועה', last_name: 'אברהם',  station_id: 2, role_id: 2, role_name: 'מתדלק', shift_date: ds, time_start: '06:00', time_end: '14:00', day_type: dayType, status: 'scheduled' },
      { id: id++, employee_id: 8, first_name: 'טל',   last_name: 'מזרחי',  station_id: 2, role_id: 1, role_name: 'קופאי', shift_date: ds, time_start: '14:00', time_end: '22:00', day_type: dayType, status: 'scheduled' },
      { id: id++, employee_id: 5, first_name: 'עומר', last_name: 'בן דוד', station_id: 2, role_id: 2, role_name: 'מתדלק', shift_date: ds, time_start: '14:00', time_end: '22:00', day_type: dayType, status: 'scheduled' },
    );
  }

  nextDemoId = id;
}

// =============================================
// API HELPERS
// =============================================
async function api(path, options = {}) {
  if (DEMO_MODE) return null;

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.message) alert(`⚠ ${err.message}`);
    throw err;
  }
  if (res.status === 204) return null;
  return await res.json();
}

async function checkApiConnection() {
  try {
    const res = await fetch(`${API_BASE}/ping`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// =============================================
// DATA LOADING
// =============================================
async function loadStations() {
  const stations = DEMO_MODE ? DEMO.stations : await api('/stations');
  const sel = document.getElementById('stationSelect');
  sel.innerHTML = stations.map(s =>
    `<option value="${s.id}">🏪 ${s.name}</option>`
  ).join('');
}

async function loadRoles() {
  roles = DEMO_MODE ? DEMO.roles : await api('/roles');
  const sel = document.getElementById('modalRole');
  sel.innerHTML = roles.map(r => {
    const d = ROLE_DISPLAY[r.name] || { icon: '👤' };
    return `<option value="${r.id}">${d.icon} ${r.name}</option>`;
  }).join('');
}

async function loadEmployees() {
  employees = DEMO_MODE ? DEMO.employees : await api('/employees?status=active');
}

async function loadShifts() {
  const stationId = Number(document.getElementById('stationSelect').value);
  const weekStart = getCurrentWeekStart();
  const weekEnd = addDays(weekStart, 6);
  const from = fmtDate(weekStart);
  const to = fmtDate(weekEnd);

  if (DEMO_MODE) {
    shiftsData = DEMO.shifts.filter(s =>
      s.station_id === stationId &&
      s.shift_date >= from &&
      s.shift_date <= to &&
      s.status !== 'cancelled'
    );
  } else {
    shiftsData = await api(`/shifts?stationId=${stationId}&from=${from}&to=${to}`);
  }

  // Group into map
  shiftsMap = {};
  for (const sh of shiftsData) {
    const date = sh.shift_date.split('T')[0];
    const type = getShiftType(sh.time_start);
    const key = `${date}-${type}`;
    if (!shiftsMap[key]) shiftsMap[key] = [];
    shiftsMap[key].push(sh);
  }
}

function getShiftType(timeStart) {
  const t = timeStart.substring(0, 5);
  if (t === '06:00') return 'morning';
  if (t === '14:00') return 'afternoon';
  if (t === '22:00') return 'night';
  const h = parseInt(t);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 20) return 'afternoon';
  return 'night';
}

// =============================================
// DATE HELPERS
// =============================================
function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function fmtDateShort(d) {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function isToday(d) {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function isSaturday(d) {
  return d.getDay() === 6;
}

function getCurrentWeekStart() {
  return addDays(getWeekStart(new Date()), weekOffset * 7);
}

// =============================================
// RENDER
// =============================================
async function render() {
  await loadShifts();

  const weekStart = getCurrentWeekStart();
  const weekEnd = addDays(weekStart, 6);

  document.getElementById('weekLabel').textContent =
    `${fmtDateShort(weekStart)} — ${fmtDateShort(weekEnd)}`;

  // Table head
  const thead = document.getElementById('tableHead');
  let headHtml = '<tr><th class="th-corner">משמרת</th>';
  for (let d = 0; d < 7; d++) {
    const date = addDays(weekStart, d);
    const today = isToday(date);
    const sat = isSaturday(date);
    const cls = today ? 'today-col' : sat ? 'saturday-col' : '';
    headHtml += `<th class="${cls}">
      ${HEB_DAYS[d]}
      <span class="th-date ${today ? 'th-date-today' : ''}">${date.getDate()}</span>
    </th>`;
  }
  headHtml += '</tr>';
  thead.innerHTML = headHtml;

  // Table body
  const tbody = document.getElementById('tableBody');
  let bodyHtml = '';

  for (const st of SHIFT_TYPES) {
    bodyHtml += '<tr>';
    bodyHtml += `<td class="shift-type-cell ${st.css}">
      ${st.name}
      <span class="shift-time">${st.time}</span>
    </td>`;

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      const ds = fmtDate(date);
      const key = `${ds}-${st.key}`;
      const today = isToday(date);
      const sat = isSaturday(date);
      const cellCls = today ? 'today' : sat ? 'saturday' : '';
      const assigned = shiftsMap[key] || [];

      bodyHtml += `<td class="day-cell ${cellCls}">`;

      for (const sh of assigned) {
        const roleName = sh.role_name || '';
        const rd = ROLE_DISPLAY[roleName] || { icon: '👤', css: '' };
        bodyHtml += `<div class="chip ${rd.css}">
          <span class="chip-role-icon">${rd.icon}</span>
          ${sh.first_name} ${sh.last_name}
          <span class="chip-remove" onclick="removeShift(${sh.id})" title="הסר">✕</span>
        </div>`;
      }

      bodyHtml += `<div class="cell-add" onclick="openAddModal('${ds}','${st.key}')">+ הוסף</div>`;
      bodyHtml += '</td>';
    }
    bodyHtml += '</tr>';
  }

  tbody.innerHTML = bodyHtml;
  updateStats();
}

function updateStats() {
  const total = shiftsData.length;
  const employeeSet = new Set(shiftsData.map(s => s.employee_id));

  const weekStart = getCurrentWeekStart();
  let filled = 0;
  for (let d = 0; d < 7; d++) {
    const ds = fmtDate(addDays(weekStart, d));
    for (const st of SHIFT_TYPES) {
      if (shiftsMap[`${ds}-${st.key}`]?.length > 0) filled++;
    }
  }

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statMissing').textContent = 21 - filled;
  document.getElementById('statEmployees').textContent = employeeSet.size;
}

// =============================================
// ACTIONS
// =============================================
function changeWeek(dir) {
  weekOffset += dir;
  render();
}

function goToday() {
  weekOffset = 0;
  render();
}

function openAddModal(date, shiftType) {
  const stationId = Number(document.getElementById('stationSelect').value);

  const stationEmployees = employees.filter(e =>
    e.stations.some(s => s.station_id === stationId)
  );

  const empSelect = document.getElementById('modalEmployee');
  empSelect.innerHTML = stationEmployees.map(e =>
    `<option value="${e.id}">${e.first_name} ${e.last_name}</option>`
  ).join('');

  if (date) {
    document.getElementById('modalDate').value = date;
    document.getElementById('modalShift').value = shiftType;
  }

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

async function addShift() {
  const stationId = Number(document.getElementById('stationSelect').value);
  const employeeId = Number(document.getElementById('modalEmployee').value);
  const roleId = Number(document.getElementById('modalRole').value);
  const date = document.getElementById('modalDate').value;
  const shiftTypeKey = document.getElementById('modalShift').value;

  if (!date || !employeeId) { alert('נא למלא את כל השדות'); return; }

  const st = SHIFT_TYPES.find(s => s.key === shiftTypeKey);
  const dayType = isSaturday(new Date(date + 'T00:00')) ? 'saturday' : 'regular';

  if (DEMO_MODE) {
    // ── Demo: validate + add locally ──
    const emp = employees.find(e => e.id === employeeId);
    const role = roles.find(r => r.id === roleId);

    // Duplicate check
    const dup = DEMO.shifts.find(s =>
      s.employee_id === employeeId &&
      s.shift_date === date &&
      s.time_start === st.start &&
      s.station_id === stationId &&
      s.status !== 'cancelled'
    );
    if (dup) { alert('העובד כבר משובץ למשמרת זו'); return; }

    // 8h rest check
    const adjacent = DEMO.shifts.filter(s =>
      s.employee_id === employeeId &&
      s.status !== 'cancelled' &&
      Math.abs(new Date(s.shift_date) - new Date(date)) <= 86400000
    );
    for (const ex of adjacent) {
      const exEnd = new Date(`${ex.shift_date}T${ex.time_end}`);
      const newStart = new Date(`${date}T${st.start}`);
      const gap = Math.abs(newStart - exEnd) / 3600000;
      if (gap > 0 && gap < 8) {
        alert(`⚠ מינימום 8 שעות מנוחה בין משמרות. פער נוכחי: ${gap.toFixed(1)} שעות`);
        return;
      }
    }

    DEMO.shifts.push({
      id: nextDemoId++,
      employee_id: employeeId,
      first_name: emp.first_name,
      last_name: emp.last_name,
      station_id: stationId,
      role_id: roleId,
      role_name: role.name,
      shift_date: date,
      time_start: st.start,
      time_end: st.end,
      day_type: dayType,
      status: 'scheduled',
    });
  } else {
    // ── API mode ──
    try {
      await api('/shifts', {
        method: 'POST',
        body: JSON.stringify({
          templateId: null, employeeId, stationId, roleId,
          shiftDate: date, timeStart: st.start, timeEnd: st.end, dayType,
        }),
      });
    } catch { return; }
  }

  closeModal();
  await render();
}

async function removeShift(shiftId) {
  if (!confirm('להסיר שיבוץ?')) return;

  if (DEMO_MODE) {
    const sh = DEMO.shifts.find(s => s.id === shiftId);
    if (sh) sh.status = 'cancelled';
  } else {
    try {
      await api(`/shifts/${shiftId}`, { method: 'DELETE' });
    } catch { return; }
  }

  await render();
}

// =============================================
// MODE BADGE
// =============================================
function showModeBadge() {
  const badge = document.createElement('div');
  badge.id = 'modeBadge';
  badge.style.cssText = `
    position:fixed; bottom:16px; left:16px; z-index:999;
    padding:8px 14px; border-radius:8px; font-size:0.7rem;
    font-family:'Heebo',sans-serif; font-weight:600;
    display:flex; align-items:center; gap:6px;
    transition:opacity 0.3s ease; cursor:default;
  `;

  if (DEMO_MODE) {
    badge.style.background = '#fef3c7';
    badge.style.color = '#92400e';
    badge.style.border = '1px solid #fde68a';
    badge.innerHTML = '🧪 DEMO — נתוני דמה';
  } else {
    badge.style.background = '#d1fae5';
    badge.style.color = '#065f46';
    badge.style.border = '1px solid #a7f3d0';
    badge.innerHTML = '🟢 API מחובר';
    setTimeout(() => { badge.style.opacity = '0'; }, 3000);
    setTimeout(() => { badge.remove(); }, 3500);
  }

  document.body.appendChild(badge);
}

// =============================================
// INIT
// =============================================
(async function init() {
  const apiOk = await checkApiConnection();

  if (!apiOk) {
    DEMO_MODE = true;
    seedDemoShifts();
    console.log('shifts67: API unavailable → DEMO mode');
  } else {
    console.log('shifts67: API connected → LIVE mode');
  }

  showModeBadge();

  await loadStations();
  await loadRoles();
  await loadEmployees();
  await render();
})();
  
