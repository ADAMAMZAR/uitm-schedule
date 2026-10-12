/* UiTM Sunday Studio — Google Sheets database endpoint
 * Paste into Extensions > Apps Script for your own Google Sheet, set SHEET_ID,
 * then deploy as a Web App. The app can Back up (write) or Restore (read).
 */
const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const TABLES = {
  semesters: ['id', 'name', 'sort_order'],
  subjects: ['semester_id', 'id', 'subject_name', 'course_code', 'credits', 'type', 'session', 'start_time', 'end_time', 'room', 'notes', 'selected', 'tbc', 'part'],
  apel_c: ['id', 'course_code', 'subject_name', 'part', 'success'],
  progress: ['course_code', 'course_name', 'credit_hour', 'taken_part'],
  settings: ['key', 'value']
};

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents || '{}');
    ensureTables();
    if (request.action === 'pull') return json({ ok: true, data: readData() });
    if (request.action === 'push' && request.data) { writeData(request.data); return json({ ok: true, data: readData() }); }
    return json({ ok: false, error: 'Use action pull or push.' });
  } catch (error) { return json({ ok: false, error: error.message }); }
}

function ensureTables() {
  const book = SpreadsheetApp.openById(SHEET_ID);
  Object.keys(TABLES).forEach((name) => {
    let sheet = book.getSheetByName(name);
    if (!sheet) { sheet = book.insertSheet(name); sheet.getRange(1, 1, 1, TABLES[name].length).setValues([TABLES[name]]); sheet.setFrozenRows(1); sheet.getRange(1, 1, 1, TABLES[name].length).setFontWeight('bold'); }
  });
}

function table(name) { return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name); }
function replaceRows(name, rows) {
  const sheet = table(name); const headers = TABLES[name];
  sheet.clearContents(); sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1); sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold'); sheet.autoResizeColumns(1, headers.length);
}
function rows(name) {
  const sheet = table(name); const values = sheet.getDataRange().getValues(); const headers = values.shift() || TABLES[name];
  return values.filter((row) => row.some((cell) => cell !== '')).map((row) => headers.reduce((item, key, index) => { item[key] = row[index]; return item; }, {}));
}
function bool(value) { return value === true || String(value).toLowerCase() === 'true'; }
function num(value, fallback) { const result = Number(value); return Number.isFinite(result) ? result : fallback; }

function writeData(data) {
  const semesters = Array.isArray(data.semesters) ? data.semesters : [];
  replaceRows('semesters', semesters.map((term, index) => [term.id, term.name, index]));
  replaceRows('subjects', semesters.flatMap((term) => (term.courses || []).map((course) => [term.id, course.id, course.name, course.code, course.credits, course.type, course.session, course.start, course.end, course.room, course.notes || '', course.selected, course.tbc || false, course.part || ''])));
  replaceRows('apel_c', (data.apelCourses || []).map((course) => [course.id, course.code, course.name, course.part, course.success]));
  replaceRows('progress', (data.completedCourses || []).map((course) => [course.code, course.name, course.credits, course.takenPart]));
  replaceRows('settings', [['active_semester', data.active || 0], ['current_part', data.currentPart || 3], ['updated_at', new Date().toISOString()]]);
}

function readData() {
  const settingRows = rows('settings'); const settings = settingRows.reduce((all, item) => { all[item.key] = item.value; return all; }, {});
  const subjects = rows('subjects');
  const semesters = rows('semesters').sort((a, b) => num(a.sort_order, 0) - num(b.sort_order, 0)).map((term) => ({
    id: String(term.id), name: String(term.name), courses: subjects.filter((course) => String(course.semester_id) === String(term.id)).map((course) => ({
      id: String(course.id), name: String(course.subject_name), code: String(course.course_code), credits: num(course.credits, 0), type: String(course.type || 'Core'), session: String(course.session || '1'), start: String(course.start_time || '08:30'), end: String(course.end_time || '10:30'), room: String(course.room || ''), notes: String(course.notes || ''), selected: bool(course.selected), tbc: bool(course.tbc), part: course.part === '' ? undefined : num(course.part, course.part)
    }))
  }));
  return {
    semesters,
    apelCourses: rows('apel_c').map((course) => ({ id: String(course.id), code: String(course.course_code), name: String(course.subject_name), part: num(course.part, 1), success: bool(course.success) })),
    completedCourses: rows('progress').map((course) => ({ code: String(course.course_code), name: String(course.course_name), credits: num(course.credit_hour, 0), takenPart: String(course.taken_part).toLowerCase() === 'credit exemption' ? 'credit exemption' : num(course.taken_part, 1) })),
    active: num(settings.active_semester, 0), currentPart: num(settings.current_part, 3), updatedAt: String(settings.updated_at || '')
  };
}

function json(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
