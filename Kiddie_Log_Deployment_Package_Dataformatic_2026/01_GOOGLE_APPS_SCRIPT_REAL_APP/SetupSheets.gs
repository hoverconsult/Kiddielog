/**
 * Mobile-compliant export note:
 * Backend Apps Script logic preserved. Mobile responsiveness is handled by Index.html and launcher UI files.
 */

/**
 * SetupSheets.gs  (v3 - delegate registry + branding config)
 * Run setupAllSheets() once. Run seedRansfordMensah() to insert demo data.
 */

function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _setupConfig(ss);
  _setupParentRegistry(ss);
  _setupChildRegistry(ss);
  _setupDelegateRegistry(ss);
  _setupAttendanceLog(ss);
  _setupLiveCheckIn(ss);
  _setupLiveCheckOut(ss);
  _setupDashboard(ss);
  _setupEmailLog(ss);
  SpreadsheetApp.getUi().alert(' All sheets set up successfully.');
}

function _getOrCreate(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function _setHeaders(sheet, headers) {
  const r = sheet.getRange(1, 1, 1, headers.length);
  r.setValues([headers]).setFontWeight('bold').setBackground('#d9ead3');
  sheet.setFrozenRows(1);
}

// --- CONFIG ------------------------------------------------------------------

function _setupConfig(ss) {
  const sheet = _getOrCreate(ss, 'CONFIG');
  if (sheet.getLastRow() > 0) return;
  const rows = [
    ['KEY',                   'VALUE',                    'DESCRIPTION'],
    ['CHURCH_NAME',           'Adenta Baptist Church',    'Shown in header and emails'],
    ['SERVICE_NAME',          'Sunday Children Service',  'Service label in emails'],
    ['CODE_PREFIX',           'ABC',                      'Prefix for all generated codes'],
    ['NEXT_PARENT_SERIAL',    1,                          'Auto-incremented - do not edit'],
    ['NEXT_DELEGATE_SERIAL',  1,                          'Auto-incremented - do not edit'],
    ['ADMIN_EMAIL',           'admin@youremail.com',      'Receives all transaction emails'],
    ['EMAIL_NOTIFICATIONS',   'TRUE',                     'TRUE or FALSE'],
    ['TIMEZONE',              'Africa/Accra',             'IANA timezone string'],
    ['LOGO_URL',              '',                         'Public URL of church/school logo image'],
    ['BRAND_COLOUR',          '#0c5a43',                  'Hex colour for header and buttons'],
  ];
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#d9ead3');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
}

// --- PARENT_REGISTRY ---------------------------------------------------------

function _setupParentRegistry(ss) {
  const sheet = _getOrCreate(ss, 'Parent_Registry');
  if (sheet.getLastRow() > 0) return;
  _setHeaders(sheet, [
    'Registered_At','Parent_Code','Parent_Name','Phone','Email',
    'Alt_Pickup_Name','Alt_Pickup_Phone','Relationship',
    'Child_Count','Status','Consent','Notes','Photo_URL'
  ]);
  sheet.autoResizeColumns(1, 13);
}

// --- CHILD_REGISTRY ----------------------------------------------------------

function _setupChildRegistry(ss) {
  const sheet = _getOrCreate(ss, 'Child_Registry');
  if (sheet.getLastRow() > 0) return;
  _setHeaders(sheet, [
    'Parent_Code','Child_ID','Child_Name','Age','Gender',
    'Group','Medical_Note','Special_Instructions','Active','Photo_URL'
  ]);
  sheet.autoResizeColumns(1, 10);
}

// --- DELEGATE_REGISTRY -------------------------------------------------------

function _setupDelegateRegistry(ss) {
  const sheet = _getOrCreate(ss, 'Delegate_Registry');
  if (sheet.getLastRow() > 0) return;
  _setHeaders(sheet, [
    'Delegate_Code','Parent_Code','Delegate_Name','Phone',
    'Authorised_ChildIDs','Photo_URL','Registered_At','Notes','Active'
  ]);
  sheet.autoResizeColumns(1, 9);
}

// --- ATTENDANCE_LOG ----------------------------------------------------------

function _setupAttendanceLog(ss) {
  const sheet = _getOrCreate(ss, 'Attendance_Log');
  if (sheet.getLastRow() > 0) return;
  _setHeaders(sheet, [
    'Transaction_ID','Timestamp','Date','Action',
    'Parent_Code','Parent_Name','Parent_Email','Parent_Phone',
    'Child_ID','Child_Name','Confirmed','Submitted_By',
    'Service_Date','Notes','Pickup_Person','Delegate_Code','Col17'
  ]);
  sheet.autoResizeColumns(1, 17);
}

// --- LIVE VIEWS --------------------------------------------------------------

function _setupLiveCheckIn(ss) {
  const sheet = _getOrCreate(ss, 'Live_CheckIn');
  sheet.clearContents();
  _setHeaders(sheet, ['Date','Child_ID','Child_Name','Parent_Code','Parent_Name','Submitted_By','Pickup_Person','Notes','Timestamp']);
  sheet.getRange('A1').setNote('Auto-refreshed. Do not edit.');
}

function _setupLiveCheckOut(ss) {
  const sheet = _getOrCreate(ss, 'Live_CheckOut');
  sheet.clearContents();
  _setHeaders(sheet, ['Date','Child_ID','Child_Name','Parent_Code','Parent_Name','Submitted_By','Pickup_Person','Notes','Timestamp']);
  sheet.getRange('A1').setNote('Auto-refreshed. Do not edit.');
}

// --- DASHBOARD ---------------------------------------------------------------

function _setupDashboard(ss) {
  const sheet = _getOrCreate(ss, 'Dashboard');
  sheet.clearContents();
  sheet.getRange('A1').setValue('CHILDREN SERVICE ATTENDANCE DASHBOARD');
  sheet.getRange('A1:C1').merge().setFontWeight('bold').setFontSize(14).setBackground('#08233b').setFontColor('#ffffff');
  const rows = [
    ['',''],['METRIC','VALUE'],
    ["Today's Date",             '=TEXT(TODAY(),"dddd, d MMMM yyyy")'],
    ['Total Check-Ins Today',    '=COUNTIFS(Attendance_Log!C:C,TEXT(TODAY(),"yyyy-MM-dd"),Attendance_Log!D:D,"CHECK_IN")'],
    ['Total Check-Outs Today',   '=COUNTIFS(Attendance_Log!C:C,TEXT(TODAY(),"yyyy-MM-dd"),Attendance_Log!D:D,"CHECK_OUT")'],
    ['Still Checked In',         '=D4-D5'],['',''],
    ['All-Time Check-Ins',       '=COUNTIF(Attendance_Log!D:D,"CHECK_IN")'],
    ['All-Time Check-Outs',      '=COUNTIF(Attendance_Log!D:D,"CHECK_OUT")'],
    ['Registered Parents',       '=COUNTA(Parent_Registry!B:B)-1'],
    ['Registered Children',      '=COUNTA(Child_Registry!B:B)-1'],
    ['Active Delegates',         '=COUNTIF(Delegate_Registry!I:I,TRUE)'],
    ['Active Families',          '=COUNTIF(Parent_Registry!J:J,"ACTIVE")'],
  ];
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  sheet.getRange(3, 1, 1, 2).setFontWeight('bold').setBackground('#d9ead3');
  sheet.autoResizeColumns(1, 2);
}

// --- EMAIL_LOG ---------------------------------------------------------------

function _setupEmailLog(ss) {
  const sheet = _getOrCreate(ss, 'Email_Log');
  if (sheet.getLastRow() > 0) return;
  _setHeaders(sheet, ['Timestamp','Reference','Recipient','Subject','Status','Error_Message']);
  sheet.autoResizeColumns(1, 6);
}

// --- LIVE REFRESH ------------------------------------------------------------

function refreshLiveViews() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = ss.getSheetByName('Attendance_Log');
  const today = Utilities.formatDate(new Date(), 'Africa/Accra', 'yyyy-MM-dd');
  if (!log) return;
  const data = log.getDataRange().getValues();
  const checkins = [], checkouts = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) !== today) continue;
    const row = [data[i][2],data[i][8],data[i][9],data[i][4],data[i][5],data[i][11],data[i][14],data[i][13],data[i][1]];
    if (String(data[i][3]) === 'CHECK_IN')  checkins.push(row);
    if (String(data[i][3]) === 'CHECK_OUT') checkouts.push(row);
  }
  _writeToLiveSheet(ss, 'Live_CheckIn',  checkins);
  _writeToLiveSheet(ss, 'Live_CheckOut', checkouts);
}

