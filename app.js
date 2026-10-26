const $ = (selector) => document.querySelector(selector);
const saved = JSON.parse(localStorage.getItem('uitm-semesters') || 'null');
const loadCatalogue = !saved || (saved.length === 1 && saved[0].courses.length === 0);
const state = { view: '1', semesters: loadCatalogue ? [{ id: crypto.randomUUID(), name: `Semester ${localStorage.getItem('uitm-current-part') || 3}`, courses: DEFAULT_COURSES }] : saved, active: 0 };
const apelCourses = JSON.parse(localStorage.getItem('uitm-apel-courses') || '[]');
const completedCourses = JSON.parse(localStorage.getItem('uitm-completed-courses') || 'null') || COMPLETED_COURSES;
function normalizeTimeValue(value, fallback = '08:30') {
  if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  if (typeof value === 'number' && value >= 0 && value < 1) { const minutes = Math.round(value * 24 * 60); return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  const parsed = new Date(value); if (!Number.isNaN(parsed.getTime())) return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  return fallback;
}
function normalizeCourses() {
  state.semesters.forEach((term) => term.courses.forEach((course) => { course.start = normalizeTimeValue(course.start); course.end = normalizeTimeValue(course.end, '10:30'); }));
  // Older data named the first plan "Programme course catalogue"; it is the current semester's plan.
  const current = Number(localStorage.getItem('uitm-current-part') || 3); const legacy = state.semesters.find((term) => term.name === 'Programme course catalogue');
  if (legacy && !state.semesters.some((term) => partNumber(term) === current)) legacy.name = String(current);
  // Part and semester mean the same thing; plans are always shown as "Semester N", whatever an older version or the Sheet called them.
  state.semesters.forEach((term) => { if (partNumber(term)) term.name = `Semester ${partNumber(term)}`; });
}
function partNumber(term) { return Number((String(term.name).match(/\d+/) || [0])[0]); }
// Open the current semester's plan, so the active semester follows the Current semester setting.
function openCurrentSemester() { const index = state.semesters.findIndex((term) => partNumber(term) === Number(localStorage.getItem('uitm-current-part') || 3)); if (index >= 0) state.active = index; }
normalizeCourses(); openCurrentSemester();
const semester = () => state.semesters[state.active];
const touch = () => localStorage.setItem('uitm-last-updated', new Date().toISOString());
const persist = () => { localStorage.setItem('uitm-semesters', JSON.stringify(state.semesters)); touch(); };
const persistApel = () => { localStorage.setItem('uitm-apel-courses', JSON.stringify(apelCourses)); touch(); };
const persistProgress = () => { localStorage.setItem('uitm-completed-courses', JSON.stringify(completedCourses)); touch(); };
const apelCodes = () => new Set(apelCourses.map((course) => course.code));
const askPart = (message, suggestion) => { const part = Number(prompt(message, suggestion)); return Number.isInteger(part) && part >= 1 && part <= 11 ? part : null; };
const sheetUrl = () => localStorage.getItem('uitm-sheet-url') || '';
// One private deployment URL represents one planner. Keeping this key stable lets a phone and laptop restore the same backup.
const deviceId = () => 'primary';
const setSyncStatus = (message) => { $('#syncStatus').textContent = message; };
const snapshot = () => ({ semesters: state.semesters, apelCourses, completedCourses, currentPart: Number(localStorage.getItem('uitm-current-part') || 3), active: state.active, updatedAt: localStorage.getItem('uitm-last-updated') || new Date().toISOString() });
function applySnapshot(data) {
  if (!data || !Array.isArray(data.semesters) || !Array.isArray(data.apelCourses)) return false;
  state.semesters = data.semesters; state.active = Math.min(Number(data.active) || 0, state.semesters.length - 1); normalizeCourses(); apelCourses.splice(0, apelCourses.length, ...data.apelCourses);
  if (Array.isArray(data.completedCourses)) completedCourses.splice(0, completedCourses.length, ...data.completedCourses);
  state.semesters.forEach(syncTakenSubjects); localStorage.setItem('uitm-semesters', JSON.stringify(state.semesters)); localStorage.setItem('uitm-apel-courses', JSON.stringify(apelCourses)); localStorage.setItem('uitm-completed-courses', JSON.stringify(completedCourses)); localStorage.setItem('uitm-current-part', String(Number(data.currentPart) || 3)); localStorage.setItem('uitm-last-updated', data.updatedAt || new Date().toISOString()); openCurrentSemester(); return true;
}
function openSheetPanel() {
  $('#syncPanel').hidden = false; $('#sheetUrl').value = sheetUrl();
  if (!sheetUrl()) setSyncStatus('Paste and save your Apps Script web-app URL.');
}
async function databaseSync(action) {
  const url = sheetUrl(); openSheetPanel();
  if (!url) return;
  setSyncStatus(action === 'push' ? 'Backing up...' : 'Restoring...');
  try {
    // Include the legacy deviceId/data shape too, so an older Planner backup deployment still works.
    const request = { action, deviceId: deviceId(), data: snapshot() };
    const response = await fetch(url, { method: 'POST', body: JSON.stringify(request) });
    if (!response.ok) throw new Error('The web app returned an error.');
    const remote = await response.json();
    if (!remote.ok) throw new Error(remote.error || 'The Sheet could not complete the request.');
    if (action === 'pull') {
      if (!remote.data || !remote.data.semesters || !remote.data.semesters.length) throw new Error('The Sheet is empty. Use Back up first.');
      applySnapshot(remote.data); render(); setSyncStatus('Restored from Google Sheets.');
    } else { applySnapshot(remote.data); render(); setSyncStatus('Backed up. You can now edit the Sheet tabs, then tap Restore.'); }
  } catch (error) { setSyncStatus(`Could not ${action === 'push' ? 'back up' : 'restore'}: ${error.message}`); }
}
async function syncSheet() {
  const url = sheetUrl();
  $('#syncPanel').hidden = false; $('#sheetUrl').value = url;
  if (!url) { setSyncStatus('Paste your Apps Script URL, then tap Save connection.'); return; }
  setSyncStatus('Syncing…');
  try {
    const response = await fetch(url, { method: 'POST', body: JSON.stringify({ deviceId: deviceId(), data: snapshot() }) });
    if (!response.ok) throw new Error('The web app returned an error.');
    const remote = await response.json();
    if (remote.data && new Date(remote.data.updatedAt) > new Date(localStorage.getItem('uitm-last-updated') || 0)) { applySnapshot(remote.data); render(); setSyncStatus('Restored newer data from Google Sheets.'); }
    else setSyncStatus(`Backed up to Google Sheets · ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
  } catch (error) { setSyncStatus(`Could not sync: ${error.message}`); }
}
// A part with progress records holds exactly those subjects (plus ones you added yourself), never catalogue copies meant for
// planning later parts, so semesters never mix. Times stay TBC until A_GROUP_TIMES has them.
function syncTakenSubjects(term) {
  const taken = completedCourses.filter((course) => course.takenPart === partNumber(term));
  if (!taken.length) return 0;
  const keep = new Set(taken.map((course) => course.code)); const catalogue = new Set(DEFAULT_COURSES.map((course) => course.code));
  const before = term.courses.length; term.courses = term.courses.filter((course) => keep.has(course.code) || !catalogue.has(course.code));
  const removed = before - term.courses.length; const missing = taken.filter((course) => !term.courses.some((item) => item.code === course.code));
  missing.forEach((taken) => term.courses.push({ id: crypto.randomUUID(), code: taken.code, name: taken.name, credits: taken.credits, part: taken.takenPart, type: 'Core', session: '1', start: '08:30', end: '10:30', room: '', selected: true, tbc: true }));
  return removed + missing.length;
}
let timetableUpdated = state.semesters.map(syncTakenSubjects).some(Boolean);
state.semesters.forEach((term) => term.courses.forEach((course) => {
  const slot = A_GROUP_TIMES[course.code];
  if (slot && course.tbc) { Object.assign(course, slot); timetableUpdated = true; }
}));
if (timetableUpdated) persist();
let apelSelectionUpdated = false;
state.semesters.forEach((term) => term.courses.forEach((course) => { if (apelCodes().has(course.code) && course.selected) { course.selected = false; apelSelectionUpdated = true; } }));
if (apelSelectionUpdated) persist();
const formatTime = (value) => new Date(`2000-01-01T${normalizeTimeValue(value)}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const esc = (value) => { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; };
const overlap = (a, b) => a.start < b.end && b.start < a.end;
const sameWeek = (a, b) => a.session === 'both' || b.session === 'both' || a.session === b.session;

function credits(term = semester()) { return term.courses.filter((course) => course.selected).reduce((total, course) => total + Number(course.credits), 0); }
function warnings() {
  const selected = semester().courses.filter((course) => course.selected && !course.tbc);
  const result = [];
  for (let i = 0; i < selected.length; i += 1) for (let j = i + 1; j < selected.length; j += 1) {
    if (sameWeek(selected[i], selected[j]) && overlap(selected[i], selected[j])) result.push(`${selected[i].name} clashes with ${selected[j].name}.`);
  }
  if (credits() > 16) result.unshift(`Your selected total is ${credits()} credits - it exceeds the 16-credit limit.`);
  return result;
}
function render() {
  const active = semester(); const total = credits();
  $('#creditLabel').textContent = `${active.name} · selected credits`; $('#editorTarget').textContent = `Course editor · ${active.name}`; $('#basketTitle').textContent = `${active.name} subjects`;
  $('#creditValue').textContent = `${total} / 16`; $('#creditFill').style.width = `${Math.min(100, total / 16 * 100)}%`; $('#creditFill').style.background = total > 16 ? '#dd6755' : '#e8b450';
  const calendarDates = Object.entries(CLASS_DATES).flatMap(([session, dates]) => dates.map((date, index) => ({ session, date, seminar: index + 1 }))).sort((a, b) => {
    const toDate = (value) => new Date(`${value.split(' - ')[0]}${/\b20\d\d\b/.test(value) ? '' : ' 2027'}`);
    return toDate(a.date) - toDate(b.date);
  });
  $('#classDates').innerHTML = calendarDates.map((item) => `<div class="date-item session-${item.session}"><strong>S${item.session} · Seminar ${item.seminar}</strong><span>${item.date}</span></div>`).join('');
  const lockedCodes = apelCodes(); const options = DEFAULT_COURSES.filter((course) => !lockedCodes.has(course.code));
  $('#apelCourse').innerHTML = `<option value="">Choose a subject</option>${options.map((course) => `<option value="${course.code}">${course.code} - ${esc(course.name)}</option>`).join('')}`;
  const registration = apelCourses.length * 100; const successFees = apelCourses.filter((course) => course.success).length * 200;
  $('#apelTotal').textContent = `RM${registration + successFees}`; const apelGroups = apelCourses.reduce((groups, course) => { (groups[course.part] ||= []).push(course); return groups; }, {}); $('#apelList').innerHTML = Object.keys(apelGroups).sort((a, b) => Number(a) - Number(b)).map((part) => `<section class="apel-group"><header><h3>Group ${part} <span class="info-tip" tabindex="0" data-tip="Group is the APEL. C batch you plan to submit these subjects in.">i</span></h3><span>${apelGroups[part].length} subject${apelGroups[part].length === 1 ? '' : 's'}</span></header><div class="apel-cards">${apelGroups[part].map((course) => `<article class="apel-course"><div><p class="apel-code">${course.code}</p><h4>${esc(course.name)}</h4><p class="course-meta">${course.success ? 'Successful - RM300 total' : 'Result pending - RM100 currently'}</p></div><div class="row-actions"><button class="edit-button apel-success" data-id="${course.id}">${course.success ? 'Successful' : 'Mark successful'}</button><button class="delete-button apel-delete" data-id="${course.id}">Remove</button></div></article>`).join('')}</div></section>`).join('');
  $('#apelEmpty').style.display = apelCourses.length ? 'none' : 'block'; document.querySelectorAll('.apel-success').forEach((button) => button.onclick = () => { const course = apelCourses.find((item) => item.id === button.dataset.id); course.success = !course.success; persistApel(); render(); }); document.querySelectorAll('.apel-delete').forEach((button) => button.onclick = () => { const index = apelCourses.findIndex((item) => item.id === button.dataset.id); apelCourses.splice(index, 1); persistApel(); render(); });
  $('#alerts').innerHTML = warnings().map((message, index) => `<div class="alert ${index === 0 && total > 16 ? 'warning' : ''}">${message}</div>`).join('');
  const currentPart = Number(localStorage.getItem('uitm-current-part') || 3);
  const previousCourses = completedCourses.filter((course) => typeof course.takenPart === 'number' && course.takenPart < currentPart);
  const currentCourses = completedCourses.filter((course) => course.takenPart === currentPart);
  const exemptionCourses = completedCourses.filter((course) => course.takenPart === 'credit exemption');
  const progressRows = (courses, label) => courses.length ? courses.map((course) => `<article class="progress-row"><div><strong>${esc(course.code)}</strong><p>${esc(course.name)}</p></div><span>${course.credits} cr</span></article>`).join('') : `<p class="progress-empty">No subjects in ${label} yet.</p>`;
  $('#currentPart').value = currentPart; $('#currentPartTitle').textContent = `Semester ${currentPart}`;
  $('#previousCourses').innerHTML = progressRows(previousCourses, 'previous semesters'); $('#currentCourses').innerHTML = progressRows(currentCourses, `Semester ${currentPart}`); $('#exemptionCourses').innerHTML = progressRows(exemptionCourses, 'credit exemption');
  $('#previousCount').textContent = previousCourses.length; $('#currentCount').textContent = currentCourses.length; $('#exemptionCount').textContent = exemptionCourses.length;
  $('#completedCredits').textContent = `${completedCourses.reduce((sum, course) => sum + Number(course.credits), 0)} credits`;
  const timetableSlots = [
    { start: '08:30', end: '10:30', label: '8:30–10:30' },
    { start: '10:30', end: '12:30', label: '10:30–12:30' },
    { start: '12:30', end: '14:30', label: '12:30–2:30', recess: true },
    { start: '14:30', end: '16:30', label: '2:30–4:30' },
    { start: '16:30', end: '18:30', label: '4:30–6:30' }
  ];
  timetableSlots.forEach((slot) => { slot.label = slot.label.replace(/[^0-9:]/g, '-').replace(/-+/g, '-'); });
  const courseCard = (course) => `<article class="timetable-course ${course.session === 'both' ? 'both' : ''}"><strong>${esc(course.code || course.name)}</strong><span>${esc(course.code ? course.name : '')}</span><small>${esc(course.room || 'Room TBC')}</small></article>`;
  const timetable = (selectedCourses) => {
    const cell = (session, slot) => {
      if (slot.recess) return `<div class="timetable-cell recess"><span>Recess</span></div>`;
      const matches = selectedCourses.filter((course) => (course.session === session || course.session === 'both') && course.start === slot.start && course.end === slot.end);
      const offGrid = selectedCourses.filter((course) => (course.session === session || course.session === 'both') && !timetableSlots.some((item) => !item.recess && item.start === course.start && item.end === course.end));
      return `<div class="timetable-cell">${matches.map(courseCard).join('')}${slot === timetableSlots[0] ? offGrid.map(course => `<p class="off-grid">${esc(course.code || course.name)}: ${formatTime(course.start)}–${formatTime(course.end)}</p>`).join('') : ''}</div>`;
    };
    return `<div class="timetable-scroll"><div class="timetable" aria-label="Sunday semester timetable"><div class="timetable-head timetable-corner">Session</div>${timetableSlots.map((slot) => `<div class="timetable-head ${slot.recess ? 'recess' : ''}">${slot.label}</div>`).join('')}${['1', '2'].map((session) => `<div class="timetable-session">Session ${session}</div>${timetableSlots.map((slot) => cell(session, slot)).join('')}`).join('')}</div></div>`;
  };
  // One <details> per semester; name= makes it an accordion, and the open one is the active semester.
  $('#semesterPlans').innerHTML = state.semesters.map((term, index) => ({ term, index })).sort((a, b) => partNumber(a.term) - partNumber(b.term)).map(({ term, index }) => {
    const selected = term.courses.filter((course) => course.selected).sort((a, b) => a.start.localeCompare(b.start));
    const placed = selected.filter((course) => !course.tbc); const pending = selected.filter((course) => course.tbc);
    return `<details class="semester-plan" name="semester-plans" data-index="${index}" ${index === state.active ? 'open' : ''}><summary><strong>${esc(term.name)}${partNumber(term) === currentPart ? ' <em class="active-pill">Active</em>' : ''}</strong><span>${credits(term)} / 16 cr · ${selected.length} class${selected.length === 1 ? '' : 'es'}</span></summary><div class="plan-body">${placed.length ? timetable(placed) : pending.length ? '' : '<div class="empty-state">No selected classes in this semester yet.<br />Add a subject and choose its session and timetable slot.</div>'}${pending.length ? `<p class="plan-tbc"><b>Time TBC</b>${pending.map((course) => esc(course.code || course.name)).join(' · ')}</p>` : ''}<div class="plan-actions"><button class="text-button change-part" type="button" data-index="${index}">Change semester number</button></div></div></details>`;
  }).join('');
  document.querySelectorAll('.semester-plan').forEach((plan) => plan.ontoggle = () => {
    // Toggle events arrive after the fact; one from a panel a later render already replaced must not flip the active semester back.
    const index = Number(plan.dataset.index);
    if (plan.open && plan.isConnected && index !== state.active) { state.active = index; render(); $(`.semester-plan[data-index="${index}"] summary`).focus({ preventScroll: true }); }
  });
  document.querySelectorAll('.change-part').forEach((button) => button.onclick = () => {
    const index = Number(button.dataset.index); const part = askPart('Change to which semester number? (1-11)', partNumber(state.semesters[index]) || '');
    if (!part) return; const name = `Semester ${part}`;
    if (state.semesters.some((term, i) => i !== index && partNumber(term) === part)) { alert(`${name} already has a plan.`); return; }
    state.semesters[index].name = name; persist(); render();
  });
  const list = $('#courseList'); list.innerHTML = '';
  active.courses.forEach((course, index) => {
    const node = $('#courseTemplate').content.firstElementChild.cloneNode(true); const isApel = lockedCodes.has(course.code); node.classList.toggle('selected', course.selected); node.classList.toggle('apel-locked', isApel);
    node.querySelector('.course-number span').textContent = index + 1; node.querySelector('.course-name strong').textContent = course.name; node.querySelector('.course-code').textContent = course.code || '—';
    node.querySelector('.course-meta').textContent = course.tbc ? 'Sunday timetable details to be confirmed' : `Sunday / ${course.session === 'both' ? 'Both sessions' : `Session ${course.session}`} / ${formatTime(course.start)}-${formatTime(course.end)}${course.room ? ` / ${course.room}` : ''}`;
    node.querySelector('.course-credit').textContent = `${course.credits} cr`; node.querySelector('.course-part').textContent = course.part ? `Semester ${course.part}` : '—'; node.querySelector('.course-notes').textContent = course.notes || (isApel ? 'APEL. C' : course.type);
    node.querySelector('.course-select').disabled = isApel; node.querySelector('.course-select').onclick = () => { if (!isApel) { course.selected = !course.selected; persist(); render(); } };
    node.querySelector('.edit-button').onclick = () => edit(course);
    node.querySelector('.delete-button').onclick = () => { active.courses = active.courses.filter((item) => item.id !== course.id); persist(); render(); };
    list.append(node);
  });
  $('#coursesEmpty').style.display = active.courses.length ? 'none' : 'block'; $('#courseCount').textContent = `${active.courses.length} subject${active.courses.length === 1 ? '' : 's'}`;
}
function edit(course) {
  $('#courseId').value = course.id; $('#courseName').value = course.name; $('#courseCode').value = course.code; $('#courseCredits').value = course.credits; $('#courseType').value = course.type; $('#courseSession').value = course.session; $('#courseStart').value = course.start; $('#courseEnd').value = course.end; $('#courseRoom').value = course.room; $('#courseNotes').value = course.notes || ''; $('#courseSelected').checked = course.selected;
  $('#courseForm .primary-button').textContent = 'Save changes'; $('#cancelEdit').classList.remove('hidden'); $('#courseForm').scrollIntoView({ behavior: 'smooth' });
}
$('#courseForm').onsubmit = (event) => {
  event.preventDefault(); const value = (id) => $(id).value.trim();
  const course = { id: value('#courseId') || crypto.randomUUID(), name: value('#courseName'), code: value('#courseCode'), credits: Number(value('#courseCredits')), type: value('#courseType'), session: value('#courseSession'), start: value('#courseStart'), end: value('#courseEnd'), room: value('#courseRoom'), notes: value('#courseNotes'), selected: $('#courseSelected').checked };
  if (course.end <= course.start) { alert('End time must be later than start time.'); return; }
  const index = semester().courses.findIndex((item) => item.id === course.id); if (index >= 0) semester().courses[index] = course; else semester().courses.push(course);
  persist(); $('#courseForm').reset(); $('#courseCredits').value = 3; $('#courseStart').value = '08:30'; $('#courseEnd').value = '10:30'; $('#courseSelected').checked = true; $('#courseForm .primary-button').textContent = 'Add subject'; $('#cancelEdit').classList.add('hidden'); render();
};
$('#apelForm').onsubmit = (event) => {
  event.preventDefault(); const code = $('#apelCourse').value; const source = DEFAULT_COURSES.find((course) => course.code === code);
  if (!source) return; apelCourses.push({ id: crypto.randomUUID(), code: source.code, name: source.name, part: Number($('#apelPart').value), success: false });
  state.semesters.forEach((term) => term.courses.forEach((course) => { if (course.code === code) course.selected = false; })); persist(); persistApel(); event.target.reset(); render();
};
$('#cancelEdit').onclick = () => { $('#courseForm').reset(); $('#courseId').value = ''; $('#courseCredits').value = 3; $('#courseStart').value = '08:30'; $('#courseEnd').value = '10:30'; $('#courseSelected').checked = true; $('#courseForm .primary-button').textContent = 'Add subject'; $('#cancelEdit').classList.add('hidden'); };
$('#currentPart').onchange = (event) => { const part = Math.max(1, Math.min(11, Number(event.target.value) || 3)); localStorage.setItem('uitm-current-part', String(part)); persistProgress(); openCurrentSemester(); render(); };
$('#courseStart').onchange = (event) => { const ends = { '08:30': '10:30', '10:30': '12:30', '14:30': '16:30', '16:30': '18:30' }; $('#courseEnd').value = ends[event.target.value]; };
$('#newSemester').onclick = () => {
  const part = askPart('Which semester number? (1-11)', Number(localStorage.getItem('uitm-current-part') || 3) + 1);
  if (!part) return;
  const name = `Semester ${part}`; const existing = state.semesters.findIndex((term) => partNumber(term) === part);
  if (existing >= 0) state.active = existing;
  else { state.semesters.push({ id: crypto.randomUUID(), name, courses: DEFAULT_COURSES.map((course) => ({ ...course, id: crypto.randomUUID() })) }); state.active = state.semesters.length - 1; persist(); }
  render();
};
$('#sheetSync').onclick = openSheetPanel;
$('#sheetPush').onclick = () => databaseSync('push');
$('#sheetPull').onclick = () => databaseSync('pull');
$('#sheetUrl').oninput = () => { const url = $('#sheetUrl').value.trim(); if (/^https:\/\/script\.google\.com\//.test(url)) localStorage.setItem('uitm-sheet-url', url); };
$('#saveSheetUrl').onclick = () => { const url = $('#sheetUrl').value.trim(); if (!/^https:\/\/script\.google\.com\//.test(url)) { setSyncStatus('Use the deployed Google Apps Script URL that starts with https://script.google.com/.'); return; } localStorage.setItem('uitm-sheet-url', url); setSyncStatus('Connection saved on this device. Back up to create or update your database.'); };
// Setup link: open the site once per device with #sheet=<exec URL>. The hash never reaches the server or the repo.
const linkedSheet = new URLSearchParams(location.hash.slice(1)).get('sheet');
if (linkedSheet) {
  history.replaceState(null, '', location.pathname + location.search);
  if (/^https:\/\/script\.google\.com\//.test(linkedSheet)) { localStorage.setItem('uitm-sheet-url', linkedSheet); openSheetPanel(); setSyncStatus('Connection saved from your setup link. Tap Restore to load your Sheet.'); }
}
render();
