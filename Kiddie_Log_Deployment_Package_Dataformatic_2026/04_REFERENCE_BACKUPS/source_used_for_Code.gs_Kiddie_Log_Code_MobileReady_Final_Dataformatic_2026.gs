/**
 * Mobile-compliant export note:
 * Backend Apps Script logic preserved. Mobile responsiveness is handled by Index.html and launcher UI files.
 */

/**
 * Code.gs  - Kiddie Log  (v4)
 * Evangel ICGC Children Service
 *
 * New in v4:
 *   - Registration status: PENDING_APPROVAL (not ACTIVE) on submit
 *   - Welcome/pending email to parent on registration
 *   - Admin notification email on new registration
 *   - getPendingRegistrations() - admin queue
 *   - approveRegistration(parentCode) - sets APPROVED/ACTIVE, sends code email
 *   - rejectRegistration(parentCode, reason) - sets REJECTED, sends email
 *   - getAppConfig() now returns adminPin
 *   - lookupParent() blocks PENDING_APPROVAL and REJECTED
 */

const SHEET_NAMES = {
  config:    'CONFIG',
  parents:   'Parent_Registry',
  children:  'Child_Registry',
  delegates: 'Delegate_Registry',
  log:       'Attendance_Log',
  emailLog:  'Email_Log'
};

const PLACEHOLDER_PARENT   = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSI2MCIgZmlsbD0iIzhhMWExYSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDQiIHI9IjIyIiBmaWxsPSIjZjBkMDgwIiBvcGFjaXR5PSIwLjkiLz48ZWxsaXBzZSBjeD0iNjAiIGN5PSI5NSIgcng9IjM0IiByeT0iMjIiIGZpbGw9IiNmMGQwODAiIG9wYWNpdHk9IjAuOSIvPjx0ZXh0IHg9IjYwIiB5PSIxMTYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjOGExYTFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QQVJFTlQ8L3RleHQ+PC9zdmc+';
const PLACEHOLDER_CHILD    = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSI2MCIgZmlsbD0iIzFhMGEwOCIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDQiIHI9IjIwIiBmaWxsPSIjYzk5MjJhIiBvcGFjaXR5PSIwLjkiLz48ZWxsaXBzZSBjeD0iNjAiIGN5PSI5MyIgcng9IjMwIiByeT0iMjAiIGZpbGw9IiNjOTkyMmEiIG9wYWNpdHk9IjAuOSIvPjx0ZXh0IHg9IjYwIiB5PSIxMTQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjMWEwYTA4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DSElMRDwvdGV4dD48L3N2Zz4=';
const PLACEHOLDER_DELEGATE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIHJ4PSI2MCIgZmlsbD0iIzJkMWEwZSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNDQiIHI9IjIxIiBmaWxsPSIjYzk5MjJhIiBvcGFjaXR5PSIwLjkiLz48ZWxsaXBzZSBjeD0iNjAiIGN5PSI5NCIgcng9IjMyIiByeT0iMjEiIGZpbGw9IiNjOTkyMmEiIG9wYWNpdHk9IjAuOSIvPjx0ZXh0IHg9IjYwIiB5PSIxMTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjMmQxYTBlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ERUxFR0FURSA8L3RleHQ+PC9zdmc+';

// --- Web App Entry ------------------------------------------------------------

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Kiddie Log - Evangel ICGC')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// --- Helpers -----------------------------------------------------------------

function getSpreadsheet_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet_(name) {
  const sh = getSpreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name);
  return sh;
}

function getConfig_() {
  const vals = getSheet_(SHEET_NAMES.config).getRange(1, 1, 100, 2).getValues();
  const cfg = {};
  vals.forEach(r => { if (r[0] && String(r[0]).trim() !== 'KEY') cfg[String(r[0]).trim()] = r[1]; });
  return cfg;
}