function _writeToLiveSheet(ss, name, rows) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return;
  const last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last-1, 9).clearContent();
  if (rows.length) sheet.getRange(2, 1, rows.length, 9).setValues(rows);
}

function installRefreshTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'refreshLiveViews') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshLiveViews').timeBased().everyMinutes(5).create();
  SpreadsheetApp.getUi().alert(' Live view refresh trigger installed (every 5 minutes).');
}

// --- SEED: Ransford Mensah ----------------------------------------------------

function seedRansfordMensah() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName('Parent_Registry');
  const cSheet = ss.getSheetByName('Child_Registry');
  const cfgSheet = ss.getSheetByName('CONFIG');
  if (!pSheet || !cSheet) { SpreadsheetApp.getUi().alert(' Run setupAllSheets() first.'); return; }

  const cfgVals = cfgSheet.getRange(1, 1, 100, 2).getValues();
  let prefix = 'ABC', serial = 1, serialRow = -1;
  cfgVals.forEach((row, i) => {
    if (String(row[0]).trim() === 'CODE_PREFIX')        prefix = String(row[1]).trim();
    if (String(row[0]).trim() === 'NEXT_PARENT_SERIAL') { serial = Number(row[1]); serialRow = i + 1; }
  });

  const parentCode = prefix + '-' + String(serial).padStart(5, '0');
  if (serialRow > 0) cfgSheet.getRange(serialRow, 2).setValue(serial + 1);

  const now = Utilities.formatDate(new Date(), 'Africa/Accra', 'yyyy-MM-dd HH:mm:ss');
  const PP = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSI2MCIgZmlsbD0iIzBjNWE0MyIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDQiIHI9IjIyIiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjkiLz48ZWxsaXBzZSBjeD0iNjAiIGN5PSI5NSIgcng9IjM0IiByeT0iMjIiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuOSIvPjx0ZXh0IHg9IjYwIiB5PSIxMTYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjMGM1YTQzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QQVJFTlQ8L3RleHQ+PC9zdmc+';
  const CP = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSI2MCIgZmlsbD0iIzA4MjMzYiIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDQiIHI9IjIwIiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjkiLz48ZWxsaXBzZSBjeD0iNjAiIGN5PSI5MyIgcng9IjMwIiByeT0iMjAiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuOSIvPjx0ZXh0IHg9IjYwIiB5PSIxMTQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjMDgyMzNiIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DSElMRDwvdGV4dD48L3N2Zz4=';

  pSheet.appendRow([now, parentCode, 'Ransford Mensah', '0244358113', 'eddyran2008@gmail.com', '', '', '', 3, 'ACTIVE', 'YES', '', PP]);

  const kids = [['Peniel Eddy Mensah'],['Reuel Eddy Mensah'],['Lael Eddy Mensah']];
  const childRows = kids.map((k, i) => [parentCode, parentCode+'-CH'+String(i+1).padStart(2,'0'), k[0], '', '', 'Children Church', '', '', true, CP]);
  cSheet.getRange(cSheet.getLastRow()+1, 1, childRows.length, childRows[0].length).setValues(childRows);

  SpreadsheetApp.getUi().alert(
    ' Ransford Mensah registered.\nParent Code: ' + parentCode +
    '\n\nChildren:\n- Peniel Eddy Mensah (' + parentCode + '-CH01)\n- Reuel Eddy Mensah (' + parentCode + '-CH02)\n- Lael Eddy Mensah (' + parentCode + '-CH03)'
  );
}

