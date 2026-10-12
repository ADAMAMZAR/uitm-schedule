/*
 * UiTM Sunday Studio sync endpoint
 * 1. Create an empty Google Sheet.
 * 2. Extensions > Apps Script, paste this file, and replace SHEET_ID.
 * 3. Deploy > New deployment > Web app.
 * 4. Execute as: Me. Who has access: Anyone with the link.
 */
const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const TAB_NAME = 'Planner backup';

function doPost(e) {
  const request = JSON.parse(e.postData.contents || '{}');
  if (!request.deviceId || !request.data) return json({ error: 'Invalid request.' });

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const row = values.findIndex((item, index) => index > 0 && item[0] === request.deviceId);
  const existing = row > 0 ? { data: JSON.parse(values[row][1]), updatedAt: values[row][2] } : null;
  const localTime = new Date(request.data.updatedAt || 0).getTime();
  const remoteTime = existing ? new Date(existing.updatedAt || 0).getTime() : 0;

  if (!existing || localTime >= remoteTime) {
    const payload = JSON.stringify(request.data);
    const updatedAt = request.data.updatedAt || new Date().toISOString();
    if (row > 0) sheet.getRange(row + 1, 2, 1, 2).setValues([[payload, updatedAt]]);
    else sheet.appendRow([request.deviceId, payload, updatedAt]);
    return json({ ok: true, data: request.data });
  }
  return json({ ok: true, data: existing.data });
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(TAB_NAME);
  if (!sheet) { sheet = spreadsheet.insertSheet(TAB_NAME); sheet.appendRow(['Device ID', 'Planner data', 'Last updated']); sheet.setFrozenRows(1); }
  return sheet;
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