function now_() {
  const tz = getConfig_().TIMEZONE || 'Africa/Accra';
  const d = new Date();
  return {
    raw: d,
    timestamp: Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm:ss'),
    date:      Utilities.formatDate(d, tz, 'yyyy-MM-dd')
  };
}

function normalizeCode_(c) { return String(c || '').trim().toUpperCase(); }

function photoOrPlaceholder_(url, type) {
  const u = String(url || '').trim();
  if (u) return u;
  if (type === 'parent')   return PLACEHOLDER_PARENT;
  if (type === 'delegate') return PLACEHOLDER_DELEGATE;
  return PLACEHOLDER_CHILD;
}

// --- getAppConfig -------------------------------------------------------------

function getAppConfig() {
  const cfg = getConfig_();
  return {
    churchName:  cfg.CHURCH_NAME  || 'Evangel ICGC',
    serviceName: cfg.SERVICE_NAME || 'Sunday Children Service',
    logoUrl:     cfg.LOGO_URL     || '',
    brandColour: cfg.BRAND_COLOUR || '#8b1a1a',
    codePrefix:  cfg.CODE_PREFIX  || 'ABC',
    adminPin:    String(cfg.ADMIN_PIN || '8113')
  };
}

// --- Parent lookup -----------------------------------------------------------

function findParentByCode_(code) {
  const c = normalizeCode_(code);
  const data = getSheet_(SHEET_NAMES.parents).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizeCode_(data[i][1]) === c) {
      return {
        row: i + 1,
        parentCode:     data[i][1],
        parentName:     data[i][2],
        phone:          data[i][3],
        email:          data[i][4],
        altPickupName:  data[i][5],
        altPickupPhone: data[i][6],
        relationship:   data[i][7],
        childCount:     data[i][8],
        status:         data[i][9],
        consent:        data[i][10],
        notes:          data[i][11],
        photoUrl:       photoOrPlaceholder_(data[i][12], 'parent'),
        registeredAt:   data[i][0]
      };
    }
  }
  return null;
}

// --- Delegate lookup ---------------------------------------------------------

function findDelegateByCode_(code) {
  const c = normalizeCode_(code);
  const data = getSheet_(SHEET_NAMES.delegates).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizeCode_(data[i][0]) === c && data[i][8] === true) {
      return {
        delegateCode:  data[i][0],
        parentCode:    data[i][1],
        delegateName:  data[i][2],
        phone:         data[i][3],
        authorisedIds: String(data[i][4]).split(',').map(s => s.trim()).filter(Boolean),
        photoUrl:      photoOrPlaceholder_(data[i][5], 'delegate'),
        registeredAt:  data[i][6],
        notes:         data[i][7],
        active:        data[i][8]
      };
    }
  }
  return null;
}

// --- Children lookup ---------------------------------------------------------

function getChildrenByParentCode_(parentCode) {
  const c = normalizeCode_(parentCode);
  const data = getSheet_(SHEET_NAMES.children).getDataRange().getValues();
  const children = [];
  for (let i = 1; i < data.length; i++) {
    if (normalizeCode_(data[i][0]) === c && data[i][8] === true) {
      children.push({
        parentCode: data[i][0], childId: data[i][1], childName: data[i][2],
        age: data[i][3], gender: data[i][4], group: data[i][5],
        medicalNote: data[i][6], specialInstructions: data[i][7], active: data[i][8],
        photoUrl: photoOrPlaceholder_(data[i][9], 'child')
      });
    }
  }
  return children;
}

function getChildrenByIds_(childIds) {
  const all = getSheet_(SHEET_NAMES.children).getDataRange().getValues();
  const idSet = new Set(childIds.map(normalizeCode_));
  const children = [];
  for (let i = 1; i < all.length; i++) {
    if (idSet.has(normalizeCode_(all[i][1])) && all[i][8] === true) {
      children.push({
        parentCode: all[i][0], childId: all[i][1], childName: all[i][2],
        age: all[i][3], gender: all[i][4], group: all[i][5],
        medicalNote: all[i][6], specialInstructions: all[i][7], active: all[i][8],
        photoUrl: photoOrPlaceholder_(all[i][9], 'child')
      });
    }
  }
  return children;
}