// --- v4 ADDITIONS -------------------------------------------------------------

/**
 * addV4Config()
 * Run once after setupAllSheets() to add new CONFIG keys for v4.
 */
function addV4Config() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
  if (!sheet) { SpreadsheetApp.getUi().alert('Run setupAllSheets() first.'); return; }

  const vals = sheet.getRange(1, 1, 100, 1).getValues().map(r => String(r[0]).trim());
  const add = [];
  if (!vals.includes('ADMIN_PIN'))    add.push(['ADMIN_PIN',    '8113',    'PIN to access Admin approval tab']);
  if (!vals.includes('LOGO_URL'))     add.push(['LOGO_URL',     '',        'Public URL of church logo image']);
  if (!vals.includes('BRAND_COLOUR')) add.push(['BRAND_COLOUR', '#8b1a1a', 'Hex brand colour for header and buttons']);

  if (add.length) {
    const last = sheet.getLastRow();
    sheet.getRange(last + 1, 1, add.length, 3).setValues(add);
    SpreadsheetApp.getUi().alert(' Added ' + add.length + ' new CONFIG row(s).');
  } else {
    SpreadsheetApp.getUi().alert(' CONFIG already up to date.');
  }
}

/**
 * addRegStatusDropdown()
 * Adds PENDING_APPROVAL / APPROVED / REJECTED / SUSPENDED dropdown
 * to the Reg_Status (col 10) of Parent_Registry.
 */