function getTodayCheckedInChildren_(parentCode) {
  const c = normalizeCode_(parentCode);
  const today = now_().date;
  const log = getSheet_(SHEET_NAMES.log).getDataRange().getValues();
  const checkedIn = {}, checkedOut = {};
  for (let i = 1; i < log.length; i++) {
    if (normalizeCode_(log[i][4]) !== c || String(log[i][2]) !== today) continue;
    const action = String(log[i][3]), childId = String(log[i][8]);
    if (action === 'CHECK_IN')  checkedIn[childId]  = { childId, childName: log[i][9] };
    if (action === 'CHECK_OUT') checkedOut[childId] = true;
  }
  const photoMap = {};
  getChildrenByParentCode_(parentCode).forEach(ch => photoMap[ch.childId] = ch.photoUrl);
  return Object.keys(checkedIn).filter(id => !checkedOut[id])
    .map(id => ({ ...checkedIn[id], photoUrl: photoMap[id] || PLACEHOLDER_CHILD }));
}

// --- Exposed: lookupParent ----------------------------------------------------

function lookupParent(payload) {
  const code = normalizeCode_(payload.parentCode);
  const mode = payload.mode || 'CHECK_IN';
  const isDelegate = code.includes('-D-');

  if (isDelegate) {
    const delegate = findDelegateByCode_(code);
    if (!delegate) return { ok: false, message: 'Delegate code not found. Please verify and try again.' };
    const parent = findParentByCode_(delegate.parentCode);
    if (!parent) return { ok: false, message: 'Parent linked to this delegate could not be found.' };
    const st = String(parent.status).toUpperCase();
    if (st !== 'ACTIVE' && st !== 'APPROVED') return { ok: false, message: 'Parent account is not yet active. Please check approval status.' };
    let children = getChildrenByIds_(delegate.authorisedIds);
    if (mode === 'CHECK_OUT') {
      const ciIds = new Set(getTodayCheckedInChildren_(delegate.parentCode).map(c => c.childId));
      children = children.filter(c => ciIds.has(c.childId));
    }
    return { ok: true, mode, parent: { ...parent, isDelegate: true }, delegate, children };
  }

  const parent = findParentByCode_(code);
  if (!parent) return { ok: false, message: 'Code not found. Check for typos and try again.' };

  const st = String(parent.status).toUpperCase();
  if (st === 'PENDING_APPROVAL') return { ok: false, message: 'This registration is pending admin approval. You will receive an email once approved.' };
  if (st === 'REJECTED')         return { ok: false, message: 'This registration was not approved. Please contact the Children Service office.' };
  if (st === 'SUSPENDED')        return { ok: false, message: 'This account has been suspended. Please contact the Children Service office.' };
  if (st !== 'ACTIVE' && st !== 'APPROVED') return { ok: false, message: 'Account not active. Please contact the administrator.' };

  const children = mode === 'CHECK_OUT'
    ? getTodayCheckedInChildren_(code)
    : getChildrenByParentCode_(code);

  return { ok: true, mode, parent, delegate: null, children };
}

// --- Exposed: submitTransaction -----------------------------------------------

function submitTransaction(payload) {
  const action           = payload.action === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN';
  const parentCode       = normalizeCode_(payload.parentCode);
  const selectedChildIds = payload.selectedChildIds || [];
  const submittedBy      = payload.submittedBy || 'Children Service Leader';
  const pickupPerson     = payload.pickupPerson || '';
  const notes            = payload.notes || '';
  const delegateCode     = payload.delegateCode || '';

  if (!parentCode)              throw new Error('Parent code is required.');
  if (!selectedChildIds.length) throw new Error('Select at least one child.');

  const parent = findParentByCode_(parentCode);
  if (!parent) throw new Error('Parent code not found.');

  const children = action === 'CHECK_OUT'
    ? getTodayCheckedInChildren_(parentCode)
    : getChildrenByParentCode_(parentCode);

  const childMap = {};
  children.forEach(c => childMap[String(c.childId)] = c);

  const time = now_();
  const logSheet = getSheet_(SHEET_NAMES.log);
  const transactionId = action + '-' + parentCode + '-' + Date.now();
  const notesFinal = delegateCode ? '[DELEGATE: ' + delegateCode + '] ' + notes : notes;
  const rows = [];

  selectedChildIds.forEach(childId => {
    const child = childMap[String(childId)];
    if (!child) return;
    rows.push([
      transactionId, time.timestamp, time.date, action,
      parent.parentCode, parent.parentName, parent.email, parent.phone,
      child.childId, child.childName, true,
      submittedBy, time.date, notesFinal, pickupPerson, delegateCode, ''
    ]);
  });

  if (!rows.length) throw new Error('No valid children found for selection.');
  logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

  const emailStatus = sendTransactionEmails_(transactionId, action, parent, rows, pickupPerson, notesFinal);
  return {
    ok: true,
    message: (action === 'CHECK_IN' ? 'Check-in' : 'Check-out') + ' recorded successfully.',
    transactionId, count: rows.length, emailStatus
  };
}

// --- Exposed: registerParentAndChildren (v4 - PENDING_APPROVAL) --------------

function registerParentAndChildren(parentData, childrenData) {
  const parentCode = generateParentCode_();
  const time       = now_();
  const cfg        = getConfig_();
  const churchName = cfg.CHURCH_NAME || 'Evangel ICGC';
  const adminEmail = cfg.ADMIN_EMAIL;

  // Write parent row - status = PENDING_APPROVAL
  getSheet_(SHEET_NAMES.parents).appendRow([
    time.timestamp, parentCode, parentData.parentName, parentData.phone, parentData.email,
    parentData.altPickupName || '', parentData.altPickupPhone || '', parentData.relationship || '',
    childrenData.length, 'PENDING_APPROVAL', parentData.consent || 'YES',
    parentData.notes || '', parentData.photoUrl || ''
  ]);

  // Write children
  const childRows = childrenData.filter(c => c.childName).map((child, i) => [
    parentCode, parentCode + '-CH' + String(i + 1).padStart(2, '0'),
    child.childName, child.age || '', child.gender || '', child.group || '',
    child.medicalNote || '', child.specialInstructions || '', true, child.photoUrl || ''
  ]);
  if (childRows.length) {
    const cs = getSheet_(SHEET_NAMES.children);
    cs.getRange(cs.getLastRow() + 1, 1, childRows.length, childRows[0].length).setValues(childRows);
  }

  const childNames = childrenData.filter(c => c.childName).map(c => '- ' + c.childName).join('\n');

  // Welcome email -> parent
  if (parentData.email) {
    try {
      MailApp.sendEmail(
        parentData.email,
        'Welcome to ' + churchName + ' Children Service - Registration Received',
        'Dear ' + parentData.parentName + ',\n\n' +
        'Thank you for registering with the ' + churchName + ' Children Service.\n\n' +
        'Your registration has been received and is currently under review.\n\n' +
        'Children registered:\n' + childNames + '\n\n' +
        'What happens next:\n' +
        '  - Our Children Service team will verify your details\n' +
        '  - You will receive a confirmation email with your unique Parent Code once approved\n' +
        '  - This usually takes less than 24 hours\n\n' +
        'If you have any questions, please call or speak to a Children Service Leader.\n\n' +
        'God bless you and your family.\n\n' +
        churchName + ' Children Service'
      );
      logEmail_(parentCode, parentData.email, 'Registration Received - Pending Approval', 'SENT', '');
    } catch (e) {
      logEmail_(parentCode, parentData.email, 'Registration Received - Pending Approval', 'FAILED', e.message);
    }
  }

  // Notification email -> admin
  if (adminEmail) {
    try {
      MailApp.sendEmail(
        adminEmail,
        churchName + ' - New Registration Pending Approval: ' + parentData.parentName,
        'A new family has registered and is awaiting your approval.\n\n' +
        'Parent Code    : ' + parentCode + '\n' +
        'Parent Name    : ' + parentData.parentName + '\n' +
        'Phone          : ' + (parentData.phone || 'N/A') + '\n' +
        'Email          : ' + (parentData.email || 'N/A') + '\n' +
        'Registered At  : ' + time.timestamp + '\n\n' +
        'Children:\n' + childNames + '\n\n' +
        'ACTION REQUIRED:\n' +
        '  - Open the Kiddie Log web app -> Admin tab\n' +
        '  - Review and approve or reject this registration\n\n' +
        'Or open Parent_Registry in the spreadsheet and change the Reg_Status to APPROVED.'
      );
      logEmail_(parentCode, adminEmail, 'New Registration Pending Approval', 'SENT', '');
    } catch (e) {
      logEmail_(parentCode, adminEmail, 'New Registration Pending Approval', 'FAILED', e.message);
    }
  }

  return parentCode;
}