function addRegStatusDropdown() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Parent_Registry');
  if (!sheet) { SpreadsheetApp.getUi().alert('Parent_Registry not found.'); return; }

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ACTIVE'], true)
    .setAllowInvalid(false)
    .build();

  // Apply to col 10 (J), rows 2-500
  sheet.getRange(2, 10, 499, 1).setDataValidation(rule);

  // Header rename
  sheet.getRange(1, 10).setValue('Reg_Status');

  SpreadsheetApp.getUi().alert(' Reg_Status dropdown added to Parent_Registry.');
}

/**
 * installApprovalTrigger()
 * Watches Parent_Registry col 10 for changes to APPROVED.
 * Fires approvalSheetTrigger() - sends approval email via sheet edit.
 * NOTE: The web app admin tab calls approveRegistration() directly,
 * so this trigger is a sheet-side backup for admins working in the spreadsheet.
 */
function installApprovalTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'approvalSheetTrigger') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('approvalSheetTrigger')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  SpreadsheetApp.getUi().alert(' Approval sheet trigger installed.');
}

/**
 * approvalSheetTrigger(e)
 * Called automatically when admin edits the spreadsheet.
 * Only fires when col 10 of Parent_Registry is changed to APPROVED or REJECTED.
 */
function approvalSheetTrigger(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Parent_Registry') return;
  if (e.range.getColumn() !== 10) return;

  const newVal = String(e.value || '').trim().toUpperCase().replace(/\s+/g, '_');
  const row    = e.range.getRow();
  if (row < 2) return;

  const parentCode = String(sheet.getRange(row, 2).getValue() || '').trim();
  if (!parentCode) return;

  if (newVal === 'APPROVED') {
    approveRegistration(parentCode);
  } else if (newVal === 'REJECTED') {
    rejectRegistration(parentCode, 'Reviewed by administrator.');
  }
}

/**
 * runV4Setup()
 * Convenience: run all v4 additions in one call.
 */
function runV4Setup() {
  addV4Config();
  addRegStatusDropdown();
  installApprovalTrigger();
  SpreadsheetApp.getUi().alert(' v4 setup complete.\n\nRun installRefreshTrigger() separately if needed.');
}