// --- Exposed: getPendingRegistrations ----------------------------------------

function getPendingRegistrations() {
  const data = getSheet_(SHEET_NAMES.parents).getDataRange().getValues();
  const pending = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][9]).toUpperCase() !== 'PENDING_APPROVAL') continue;
    const parentCode = data[i][1];
    const children   = getChildrenByParentCode_(parentCode);
    pending.push({
      parentCode,
      parentName:   data[i][2],
      phone:        data[i][3],
      email:        data[i][4],
      relationship: data[i][7],
      childCount:   data[i][8],
      registeredAt: data[i][0],
      notes:        data[i][11],
      photoUrl:     photoOrPlaceholder_(data[i][12], 'parent'),
      children
    });
  }
  return pending;
}

// --- Exposed: approveRegistration --------------------------------------------

function approveRegistration(parentCode) {
  const code  = normalizeCode_(parentCode);
  const sheet = getSheet_(SHEET_NAMES.parents);
  const data  = sheet.getDataRange().getValues();
  const cfg   = getConfig_();
  const churchName = cfg.CHURCH_NAME || 'Evangel ICGC';

  for (let i = 1; i < data.length; i++) {
    if (normalizeCode_(data[i][1]) !== code) continue;

    // Set status to APPROVED (lookupParent accepts APPROVED or ACTIVE)
    sheet.getRange(i + 1, 10).setValue('APPROVED');

    const parentName  = data[i][2];
    const parentEmail = data[i][4];

    // Approval email -> parent with code
    if (parentEmail) {
      try {
        MailApp.sendEmail(
          parentEmail,
          churchName + ' - Registration Approved! Your Parent Code',
          'Dear ' + parentName + ',\n\n' +
          'Great news! Your registration with the ' + churchName + ' Children Service has been approved.\n\n' +
          'Your unique Parent Code is:\n\n' +
          '    ' + code + '\n\n' +
          'Please save this code carefully.\n' +
          'You will need it every time you drop off or pick up your child/children at our service.\n\n' +
          'How to use it:\n' +
          '  1. At the service desk, enter your Parent Code\n' +
          '  2. Your details and your children\'s photos will appear\n' +
          '  3. The service leader confirms and logs the drop-off or pickup\n\n' +
          'If you need someone else to collect your children, ask the service desk to register a Delegate for you.\n\n' +
          'Welcome to the ' + churchName + ' family!\n\n' +
          'God bless you.\n\n' +
          churchName + ' Children Service'
        );
        logEmail_(code, parentEmail, 'Registration Approved - Parent Code Issued', 'SENT', '');
      } catch (e) {
        logEmail_(code, parentEmail, 'Registration Approved - Parent Code Issued', 'FAILED', e.message);
      }
    }

    return { ok: true, message: parentName + ' approved. Parent code emailed.' };
  }

  return { ok: false, message: 'Parent code not found: ' + code };
}

// --- Exposed: rejectRegistration ---------------------------------------------

function rejectRegistration(parentCode, reason) {
  const code  = normalizeCode_(parentCode);
  const sheet = getSheet_(SHEET_NAMES.parents);
  const data  = sheet.getDataRange().getValues();
  const cfg   = getConfig_();
  const churchName = cfg.CHURCH_NAME || 'Evangel ICGC';

  for (let i = 1; i < data.length; i++) {
    if (normalizeCode_(data[i][1]) !== code) continue;

    sheet.getRange(i + 1, 10).setValue('REJECTED');

    const parentName  = data[i][2];
    const parentEmail = data[i][4];

    if (parentEmail) {
      try {
        MailApp.sendEmail(
          parentEmail,
          churchName + ' - Registration Update',
          'Dear ' + parentName + ',\n\n' +
          'We were unable to complete your registration with the ' + churchName + ' Children Service.\n\n' +
          (reason ? 'Reason: ' + reason + '\n\n' : '') +
          'Please contact a Children Service Leader for assistance.\n\n' +
          'God bless you.\n\n' +
          churchName + ' Children Service'
        );
        logEmail_(code, parentEmail, 'Registration Rejected', 'SENT', '');
      } catch (e) {
        logEmail_(code, parentEmail, 'Registration Rejected', 'FAILED', e.message);
      }
    }

    return { ok: true, message: parentName + ' registration rejected.' };
  }

  return { ok: false, message: 'Parent code not found: ' + code };
}

// --- Delegate registration ---------------------------------------------------

function registerDelegate(payload) {
  const parentCode    = normalizeCode_(payload.parentCode);
  const delegateName  = payload.delegateName || '';
  const phone         = payload.phone || '';
  const authorisedIds = payload.authorisedIds || [];
  const photoUrl      = payload.photoUrl || '';
  const notes         = payload.notes || '';

  if (!parentCode)             throw new Error('Parent code is required.');
  if (!delegateName)           throw new Error('Delegate name is required.');
  if (!authorisedIds.length)   throw new Error('Select at least one child.');

  const parent = findParentByCode_(parentCode);
  if (!parent) throw new Error('Parent code not found.');

  const st = String(parent.status).toUpperCase();
  if (st !== 'ACTIVE' && st !== 'APPROVED') throw new Error('Parent account must be approved before registering a delegate.');

  const parentChildren = getChildrenByParentCode_(parentCode);
  const validIds = new Set(parentChildren.map(c => normalizeCode_(c.childId)));
  const invalid  = authorisedIds.filter(id => !validIds.has(normalizeCode_(id)));
  if (invalid.length) throw new Error('Some child IDs do not belong to this parent: ' + invalid.join(', '));

  const delegateCode = generateDelegateCode_();
  const time = now_();

  getSheet_(SHEET_NAMES.delegates).appendRow([
    delegateCode, parentCode, delegateName, phone,
    authorisedIds.join(', '), photoUrl, time.timestamp, notes, true
  ]);

  if (parent.email) {
    const churchName = getConfig_().CHURCH_NAME || 'Evangel ICGC';
    const childNames = authorisedIds.map(id => {
      const ch = parentChildren.find(c => normalizeCode_(c.childId) === normalizeCode_(id));
      return ch ? ch.childName : id;
    }).join(', ');
    try {
      MailApp.sendEmail(
        parent.email,
        churchName + ' - Delegate Pickup Code Issued',
        'Dear ' + parent.parentName + ',\n\n' +
        'You have authorised ' + delegateName + ' to collect your child/children.\n\n' +
        'Delegate Code  : ' + delegateCode + '\n' +
        'Delegate Name  : ' + delegateName + '\n' +
        'Delegate Phone : ' + (phone || 'N/A') + '\n' +
        'Authorised for : ' + childNames + '\n\n' +
        'Share the Delegate Code with ' + delegateName + '.\n' +
        'They will use it at the service desk to authorise collection.\n\n' +
        'If you did not authorise this, contact a Children Service Leader immediately.\n\n' +
        'God bless you.'
      );
      logEmail_(delegateCode, parent.email, 'Delegate Code Issued', 'SENT', '');
    } catch (e) {
      logEmail_(delegateCode, parent.email, 'Delegate Code Issued', 'FAILED', e.message);
    }
  }

  return { ok: true, delegateCode, message: 'Delegate registered. Code emailed to parent.' };
}

// --- Code generators ---------------------------------------------------------

function generateParentCode_()   { return _generateCode_('NEXT_PARENT_SERIAL',   '');    }
function generateDelegateCode_() { return _generateCode_('NEXT_DELEGATE_SERIAL', '-D-'); }

function _generateCode_(serialKey, infix) {
  const cfgSheet = getSheet_(SHEET_NAMES.config);
  const cfg      = getConfig_();
  const prefix   = String(cfg.CODE_PREFIX || 'ABC');
  const serial   = Number(cfg[serialKey] || 1);
  const code     = prefix + infix + String(serial).padStart(5, '0');
  const vals     = cfgSheet.getRange(1, 1, 100, 2).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === serialKey) { cfgSheet.getRange(i + 1, 2).setValue(serial + 1); break; }
  }
  return code;
}

// --- Transaction emails -------------------------------------------------------

function sendTransactionEmails_(transactionId, action, parent, rows, pickupPerson, notes) {
  const cfg = getConfig_();
  if (String(cfg.EMAIL_NOTIFICATIONS || 'TRUE').toUpperCase() !== 'TRUE') return 'Disabled.';
  const churchName  = cfg.CHURCH_NAME  || 'Evangel ICGC';
  const serviceName = cfg.SERVICE_NAME || 'Sunday Children Service';
  const adminEmail  = cfg.ADMIN_EMAIL;
  const actionLabel = action === 'CHECK_IN' ? 'Dropped Off (Check-In)' : 'Picked Up (Check-Out)';
  const childList   = rows.map(r => '- ' + r[9] + ' (ID: ' + r[8] + ')').join('\n');
  const subject     = churchName + ' - ' + actionLabel + ' Confirmation';
  const body =
    serviceName + ' - Attendance Notification\n\n' +
    'Transaction ID : ' + transactionId + '\n' +
    'Action         : ' + actionLabel + '\n' +
    'Parent Code    : ' + parent.parentCode + '\n' +
    'Parent Name    : ' + parent.parentName + '\n' +
    'Phone          : ' + (parent.phone || 'N/A') + '\n\n' +
    'Children:\n' + childList + '\n\n' +
    'Pickup Person  : ' + (pickupPerson || parent.parentName) + '\n' +
    'Notes          : ' + (notes || 'None') + '\n' +
    'Timestamp      : ' + now_().timestamp + '\n\n' +
    'This is an automated notification. Please do not reply.';

  const recipients = [];
  if (parent.email) recipients.push(parent.email);
  if (adminEmail)   recipients.push(adminEmail);
  recipients.forEach(email => {
    try   { MailApp.sendEmail(email, subject, body); logEmail_(transactionId, email, subject, 'SENT', ''); }
    catch (e) { logEmail_(transactionId, email, subject, 'FAILED', e.message); }
  });
  return 'Email process completed.';
}

function logEmail_(ref, recipient, subject, status, error) {
  getSheet_(SHEET_NAMES.emailLog).appendRow([now_().timestamp, ref, recipient, subject, status, error]);
}
