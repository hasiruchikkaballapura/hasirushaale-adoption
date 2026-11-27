// Deployed from GitHub (hasirushaale-adoption/backend). Do not edit in the Apps Script editor.
/*
 * =====================================================================
 *  Code.gs  |  Hasiru Shaale adoption app: backend (Google Apps Script)
 * =====================================================================
 *  What this file does : the whole backend. The page on GitHub talks to it
 *                        through the web app link (/exec). It reads and
 *                        writes the Google Sheet and the Drive folders.
 *  Where it lives      : a STANDALONE project on script.google.com,
 *                        owned by the department account.
 *  IDs                 : never in this code. They are in
 *                        Project Settings > Script Properties:
 *                          SHEET_ID, FOLDER_FRONT_PHOTOS,
 *                          FOLDER_MEDIA, FOLDER_VISIT_RECORDS,
 *                          FOLDER_A4_FORMS, OAUTH_CLIENT_ID
 *  Your own tabs       : School Data, SaplingKinds and
 *                        "Adoption Volunteer  Response Tab" are only READ.
 *                        This code never writes into them.
 *
 *  HOW TO CHANGE ONE PART
 *  Every section sits between a START line and an END line, e.g.
 *     // ===== START 9.9 Example =====
 *     // ===== END 9.9 =====
 *  To replace a section: Ctrl+F the START line, select from it down to
 *  its END line (both included), paste the new section, Save.
 *
 *  CONTENTS
 *   0.0  Version
 *   Part 00  Config
 *     00.1  Script Properties names
 *     00.2  Tab names and the headings of every app tab
 *     00.3  Settings rows (starting values)
 *     00.4  Lists (starting values)
 *   Part 01  Helpers
 *     01.1  Open the Sheet, tabs and folders
 *     01.2  Read rows by heading (read once per request)
 *     01.3  Write rows by heading
 *     01.4  Clean values, dates in IST
 *     01.5  Log and replies
 *     01.6  Short-term memory (cache) for big lists
 *   Part 10  Sign-in
 *     10.1  Check the Google sign-in token
 *     10.2  Find the person in the Vol tab
 *     10.3  Who may do what
 *   Part 20  Schools
 *     20.1  Read all schools (School Data + School Status)
 *     20.2  Schools of one person
 *     20.3  Find schools (admin and coordinators)
 *     20.4  Who may open a school
 *     20.5  Write the app's own fields of one school
 *     20.6  Everything for one school page
 *     20.7  Which schools a person looks after (scope)
 *     20.8  Visits, calls and A4 dates of every school
 *     20.9  Preferred area of a volunteer (filter)
 *   Part 30  Giving schools
 *     30.1  Groups list (Vol 1, Vol 2 ...)
 *     30.2  Give schools to a person
 *     30.3  Take schools back
 *   Part 40  Vol tab
 *     40.1  Add new sign-ups to the Vol tab
 *     40.2  Email spelling check
 *     40.3  Volunteer list (for coordinators and the admin)
 *     40.4  Admin overview numbers
 *     40.5  Change people (admin): role, status, coordinator, email
 *   Part 45  Private remarks on volunteers
 *     45.1  Add a remark
 *     45.2  Read remarks
 *   Part 56  Filled A4 forms
 *     56.1  Save an uploaded A4 form
 *     56.2  A person's recent A4 uploads
 *     56.3  All A4 uploads (for the office)
 *   Part 50  Call log
 *     50.1  Save a call
 *   Part 55  Record your visit
 *     55.1  Who may record a visit
 *     55.2  Save a visit (new or edited)
 *     55.3  Delete a visit
 *     55.4  Visits of one school (history)
 *   Part 60  Update details (corrections)
 *     60.1  Fields that can be corrected
 *     60.2  Read corrections (approved and waiting)
 *     60.3  Propose a correction
 *     60.4  Corrections list and approval
 *   Part 65  Alerts and "not willing"
 *     65.1  Alerts list
 *     65.2  Mark an alert as done
 *     65.3  Set or clear "School not willing"
 *   Part 70  First things
 *     70.1  Save the school location
 *     70.2  Save the school front photo (taken once)
 *     70.3  Save the book answer
 *   Part 75  Media (photos, audio, video from the school page)
 *     75.1  Save a media file
 *     75.2  Media of one school
 *   Part 80  Dashboard
 *     80.1  Dashboard numbers
 *   Part 85  Map
 *     85.1  Map points
 *     85.2  geocodeVillages: find village positions (run by hand)
 *   Part 88  Settings and Lists
 *     88.1  Read Settings
 *     88.2  Read Lists
 *     88.3  Change a switch (admin)
 *     88.4  Sapling kinds
 *   Part 90  Setup (run by hand)
 *     90.1  setupAll: run this once
 *     90.2  Check the IDs and folders
 *     90.3  Create the app tabs and headings
 *     90.4  Fill Settings and Lists
 *     90.5  Fill School Status (one row per school)
 *     90.6  Add the owner and the placeholder people
 *     90.7  Start the 15-minute volunteer refresh
 *     90.8  authorizeOnce: approve new permissions
 *   Part 99  Entry (the web app)
 *     99.1  doGet: the ping check
 *     99.2  doPost: requests from the page on GitHub
 *     99.3  One place that answers every request
 * =====================================================================
 */

// ===== START 0.0 Version =====
var APP_VERSION = '2026-11-27 v9.12';
// ===== END 0.0 =====


/* =====================================================================
 *  Part 00  Config
 * ===================================================================== */

// ===== START 00.1 Script Properties names =====
// These are the names you type in Project Settings > Script Properties.
// The values (the long IDs) are only typed there, never here.
var PROP = {
  SHEET_ID: 'SHEET_ID',
  FOLDER_FRONT_PHOTOS: 'FOLDER_FRONT_PHOTOS',
  FOLDER_MEDIA: 'FOLDER_MEDIA',
  FOLDER_VISIT_RECORDS: 'FOLDER_VISIT_RECORDS',
  FOLDER_A4_FORMS: 'FOLDER_A4_FORMS',
  OAUTH_CLIENT_ID: 'OAUTH_CLIENT_ID'
};
var TIME_ZONE = 'Asia/Kolkata';
// ===== END 00.1 =====

// ===== START 00.2 Tab names and the headings of every app tab =====
// Your three tabs. Their names can also be changed later in the Settings tab.
var USER_TABS = {
  SCHOOLS: 'School Data',
  SIGNUPS: 'Adoption Volunteer  Response Tab',   // two spaces, as in the Sheet
  SAPLING_KINDS: 'SaplingKinds'
};

// The app's own tabs. Setup creates them. Columns are always found by their
// heading, never by position, so a column can be moved without breaking anything.
var APP_TABS = {
  'Vol tab': ['Login email', 'Sign-up email', 'Name', 'Role', 'Status', 'Coordinator', 'Note',
              'Added on', 'Added by', 'Changed on', 'Changed by'],
  'School Status': ['School ID', 'UDISE Code', 'School Name', 'Assigned to', 'Assigned on', 'Assigned by',
                    'Not willing', 'Not willing reason', 'Not willing by', 'Not willing on',
                    'Book given', 'Book date', 'Book by',
                    'Front photo link', 'Front photo date', 'Front photo by',
                    'Location link', 'Latitude', 'Longitude', 'Location date', 'Location by'],
  'Locations': ['School ID', 'Date', 'Location link', 'Latitude', 'Longitude', 'Reason for change', 'By', 'Method'],
  'Calls': ['Call ID', 'School ID', 'Call date', 'Volunteer', 'Who did you speak to', 'Who (other)',
            'How did the call go', 'How (other)', 'School not willing', 'Notes', 'Next visit planned',
            'Saved on', 'Saved by', 'Remarks ticks', 'Alert done by', 'Alert done on'],
  'Visits': ['Visit ID', 'School ID', 'Visit date', 'Volunteer', 'Entered by', 'Source',
             'How did the visit go', 'Who all accompanied you',
             'Saplings ticked', 'Seeds ticked',
             'Saplings given', 'Saplings planted', 'Why not planted', 'Planted', 'Alive now', 'Dead',
             'Health of surviving saplings', 'Why died', 'Why died (other)',
             'Replacement asked', 'Replacement how many', 'Species counts',
             'Seeds given', 'Seeds sown into packets', 'Why not sown', 'Seeds grew and planted',
             'Health of saplings from seeds', 'Where planted',
             'Who waters', 'Who waters (other)', 'How often watered', 'Water source',
             'Activities', 'Remarks ticks', 'Remarks', 'Photo links',
             'Saved on', 'Edited on', 'Deleted', 'A4 upload ID', 'Alert done by', 'Alert done on', 'Form data (app)',
             'Miracle of Mind session', 'Miracle of Mind students', 'Miracle of Mind teachers', 'Miracle of Mind others'],
  'Corrections': ['Correction ID', 'School ID', 'Field', 'Species', 'Old value', 'New value',
                  'Proposed by', 'Proposed on', 'Status', 'Approved by', 'Approved on', 'UDISE Code', 'School Name'],
  'Remarks': ['Remark ID', 'Volunteer', 'Kind', 'Remark', 'About date', 'Written by', 'Written on'],
  'Media': ['Media ID', 'School ID', 'Date', 'File name', 'Kind', 'File link', 'Explanation', 'By', 'Visit ID'],
  'A4 uploads': ['Upload ID', 'School ID', 'UDISE Code', 'School Name', 'Visit date', 'Volunteer', 'Files', 'File links', 'Note',
                 'Uploaded on', 'Office entered', 'Office entered by', 'Office entered on', 'Visit ID'],
  'Places': ['Taluk', 'Hobli', 'GP', 'Village', 'Latitude', 'Longitude', 'Found as', 'Checked on'],
  'Settings': ['Key', 'Value', 'What it means'],
  'Lists': [],            // one column per list; filled from 00.4
  'Log': ['Time', 'Who', 'Action', 'Details']
};
// ===== END 00.2 =====

// ===== START 00.3 Settings rows (starting values) =====
// Setup adds a row only if its Key is missing. After that, change values in the
// Settings tab itself; the code reads them from there.
var SETTINGS_START = [
  ['VISIT_FORM_VOLUNTEERS', 'Off', 'Record your visit for volunteers: On or Off. While Off, volunteers use the A4 form.'],
  ['VISIT_FORM_COORDINATORS', 'Off', 'Record your visit for coordinators (their own schools): On or Off.'],
  ['MAP_VOLUNTEERS', 'On', 'Map tab for volunteers: On or Off.'],
  ['MAP_COORDINATORS', 'On', 'Map tab for coordinators: On or Off.'],
  ['VISIT_DUE_DAYS', 120, 'A visit is shown as due after this many days.'],
  ['CALL_DUE_DAYS', 30, 'A call is shown as due after this many days.'],
  ['EDIT_HOURS', 72, 'A volunteer can edit or delete a visit for this many hours.'],
  ['SCHOOLS_PER_VOLUNTEER_GUIDE', 3, 'Only a guide shown to the admin. Never a limit.'],
  ['TAB_SCHOOLS', USER_TABS.SCHOOLS, 'Name of your school tab.'],
  ['TAB_SIGNUPS', USER_TABS.SIGNUPS, 'Name of the sign-up (IMPORTRANGE) tab. Read only.'],
  ['TAB_SAPLING_KINDS', USER_TABS.SAPLING_KINDS, 'Name of the sapling kinds tab.']
];
// ===== END 00.3 =====

// ===== START 00.4 Lists (starting values) =====
// Each list becomes one column in the Lists tab (heading = list name).
// Setup adds a list only if its column is missing. Edit the lists in the tab.
var LISTS_START = {
  'How did the visit go': ['Completed', 'Partly done', "Couldn't meet anyone", 'School closed'],
  'Health': ['Healthy', 'Fair', 'Poor'],
  'Why saplings died': ['No watering', 'Grazing animals', 'Pests or disease', 'Trampling', 'Other'],
  'Who waters the plants': ['Students', 'Teachers', 'Other', 'Nobody'],
  'How often watered': ['Daily', 'Few times a week', 'Weekly', 'Rarely'],
  'Activity type': ['Games', 'Awareness'],
  'Remarks ticks': ['Pit digging / tree guard', 'Concern', 'Follow up', 'Support', 'Highlights', 'Sharing', 'School not willing to support'],
  'Call: who did you speak to': ['HM or principal', 'Alternative contact', 'Teacher', 'Other'],
  'Call: how did the call go': ['Spoke', 'No answer', 'Number not working', 'Call back later', 'Other'],
  'Remark kind': ['Positive', 'Concern', 'Other'],
  'Role': ['Volunteer', 'Coordinator', 'Admin'],
  'Status': ['Active', 'Inactive']
};
// ===== END 00.4 =====


/* =====================================================================
 *  Part 01  Helpers
 * ===================================================================== */

// ===== START 01.1 Open the Sheet, tabs and folders =====
var _book = null;
function prop_(name) {
  var v = PropertiesService.getScriptProperties().getProperty(name);
  return v ? String(v).trim() : '';
}
function book_() {
  if (_book) return _book;
  var id = prop_(PROP.SHEET_ID);
  if (!id) throw new Error('SHEET_ID is missing. Add it in Project Settings > Script Properties.');
  _book = SpreadsheetApp.openById(id);
  return _book;
}
function tab_(name) {
  return book_().getSheetByName(name);   // null if the tab does not exist
}
function userTab_(key) {
  // key: 'TAB_SCHOOLS', 'TAB_SIGNUPS' or 'TAB_SAPLING_KINDS' (names come from Settings)
  var fallback = { TAB_SCHOOLS: USER_TABS.SCHOOLS, TAB_SIGNUPS: USER_TABS.SIGNUPS, TAB_SAPLING_KINDS: USER_TABS.SAPLING_KINDS }[key];
  var name = (settings_()[key] || fallback);
  var sh = tab_(name);
  if (!sh) throw new Error('Tab "' + name + '" was not found. Check its name in the Settings tab (' + key + ').');
  return sh;
}
function folder_(propName) {
  var id = prop_(propName);
  if (!id) throw new Error(propName + ' is missing. Add it in Project Settings > Script Properties.');
  return DriveApp.getFolderById(id);
}
// ===== END 01.1 =====

// ===== START 01.2 Read rows by heading (read once per request) =====
// Returns { head: ['Heading', ...], col: {heading-in-lower-case: index}, rows: [ {Heading: value, _row: n}, ... ] }
// A tab is read from Google only ONCE per request (kept in _memo). Every write clears _memo (touch_),
// so a read after a write always sees the new data.
var _memo = {};
function read_(sh) {
  var key = sh.getName();
  if (_memo[key]) return _memo[key];
  var values = sh.getDataRange().getValues();
  if (!values.length || !values[0].length) return (_memo[key] = { head: [], col: {}, rows: [] });
  var head = values[0].map(function (h) { return String(h).trim(); });
  var col = {};
  head.forEach(function (h, i) { if (h && !(h.toLowerCase() in col)) col[h.toLowerCase()] = i; });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var line = values[r];
    if (line.every(function (c) { return c === '' || c === null; })) continue;   // skip blank rows
    var o = { _row: r + 1 };
    head.forEach(function (h, i) { if (h) o[h] = line[i]; });
    rows.push(o);
  }
  return (_memo[key] = { head: head, col: col, rows: rows });
}
// Forget what was read in this request (called after every write).
function touch_() { _memo = {}; }
// The start of every request: nothing is remembered from an earlier one.
function fresh_() { _memo = {}; _settings = null; }
// The value of one heading in a row object, matching the heading without caring about case or spaces.
function get_(rowObj, heading) {
  if (heading in rowObj) return rowObj[heading];
  var want = heading.toLowerCase().replace(/\s+/g, ' ').trim();
  for (var k in rowObj) {
    if (k.toLowerCase().replace(/\s+/g, ' ').trim() === want) return rowObj[k];
  }
  return '';
}
// ===== END 01.2 =====

// ===== START 01.3 Write rows by heading =====
// The row number after the last row that has something in it (does not trust getLastRow alone).
function nextFreeRow_(sh) {
  var last = sh.getLastRow();
  if (last < 2) return 2;
  var width = Math.max(1, sh.getLastColumn());
  var filled = function (row) { return row.some(function (c) { return c !== '' && c !== null; }); };
  if (filled(sh.getRange(last, 1, 1, width).getValues()[0])) return last + 1;   // the usual case: one small read
  var values = sh.getRange(1, 1, last, width).getValues();
  for (var r = values.length - 1; r >= 1; r--) {
    if (filled(values[r])) return r + 2;
  }
  return 2;
}
// Adds rows given as objects {Heading: value}. Unknown headings are ignored. Returns the first row number written.
function append_(sh, objs) {
  if (!objs.length) return 0;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var out = objs.map(function (o) {
    return head.map(function (h) { return (h in o && o[h] !== undefined && o[h] !== null) ? o[h] : ''; });
  });
  var start = nextFreeRow_(sh);
  sh.getRange(start, 1, out.length, head.length).setValues(out);
  touch_();
  return start;
}
// Writes several cells of one row, by heading (data = the read_ result of that tab).
function putRow_(sh, data, rowNo, values) {
  Object.keys(values).forEach(function (h) {
    var c = data.head.indexOf(h);
    if (c >= 0) sh.getRange(rowNo, c + 1).setValue(values[h]);
  });
  touch_();
}
// ===== END 01.3 =====

// ===== START 01.4 Clean values, dates in IST =====
function clean_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v;
  var s = String(v).replace(/\s+/g, ' ').trim();
  return (s === '-' || s === '–') ? '' : s;
}
function email_(v) {
  return String(v === null || v === undefined ? '' : v).replace(/\s+/g, '').toLowerCase();
}
function now_() { return new Date(); }
// A short unique stamp for IDs: date and time (IST) plus two random letters, e.g. 261104093015k7
function stamp_() { return Utilities.formatDate(new Date(), TIME_ZONE, 'yyMMddHHmmss') + Math.random().toString(36).slice(2, 4); }
function ist_(d, pattern) {
  return Utilities.formatDate(d || new Date(), TIME_ZONE, pattern || 'd MMM yyyy, HH:mm');
}
function num_(v) {
  if (typeof v === 'number') return v;
  var s = String(v === null || v === undefined ? '' : v).replace(/,/g, '').trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
// ===== END 01.4 =====

// ===== START 01.5 Log and replies =====
function log_(who, action, details) {
  try {
    var sh = tab_('Log');
    if (sh) sh.appendRow([now_(), who || '', action || '', String(details || '').slice(0, 2000)]);   // Time, Who, Action, Details
  } catch (e) { /* the log must never stop the real work */ }
}
function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function me_() {
  try { return Session.getEffectiveUser().getEmail() || 'script'; } catch (e) { return 'script'; }
}
// ===== END 01.5 =====

// ===== START 01.6 Short-term memory (cache) for big lists =====
// Google's cache holds at most 100 KB per piece, so a big list is cut into pieces.
function cacheGetBig_(key) {
  try {
    var cache = CacheService.getScriptCache();
    var n = Number(cache.get(key + '_n') || 0);
    if (!n) return null;
    var keys = []; for (var i = 0; i < n; i++) keys.push(key + '_' + i);
    var got = cache.getAll(keys), text = '';
    for (var j = 0; j < n; j++) { if (got[keys[j]] === undefined || got[keys[j]] === null) return null; text += got[keys[j]]; }
    return JSON.parse(text);
  } catch (e) { return null; }
}
function cachePutBig_(key, obj, seconds) {
  try {
    var all = JSON.stringify(obj), size = 90000, put = {}, count = Math.ceil(all.length / size);
    for (var k = 0; k < count; k++) put[key + '_' + k] = all.substr(k * size, size);
    put[key + '_n'] = String(count);
    CacheService.getScriptCache().putAll(put, seconds);
  } catch (e) { /* too big for the cache: fine, it is just slower */ }
}
function cacheDrop_(key) {
  try { CacheService.getScriptCache().remove(key + '_n'); } catch (e) { }
}
// ===== END 01.6 =====


/* =====================================================================
 *  Part 10  Sign-in
 * ===================================================================== */

// ===== START 10.1 Check the Google sign-in token =====
// The page signs the person in with Google and sends us a token. We ask Google
// whether the token is real, made for OUR app (Client ID), and not expired.
// A checked token is remembered for 5 minutes so we do not ask Google every time.
function verifyToken_(token) {
  if (!token) throw signInError_('Please sign in.');
  if (String(token).indexOf('hs1.') === 0) return checkSession_(token);   // v9.10: the app's own 30-day sign-in
  var cache = CacheService.getScriptCache();
  var key = 'tok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  var known = cache.get(key);
  if (known) return known;
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw signInError_('Your sign-in has expired. Please sign in again.');
  var info = JSON.parse(res.getContentText());
  var clientId = prop_('OAUTH_CLIENT_ID');
  if (!clientId) throw new Error('OAUTH_CLIENT_ID is missing in Script Properties.');
  if (info.aud !== clientId) throw signInError_('This sign-in was not made for this app. Please sign in again.');
  if (String(info.email_verified) !== 'true') throw signInError_('Your Google email is not verified.');
  if (Number(info.exp) * 1000 < Date.now()) throw signInError_('Your sign-in has expired. Please sign in again.');
  var email = email_(info.email);
  cache.put(key, email, 300);
  return email;
}
function signInError_(msg) {
  var e = new Error(msg);
  e.needSignIn = true;
  return e;
}
// v9.10: after one Google sign-in the app gives its own sign-in pass, valid for 30 days and renewed
// each time the app is opened. It is signed with a secret kept only in Script Properties (SESSION_SECRET,
// made automatically). The Vol tab is still checked on every request, so making a person Inactive
// stops them at once. Changing or deleting SESSION_SECRET signs everybody out.
var SESSION_DAYS = 30;
function sessionSecret_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('SESSION_SECRET');
  if (s) return s;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    s = p.getProperty('SESSION_SECRET');
    if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SESSION_SECRET', s); }
    return s;
  } finally { lock.releaseLock(); }
}
function sessionSign_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, sessionSecret_())).replace(/=+$/, '');
}
function makeSession_(email) {
  var body = Utilities.base64EncodeWebSafe(email + '|' + (Date.now() + SESSION_DAYS * 86400000)).replace(/=+$/, '');
  return 'hs1.' + body + '.' + sessionSign_(body);
}
function checkSession_(token) {
  var parts = String(token).split('.');
  if (parts.length !== 3 || sessionSign_(parts[1]) !== parts[2]) throw signInError_('Please sign in again.');
  var raw = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1] + '==='.slice((parts[1].length + 3) % 4))).getDataAsString();
  var bits = raw.split('|');
  if (bits.length !== 2 || !(Number(bits[1]) > Date.now())) throw signInError_('Your sign-in has expired. Please sign in again.');
  return email_(bits[0]);
}
// ===== END 10.1 =====

// ===== START 10.2 Find the person in the Vol tab =====
// Looks up "Login email" in the Vol tab. Only Status = Active may use the app.
// The answer is remembered for 1 minute (a change in the Vol tab shows within a minute).
function whoIs_(email) {
  var cache = CacheService.getScriptCache(), ck = 'who_' + email;
  try { var hit = cache.get(ck); if (hit) return JSON.parse(hit); } catch (x) { }
  var rows = read_(tab_('Vol tab')).rows;
  var row = null;
  for (var i = 0; i < rows.length; i++) {
    if (email_(get_(rows[i], 'Login email')) === email) { row = rows[i]; break; }
  }
  if (!row) {
    var e1 = new Error('The Google account ' + email + ' is not registered. Sign in with the email you gave in the volunteer sign-up form, or contact the office.');
    e1.notRegistered = true;
    throw e1;
  }
  if (String(clean_(get_(row, 'Status'))).toLowerCase() !== 'active') {
    var e2 = new Error('Your account (' + email + ') is not active yet. Please contact the office or your coordinator.');
    e2.notRegistered = true;
    throw e2;
  }
  var role = String(clean_(get_(row, 'Role'))).toLowerCase();
  role = role.indexOf('admin') === 0 ? 'Admin' : role.indexOf('coord') === 0 ? 'Coordinator' : 'Volunteer';
  var person = { email: email, name: clean_(get_(row, 'Name')) || email, role: role, coordinator: email_(get_(row, 'Coordinator')) };
  try { cache.put(ck, JSON.stringify(person), 60); } catch (x2) { }
  return person;
}
function forgetPerson_(email) {
  try { CacheService.getScriptCache().remove('who_' + email_(email)); } catch (e) { }
}
// ===== END 10.2 =====

// ===== START 10.3 Who may do what =====
// Admin can do everything a coordinator can; everyone can see their own schools.
function need_(person, role) {
  var rank = { Volunteer: 1, Coordinator: 2, Admin: 3 };
  if ((rank[person.role] || 0) < rank[role]) throw new Error('This needs the ' + role + ' role.');
}
// ===== END 10.3 =====


/* =====================================================================
 *  Part 20  Schools
 * ===================================================================== */

// ===== START 20.1 Read all schools (School Data + School Status) =====
// Two short-term memories (caches) make screens fast:
//  - School Data (your tab, only read) is kept for 5 minutes. A change typed straight into
//    School Data (for example the office note in "Remarks") shows within 5 minutes.
//  - The full list (School Data + the app's own tabs) is kept for 5 minutes and is cleared
//    at once by anything the app saves, so app changes show straight away.
// Approved corrections (Part 60) are shown in place of the School Data value; School Data itself is never written.
var SCHOOL_CACHE_SECONDS = 300;
function cacheKey_(what) { return what + '_' + APP_VERSION.replace(/\W/g, ''); }
function schoolDataBase_() {
  var key = cacheKey_('sd');
  var hit = cacheGetBig_(key);
  if (hit) return hit;
  var list = read_(userTab_('TAB_SCHOOLS')).rows.map(function (r) {
    var activity = clean_(get_(r, 'Activity')), schoolStatus = clean_(get_(r, 'Status'));
    var group = String(clean_(get_(r, 'Group')));
    var visit = get_(r, 'Date of Visit');
    return {
      id: num_(get_(r, 'Sl. No.')),
      udise: String(clean_(get_(r, 'UDISE Code'))),
      name: String(clean_(get_(r, 'School Name'))),
      taluk: String(clean_(get_(r, 'Taluk'))),
      hobli: String(clean_(get_(r, 'Hobli'))),
      gp: String(clean_(get_(r, 'GP Name / ULB Name'))),
      village: String(clean_(get_(r, 'Village / Ward'))),
      hmName: String(clean_(get_(r, 'HM/ Principal Name'))),
      hmPhone: String(clean_(get_(r, 'HM/ Principal Number'))),
      altName: String(clean_(get_(r, 'Alternative Contact Name'))),
      altPhone: String(clean_(get_(r, 'Alternative Contact Number'))),
      students: num_(get_(r, 'No. of Students')),
      status: String(schoolStatus),
      activity: String(activity),
      saplings: num_(get_(r, 'Saplings Count')) || 0,
      seeds: num_(get_(r, 'Seeds Count')) || 0,
      species: String(clean_(get_(r, 'Species & Qty')) || clean_(get_(r, 'Species & Qty / Remarks'))),   // either heading works
      officeNote: String(clean_(get_(r, 'Remarks'))),     // the office's note to volunteers (column "Remarks" in School Data)
      firstVisit: visit instanceof Date ? ist_(visit, 'd MMM yyyy') : String(clean_(visit)),
      firstVol: String(clean_(get_(r, 'Volunteer Name'))),
      firstVolPhone: String(clean_(get_(r, 'Volunteer Number'))),   // v9.9: added by hand to School Data (blank if the column is not there)
      group: group,
      groupNo: num_(group.replace(/\D/g, '')),
      caution: /not ready/i.test(activity) || /merged/i.test(schoolStatus)
    };
  }).filter(function (s) { return s.id !== null; });
  cachePutBig_(key, list, SCHOOL_CACHE_SECONDS);
  return list;
}
function readAllSchools_() {
  var status = {};
  read_(tab_('School Status')).rows.forEach(function (r) { status[String(get_(r, 'School ID'))] = r; });
  var corr = readCorrections_();
  var act = activityBySchool_();
  var names = {};                                  // v9.11: show the person's name instead of the email
  read_(tab_('Vol tab')).rows.forEach(function (r) { var e = email_(get_(r, 'Login email')); if (e && !names[e]) names[e] = String(clean_(get_(r, 'Name')) || ''); });
  return schoolDataBase_().map(function (b) {
    var s = Object.assign({}, b), id = String(s.id);
    var st = status[id] || {};
    s.assignedTo = email_(get_(st, 'Assigned to'));
    s.assignedName = s.assignedTo ? (names[s.assignedTo] || s.assignedTo) : '';
    s.assignedOn = get_(st, 'Assigned on') instanceof Date ? ist_(get_(st, 'Assigned on'), 'd MMM yyyy') : '';
    s.notWilling = /^y/i.test(String(clean_(get_(st, 'Not willing'))));
    s.bookGiven = String(clean_(get_(st, 'Book given')));
    s.frontPhoto = String(clean_(get_(st, 'Front photo link')));
    s.location = String(clean_(get_(st, 'Location link')));
    s.lat = num_(get_(st, 'Latitude'));
    s.lng = num_(get_(st, 'Longitude'));
    var ok = corr.approved[id] || {};
    Object.keys(ok).forEach(function (p) { s[p] = ok[p]; });
    s.pending = corr.pending[id] || null;
    var a = act[id] || {};
    s.lastVisit = a.lastVisit || '';
    s.lastCall = a.lastCall || '';
    s.visits = a.visits || 0;
    s.latest = a.latest || null;
    s.alerts = a.alerts || [];          // open Pit digging / tree guard and Concern alerts (visits and calls)
    return s;
  });
}
function allSchools_() {
  var key = cacheKey_('schools');
  var hit = cacheGetBig_(key);
  if (hit) return hit;
  var list = readAllSchools_();
  cachePutBig_(key, list, SCHOOL_CACHE_SECONDS);
  return list;
}
function clearSchoolsCache_() { cacheDrop_(cacheKey_('schools')); }
// ===== END 20.1 =====

// ===== START 20.2 Schools of one person =====
function schoolsOf_(email) {
  return allSchools_().filter(function (s) { return s.assignedTo === email; })
    .sort(function (a, b) { return a.id - b.id; });
}
// ===== END 20.2 =====

// ===== START 20.3 Find schools (admin and coordinators) =====
// filters: taluk, hobli, gp, q (name, village, UDISE or "Vol 12"), show: all | free | assigned | caution | notwilling | mine,
//          pref: {taluk, hobli, gp} = a volunteer's preferred area from the sign-up form (see 20.9)
// A coordinator sees every school, but the email of a person who is not theirs is hidden ("Taken").
function findSchools_(f, person) {
  f = f || {};
  var all = person ? masked_(person, allSchools_()) : allSchools_();
  var q = String(f.q || '').trim().toLowerCase();
  var vol = q.match(/^(?:vol\s*|g)?(\d+)$/);
  var pref = f.pref ? prefArea_(f.pref, all) : null;
  var list = all.filter(function (s) {
    if (pref && !inPref_(s, pref)) return false;
    if (f.taluk && s.taluk !== f.taluk) return false;
    if (f.hobli && s.hobli !== f.hobli) return false;
    if (f.gp && s.gp !== f.gp) return false;
    if (f.show === 'free' && (s.assignedTo || s.caution)) return false;
    if (f.show === 'assigned' && !s.assignedTo) return false;
    if (f.show === 'caution' && !s.caution) return false;
    if (f.show === 'notwilling' && !s.notWilling) return false;
    if (f.show === 'mine' && !s.mine) return false;
    if (f.show === 'visited' && !s.lastVisit) return false;                     // v9.11
    if (f.show === 'notvisited' && (!s.assignedTo || s.lastVisit)) return false;   // given, not visited yet
    if (q) {
      if (vol) return s.groupNo === Number(vol[1]) || s.udise.indexOf(q) >= 0;
      return (s.name + ' ' + s.village + ' ' + s.gp + ' ' + s.udise).toLowerCase().indexOf(q) >= 0;
    }
    return true;
  });
  var uniq = function (arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }).sort(); };
  return {
    total: list.length,
    schools: list.slice(0, 100),
    pref: pref,
    taluks: uniq(all.map(function (s) { return s.taluk; })),
    hoblis: uniq(all.filter(function (s) { return !f.taluk || s.taluk === f.taluk; }).map(function (s) { return s.hobli; })),
    gps: uniq(all.filter(function (s) { return (!f.taluk || s.taluk === f.taluk) && (!f.hobli || s.hobli === f.hobli); }).map(function (s) { return s.gp; }))
  };
}
// ===== END 20.3 =====

// ===== START 20.4 Who may open a school =====
// Volunteer: own schools. Coordinator: own schools and those of their volunteers. Admin: all.
// (A coordinator may also LOOK at any other school, read only: see 20.6.)
function canSee_(person, school) {
  if (person.role === 'Admin') return true;
  if (school.assignedTo === person.email) return true;
  if (person.role === 'Coordinator' && school.assignedTo) {
    var rows = read_(tab_('Vol tab')).rows;
    for (var i = 0; i < rows.length; i++) {
      if (email_(get_(rows[i], 'Login email')) === school.assignedTo) return isMyVolunteer_(rows[i], person);
    }
  }
  return false;
}
// The Coordinator column may hold the coordinator's email or name (either works).
function isMyVolunteer_(volRow, person) {
  var v = String(clean_(get_(volRow, 'Coordinator'))).toLowerCase().replace(/\s+/g, ' ').trim();
  if (!v) return false;
  return v.replace(/\s+/g, '') === person.email || v === String(person.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function schoolById_(id) {
  var all = allSchools_();
  for (var i = 0; i < all.length; i++) if (String(all[i].id) === String(id)) return all[i];
  throw new Error('School not found.');
}
function openSchool_(person, id) {
  var s = schoolById_(id);
  if (!canSee_(person, s)) throw new Error('You cannot open this school.');
  return s;
}
// ===== END 20.4 =====

// ===== START 20.5 Write the app's own fields of one school =====
// Writes values into the school's row in the School Status tab, by heading.
function setStatus_(id, values) {
  var sh = tab_('School Status');
  var data = read_(sh);
  var row = null;
  data.rows.forEach(function (r) { if (String(get_(r, 'School ID')) === String(id)) row = r._row; });
  if (!row) throw new Error('School ' + id + ' is not in the School Status tab. Run setupAll.');
  putRow_(sh, data, row, values);
  clearSchoolsCache_();
}
// ===== END 20.5 =====

// ===== START 20.6 Everything for one school page =====
// A coordinator may open any school to look at it (read only, no actions): the email of a
// person who is not theirs shows as "Taken".
function schoolPage_(person, id) {
  var s0 = schoolById_(id);
  if (!canSee_(person, s0)) {
    if (person.role !== 'Coordinator') throw new Error('You cannot open this school.');
    var v = JSON.parse(JSON.stringify(s0));
    v.readOnly = true;
    if (v.assignedTo && v.assignedTo !== person.email) v.assignedTo = 'Taken';
    v.first = {}; v.calls = []; v.a4 = []; v.visitsList = []; v.media = [];
    v.canVisit = false; v.canManage = false; v.isAdmin = false; v.corrFields = []; v.kinds = [];
    v.lists = { callWho: [], callHow: [] };
    return v;
  }
  var s = JSON.parse(JSON.stringify(s0));
  var st = {};
  read_(tab_('School Status')).rows.forEach(function (r) { if (String(get_(r, 'School ID')) === String(id)) st = r; });
  var d = function (v, p) { return v instanceof Date ? ist_(v, p || 'd MMM yyyy') : clean_(v); };
  s.first = {
    location: clean_(get_(st, 'Location link')), locationDate: d(get_(st, 'Location date')),
    photo: clean_(get_(st, 'Front photo link')), photoDate: d(get_(st, 'Front photo date')),
    book: clean_(get_(st, 'Book given')), bookDate: d(get_(st, 'Book date')),
    notWillingReason: clean_(get_(st, 'Not willing reason'))
  };
  s.calls = read_(tab_('Calls')).rows.filter(function (r) { return String(get_(r, 'School ID')) === String(id); })
    .map(function (r) {
      return { date: d(get_(r, 'Call date')), who: clean_(get_(r, 'Who did you speak to')), whoOther: clean_(get_(r, 'Who (other)')),
               how: clean_(get_(r, 'How did the call go')), howOther: clean_(get_(r, 'How (other)')),
               notWilling: /^y/i.test(String(get_(r, 'School not willing'))), notes: clean_(get_(r, 'Notes')),
               next: d(get_(r, 'Next visit planned')), by: email_(get_(r, 'Volunteer')), ticks: String(clean_(get_(r, 'Remarks ticks'))) };
    }).reverse().slice(0, 10);
  var a4 = tab_('A4 uploads');
  var a4rows = !a4 ? [] : read_(a4).rows.filter(function (r) { return String(get_(r, 'School ID')) === String(id); }).reverse().slice(0, 10);
  s.a4 = a4rows.map(function (r) {
    var u = { visitDate: d(get_(r, 'Visit date')), files: num_(get_(r, 'Files')) || 0, by: email_(get_(r, 'Volunteer')),
              entered: /^y/i.test(String(clean_(get_(r, 'Office entered')))), id: clean_(get_(r, 'Upload ID')) };
    // the office (admin) also gets the file links, to enter the form
    if (person.role === 'Admin') u.links = String(get_(r, 'File links') || '').split(/\n/).filter(String);
    return u;
  });
  var lists = lists_();
  s.lists = lists;
  s.lists.callWho = lists['Call: who did you speak to'] || [];
  s.lists.callHow = lists['Call: how did the call go'] || [];
  s.kinds = saplingKinds_();
  s.visitsList = visitsOf_(person, id);
  s.media = mediaOf_(id);
  s.canVisit = visitAllowed_(person, s);
  s.canManage = person.role === 'Admin' || (person.role === 'Coordinator' && s.assignedTo !== person.email && canSee_(person, s));
  s.isAdmin = person.role === 'Admin';
  s.corrFields = CORR_FIELDS.map(function (f) { return { key: f[0], label: f[2], prop: f[1] }; });
  if (s.assignedTo) {
    var who = null;
    read_(tab_('Vol tab')).rows.forEach(function (r) { if (!who && email_(get_(r, 'Login email')) === s.assignedTo) who = r; });
    s.assignedName = who ? (clean_(get_(who, 'Name')) || s.assignedTo) : s.assignedTo;
  }
  return s;
}
// ===== END 20.6 =====

// ===== START 20.7 Which schools a person looks after (scope) =====
// Admin: all. Coordinator: own schools and the schools of their volunteers. Volunteer: own schools.
// Returns the set of emails whose schools the person looks after (null = everybody).
function scopeEmails_(person) {
  if (person.role === 'Admin') return null;
  var mine = {};
  mine[person.email] = true;
  if (person.role === 'Coordinator') {
    read_(tab_('Vol tab')).rows.forEach(function (r) {
      if (isMyVolunteer_(r, person)) mine[email_(get_(r, 'Login email'))] = true;
    });
  }
  return mine;
}
function inScope_(emails, school) {
  return emails === null || (!!school.assignedTo && !!emails[school.assignedTo]);
}
// For a coordinator: schools given to people who are not theirs show "Taken" instead of the email.
function masked_(person, list) {
  var emails = scopeEmails_(person);
  return list.map(function (s) {
    var c = JSON.parse(JSON.stringify(s));
    c.mine = inScope_(emails, s);
    if (emails !== null && s.assignedTo && !c.mine) { c.assignedTo = 'Taken'; c.assignedName = 'Taken'; }
    return c;
  });
}
// ===== END 20.7 =====

// ===== START 20.8 Visits, calls and A4 dates of every school =====
// For each school: the last visit date (a visit record or an uploaded A4), the last call date,
// the number of visits, and the numbers of the latest visit (used by the dashboard and the map).
function activityBySchool_() {
  var out = {};
  var day = function (v) { return v instanceof Date ? ist_(v, 'yyyy-MM-dd') : ''; };
  var put = function (id) { return (out[id] = out[id] || { lastVisit: '', lastCall: '', visits: 0, latest: null, alerts: [] }); };
  var addAlerts = function (a, r) {
    if (clean_(get_(r, 'Alert done on'))) return;
    alertKinds_(get_(r, 'Remarks ticks')).forEach(function (k) { if (a.alerts.indexOf(k) < 0) a.alerts.push(k); });
  };
  var vs = tab_('Visits');
  if (vs) read_(vs).rows.forEach(function (r) {
    if (/^y/i.test(String(clean_(get_(r, 'Deleted'))))) return;
    var id = String(get_(r, 'School ID')), d = day(get_(r, 'Visit date'));
    var a = put(id);
    a.visits++;
    addAlerts(a, r);
    if (d >= a.lastVisit) {
      a.lastVisit = d;
      a.latest = {
        date: d, how: clean_(get_(r, 'How did the visit go')),
        saplingsTicked: /^y/i.test(String(clean_(get_(r, 'Saplings ticked')))),
        seedsTicked: /^y/i.test(String(clean_(get_(r, 'Seeds ticked')))),
        given: num_(get_(r, 'Saplings given')), planted: num_(get_(r, 'Planted')),
        alive: num_(get_(r, 'Alive now')), dead: num_(get_(r, 'Dead')),
        seedsGiven: num_(get_(r, 'Seeds given')), seedsGrew: num_(get_(r, 'Seeds grew and planted')),
        seedsSownYN: String(clean_(get_(r, 'Seeds sown into packets')) || '')
      };
    }
  });
  var cs = tab_('Calls');
  if (cs) read_(cs).rows.forEach(function (r) {
    var a = put(String(get_(r, 'School ID'))), d = day(get_(r, 'Call date'));
    if (d > a.lastCall) a.lastCall = d;
    addAlerts(a, r);
  });
  var up = tab_('A4 uploads');
  if (up) read_(up).rows.forEach(function (r) {
    var a = put(String(get_(r, 'School ID'))), d = day(get_(r, 'Visit date'));
    if (d > a.lastVisit) a.lastVisit = d;
  });
  return out;
}
// ===== END 20.8 =====

// ===== START 20.9 Preferred area of a volunteer (filter) =====
// The sign-up form's Taluk / Hobli / Gram Panchayat are typed by people, so spellings differ
// ("Gauribidanuru" for Gowribidanur, "Kaivara" for Kaiwara). They are matched loosely to the
// names in School Data. "Any Hobli", "Any Gram Panchayat" or a blank mean: no limit.
// Several names in one cell (comma, slash or "and") are all used.
function skel_(x) {
  var s = String(x || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return '';
  return (s.charAt(0) + s.slice(1).replace(/[aeiouwyhv]/g, '')).replace(/(.)\1+/g, '$1');
}
// Returns the matching names (array), [] when there is no limit, or null when nothing matched.
function placeMatch_(want, names) {
  var parts = String(want || '').split(/\s*(?:,|\/|;|&|\band\b)\s*/i).map(function (x) { return x.trim(); })
    .filter(function (x) { return x && !/^any\b/i.test(x) && !/^(-|na|n\/a|none|no|nil|all)$/i.test(x); });
  if (!parts.length) return [];
  var out = [];
  parts.forEach(function (w) {
    var lw = w.toLowerCase(), sw = skel_(w), hit = null;
    names.forEach(function (n) { if (!hit && n.toLowerCase() === lw) hit = n; });
    if (!hit && sw.length >= 2) names.forEach(function (n) { if (!hit && skel_(n) === sw) hit = n; });
    if (!hit && sw.length >= 4) names.forEach(function (n) {
      var sn = skel_(n);
      if (!hit && sn.length >= 4 && (sn.indexOf(sw) === 0 || sw.indexOf(sn) === 0)) hit = n;
    });
    if (hit && out.indexOf(hit) < 0) out.push(hit);
  });
  return out.length ? out : null;
}
// pref: {taluk, hobli, gp} as typed in the sign-up form. Returns the matched names and what could not be matched.
function prefArea_(pref, all) {
  pref = pref || {};
  var uniq = function (arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); };
  var missed = [];
  var T = placeMatch_(pref.taluk, uniq(all.map(function (s) { return s.taluk; })));
  if (T === null) { missed.push(String(pref.taluk)); T = []; }
  var inT = all.filter(function (s) { return !T.length || T.indexOf(s.taluk) >= 0; });
  var H = placeMatch_(pref.hobli, uniq(inT.map(function (s) { return s.hobli; })));
  if (H === null) { missed.push(String(pref.hobli)); H = []; }
  var inH = inT.filter(function (s) { return !H.length || H.indexOf(s.hobli) >= 0; });
  var G = placeMatch_(pref.gp, uniq(inH.map(function (s) { return s.gp; })));
  if (G === null) G = placeMatch_(pref.gp, uniq(inT.map(function (s) { return s.gp; })));   // GP in another hobli of the taluk
  if (G === null) { missed.push(String(pref.gp)); G = []; }
  return { taluk: T, hobli: H, gp: G, missed: missed, any: !!(T.length || H.length || G.length) };
}
function inPref_(s, p) {
  if (!p || !p.any) return true;
  if (p.gp.length) return p.gp.indexOf(s.gp) >= 0 && (!p.taluk.length || p.taluk.indexOf(s.taluk) >= 0);
  return (!p.taluk.length || p.taluk.indexOf(s.taluk) >= 0) && (!p.hobli.length || p.hobli.indexOf(s.hobli) >= 0);
}
// ===== END 20.9 =====


/* =====================================================================
 *  Part 30  Giving schools
 * ===================================================================== */

// ===== START 30.1 Groups list (Vol 1, Vol 2 ...) =====
// Groups keep the order of the Sheet: Vol 1 has the biggest planting. The first school of a
// group (the "anchor") decides the group's taluk for the filter. Groups are only a helper:
// any school can still be given to anyone, one by one.
// filters: taluk (anchor), show: all | free | partly | given, q (Vol number or school/village),
//          pref: {taluk, hobli, gp} (a group matches when any of its schools is in that area)
function groupList_(f, person) {
  f = f || {};
  var all = person ? masked_(person, allSchools_()) : allSchools_();
  var pref = f.pref ? prefArea_(f.pref, all) : null;
  var groups = {}, order = [];
  all.forEach(function (s) {
    if (!s.groupNo) return;
    if (!groups[s.groupNo]) { groups[s.groupNo] = []; order.push(s.groupNo); }
    groups[s.groupNo].push(s);
  });
  order.sort(function (a, b) { return a - b; });
  var q = String(f.q || '').trim().toLowerCase(), qn = q.match(/^(?:vol\s*|g)?(\d+)$/);
  var list = order.map(function (n) {
    var sc = groups[n].sort(function (a, b) { return a.id - b.id; });
    var anchor = sc.reduce(function (best, s) { return s.saplings > best.saplings ? s : best; }, sc[0]);
    sc = [anchor].concat(sc.filter(function (s) { return s !== anchor; }));
    var given = sc.filter(function (s) { return s.assignedTo; }).length;
    return {
      no: n, taluk: anchor.taluk, inPref: pref ? sc.some(function (s) { return inPref_(s, pref); }) : true,
      schools: sc.map(function (s) {
        return { id: s.id, name: s.name, taluk: s.taluk, hobli: s.hobli, gp: s.gp, village: s.village, saplings: s.saplings, seeds: s.seeds,
                 activity: s.activity, assignedTo: s.assignedTo, assignedName: s.assignedName || s.assignedTo, students: s.students, lastVisit: s.lastVisit || '',
                 notWilling: s.notWilling, caution: s.caution, mine: s.mine, alerts: s.alerts || [] };
      }),
      saplings: sc.reduce(function (t, s) { return t + (s.saplings || 0); }, 0),
      seeds: sc.reduce(function (t, s) { return t + (s.seeds || 0); }, 0),
      given: given, state: given === 0 ? 'free' : given === sc.length ? 'given' : 'partly',
      visited: sc.filter(function (s) { return s.lastVisit; }).length
    };
  }).filter(function (g) {
    if (!g.inPref) return false;
    if (f.taluk && g.taluk !== f.taluk) return false;
    if (f.show === 'visited') { if (!g.visited) return false; }                                  // v9.11: groups with a visited school
    else if (f.show === 'notvisited') { if (!g.given || g.visited) return false; }               // given, none visited yet
    else if (f.show && f.show !== 'all' && g.state !== f.show) return false;
    if (q) {
      if (qn) return g.no === Number(qn[1]);
      return g.schools.some(function (s) { return (s.name + ' ' + s.village + ' ' + s.gp).toLowerCase().indexOf(q) >= 0; });
    }
    return true;
  });
  var taluks = all.map(function (s) { return s.taluk; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
  return { total: list.length, groups: list.slice(0, Math.max(25, Number(f.limit) || 25)), taluks: taluks, pref: pref };
}
// ===== END 30.1 =====

// ===== START 30.2 Give schools to a person =====
// Admin: any school to anyone in the Vol tab (a school that is already given moves to the new person).
// Coordinator: only free schools, only to their own volunteers (or to themselves).
// Nothing else is blocked: "Not ready", "Merged" and "Not willing" schools only show a caution on the page.
function assignSchools_(person, req) {
  need_(person, 'Coordinator');
  var to = email_(req.to);
  if (!to) throw new Error('Choose the person.');
  var volRow = null;
  read_(tab_('Vol tab')).rows.forEach(function (r) { if (!volRow && email_(get_(r, 'Login email')) === to) volRow = r; });
  if (!volRow) throw new Error(to + ' is not in the Vol tab.');
  if (person.role === 'Coordinator' && to !== person.email && !isMyVolunteer_(volRow, person)) throw new Error('You can give schools only to your own volunteers.');
  var ids = (req.schoolIds || []).map(String);
  if (!ids.length) throw new Error('Choose at least one school.');
  var all = allSchools_(), byId = {};
  all.forEach(function (s) { byId[String(s.id)] = s; });
  var give = {}, skipped = [];
  ids.forEach(function (id) {
    var s = byId[id];
    if (!s) { skipped.push(id + ' (not found)'); return; }
    if (s.assignedTo === to) { skipped.push(s.name + ' (already with this person)'); return; }
    if (person.role === 'Coordinator' && s.assignedTo) { skipped.push(s.name + ' (already given)'); return; }
    give[id] = { 'Assigned to': to, 'Assigned on': now_(), 'Assigned by': person.email };
  });
  var n = setStatusMany_(give);
  if (n) log_(person.email, 'Schools given', n + ' to ' + to + ': ' + Object.keys(give).join(', '));
  return { ok: true, given: n, skipped: skipped, ids: Object.keys(give) };
}
// Writes values for many schools at once (one read of School Status). Returns how many schools were written.
function setStatusMany_(byId) {
  var ids = Object.keys(byId);
  if (!ids.length) return 0;
  var sh = tab_('School Status'), data = read_(sh), n = 0;
  data.rows.forEach(function (r) {
    var v = byId[String(get_(r, 'School ID'))];
    if (!v) return;
    Object.keys(v).forEach(function (h) {
      var c = data.head.indexOf(h);
      if (c >= 0) sh.getRange(r._row, c + 1).setValue(v[h]);
    });
    n++;
  });
  touch_();
  clearSchoolsCache_();
  return n;
}
// ===== END 30.2 =====

// ===== START 30.3 Take schools back =====
// Admin: any school. Coordinator: schools of their own volunteers (or their own).
function takeBack_(person, req) {
  need_(person, 'Coordinator');
  var emails = scopeEmails_(person);
  var ids = (req.schoolIds || []).map(String), byId = {}, back = {}, skipped = [];
  allSchools_().forEach(function (s) { byId[String(s.id)] = s; });
  ids.forEach(function (id) {
    var s = byId[id];
    if (!s || !s.assignedTo) { skipped.push((s ? s.name : id) + ' (not given)'); return; }
    if (!inScope_(emails, s)) { skipped.push(s.name + ' (not your volunteer\'s)'); return; }
    back[id] = { 'Assigned to': '', 'Assigned on': '', 'Assigned by': '' };
  });
  var n = setStatusMany_(back);
  if (n) log_(person.email, 'Schools taken back', Object.keys(back).join(', '));
  return { ok: true, taken: n, skipped: skipped, ids: Object.keys(back) };
}
// ===== END 30.3 =====


/* =====================================================================
 *  Part 40  Vol tab
 * ===================================================================== */

// ===== START 40.1 Add new sign-ups to the Vol tab =====
// Runs every 15 minutes (trigger made in 90.7), and from setup.
// It ONLY ADDS people who are new. It never changes or deletes a row in the Vol tab,
// so whatever the admin changed there (Status, Role, Coordinator, Login email) stays.
// People are matched by "Sign-up email", exactly as typed in the form.
function refreshVolTab() {
  touch_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { added: 0, note: 'Busy, try again in a minute.' };
  try {
    var signups = userTab_('TAB_SIGNUPS');
    var vol = tab_('Vol tab');
    if (!vol) throw new Error('The Vol tab does not exist yet. Run setupAll first.');

    var src = read_(signups);
    // If the import is not working at the moment (#REF!, Loading...), do nothing.
    var firstCell = String(signups.getRange(1, 1).getDisplayValue() || '');
    if (/^#|loading/i.test(firstCell) || !('email' in src.col)) {
      log_('refresh', 'Vol tab refresh skipped', 'The sign-up tab is not readable right now: ' + firstCell);
      return { added: 0, note: 'Sign-up tab not readable right now.' };
    }

    var have = {};
    read_(vol).rows.forEach(function (r) {
      have[email_(get_(r, 'Sign-up email'))] = true;
      have[email_(get_(r, 'Login email'))] = true;
    });

    var add = [];
    src.rows.forEach(function (r) {
      var raw = clean_(get_(r, 'Email'));
      var key = email_(raw);
      if (!key || have[key]) return;                 // blank, already there, or repeated email
      have[key] = true;
      var name = [clean_(get_(r, 'First Name')), clean_(get_(r, 'Last Name'))].filter(String).join(' ');
      add.push({
        'Login email': key,
        'Sign-up email': raw,
        'Name': name,
        'Role': 'Volunteer',
        'Status': 'Active',
        'Coordinator': '',
        'Note': emailWarning_(key),
        'Added on': now_(),
        'Added by': 'Sign-up form'
      });
    });
    if (add.length) {
      append_(vol, add);
      log_('refresh', 'Vol tab: new sign-ups added', add.length + ' added');
    }
    return { added: add.length };
  } finally {
    lock.releaseLock();
  }
}
// ===== END 40.1 =====

// ===== START 40.2 Email spelling check =====
// Returns a short note for the admin when an email looks mistyped. Nothing is blocked.
function emailWarning_(e) {
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) return 'Check email spelling (not a valid email)';
  var domain = e.split('@')[1];
  var typos = ['gamil.com', 'gmial.com', 'gmai.com', 'gmail.co', 'gmal.com', 'gnail.com', 'gmail.con', 'gmaill.com', 'gmail.cm', 'yahho.com', 'yaho.com'];
  if (typos.indexOf(domain) >= 0) return 'Check email spelling (' + domain + ')';
  return '';
}
// ===== END 40.2 =====

// ===== START 40.3 Volunteer list (for coordinators and the admin) =====
// Admin: everybody in the Vol tab. Coordinator: only people whose Coordinator is them (email or name).
// Sign-up details (phone, centre, wished schools, preferred area) are read fresh from the sign-up tab.
function volunteerList_(person) {
  var rows = read_(tab_('Vol tab')).rows;
  var counts = {}, names = {}, list = {}, visited = {};
  allSchools_().forEach(function (s) {
    if (!s.assignedTo) return;
    counts[s.assignedTo] = (counts[s.assignedTo] || 0) + 1;
    if (s.lastVisit) visited[s.assignedTo] = (visited[s.assignedTo] || 0) + 1;
    (names[s.assignedTo] = names[s.assignedTo] || []).push(s.name);
    (list[s.assignedTo] = list[s.assignedTo] || []).push({ id: s.id, name: s.name, village: s.village, taluk: s.taluk, notWilling: s.notWilling, caution: s.caution, lastVisit: s.lastVisit, alerts: s.alerts || [] });
  });
  // coordinators, so the Coordinator cell (email or name) can be shown as a name
  var coords = rows.filter(function (r) { return /^coord/i.test(String(clean_(get_(r, 'Role')))); }).map(function (r) {
    return { email: email_(get_(r, 'Login email')), name: clean_(get_(r, 'Name')) || email_(get_(r, 'Login email')) };
  });
  var coordOf = function (r) {
    var hit = null;
    coords.forEach(function (c) { if (!hit && isMyVolunteer_(r, c)) hit = c; });
    return hit;
  };
  var remarks = remarksByVol_();
  var signup = {};
  try {
    read_(userTab_('TAB_SIGNUPS')).rows.forEach(function (r) {
      var k = email_(get_(r, 'Email'));
      if (k && !signup[k]) signup[k] = r;
    });
  } catch (e) { /* sign-up tab not readable right now: show the list without those details */ }
  return rows.filter(function (r) {
    return person.role === 'Admin' || isMyVolunteer_(r, person);
  }).map(function (r) {
    var login = email_(get_(r, 'Login email')), su = signup[email_(get_(r, 'Sign-up email'))] || {};
    var pT = String(clean_(get_(su, 'Taluk'))), pH = String(clean_(get_(su, 'Hobli'))), pG = String(clean_(get_(su, 'Gram Panchayat')));
    var area = [pT, pH, pG].filter(String).join(' · ');
    var c = coordOf(r);
    return {
      email: login,
      signupEmail: clean_(get_(r, 'Sign-up email')),
      name: clean_(get_(r, 'Name')) || login,
      role: clean_(get_(r, 'Role')) || 'Volunteer',
      status: clean_(get_(r, 'Status')) || 'Active',
      coordinator: c ? c.email : String(clean_(get_(r, 'Coordinator'))),
      coordinatorName: c ? c.name : String(clean_(get_(r, 'Coordinator'))),
      visited: visited[login] || 0,
      remarks: remarks[login] || [],
      note: clean_(get_(r, 'Note')),
      phone: String(clean_(get_(su, 'Calling Number')) || clean_(get_(su, 'WhatsApp Number')) || ''),
      centre: clean_(get_(su, 'Local Isha Center Name')),
      wants: clean_(get_(su, 'No. of Schools you wish to Adopt')),
      area: area, pTaluk: pT, pHobli: pH, pGp: pG,
      schools: counts[login] || 0,
      schoolNames: names[login] || [],
      schoolList: list[login] || []
    };
  }).sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
}
// ===== END 40.3 =====

// ===== START 40.4 Admin overview numbers =====
function overview_() {
  var schools = allSchools_();
  var vols = read_(tab_('Vol tab')).rows;
  var groups = {};
  schools.forEach(function (s) {
    if (!s.group) return;
    groups[s.group] = groups[s.group] || { n: 0, assigned: 0 };
    groups[s.group].n++;
    if (s.assignedTo) groups[s.group].assigned++;
  });
  var gk = Object.keys(groups);
  var active = function (r) { return String(clean_(get_(r, 'Status'))).toLowerCase() === 'active'; };
  var roleIs = function (r, x) { return String(clean_(get_(r, 'Role'))).toLowerCase().indexOf(x) === 0; };
  return {
    schools: schools.length,
    grouped: schools.filter(function (s) { return s.group; }).length,
    caution: schools.filter(function (s) { return s.caution; }).length,
    assigned: schools.filter(function (s) { return s.assignedTo; }).length,
    groups: gk.length,
    groupsFree: gk.filter(function (g) { return groups[g].assigned === 0; }).length,
    volunteersActive: vols.filter(function (r) { return active(r) && roleIs(r, 'vol'); }).length,
    coordinatorsActive: vols.filter(function (r) { return active(r) && roleIs(r, 'coord'); }).length,
    adminsActive: vols.filter(function (r) { return active(r) && roleIs(r, 'admin'); }).length,
    inactive: vols.filter(function (r) { return !active(r); }).length,
    emailChecks: vols.filter(function (r) { return /check email/i.test(String(get_(r, 'Note'))); }).length
  };
}
// ===== END 40.4 =====

// ===== START 40.5 Change people (admin): role, status, coordinator, email =====
// Writes only into the Vol tab (never into the sign-up tab). "Changed on" and "Changed by" are filled.
// req.emails: the Login emails of the rows to change; req.set: any of
//   loginEmail (one person only), name, role, status, coordinator ('' removes), note
function savePeople_(person, req) {
  need_(person, 'Admin');
  var emails = (req.emails || []).map(email_).filter(String);
  if (!emails.length) throw new Error('Choose at least one person.');
  var set = req.set || {}, map = {};
  if ('loginEmail' in set) {
    if (emails.length > 1) throw new Error('Change the email of one person at a time.');
    var ne = email_(set.loginEmail);
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(ne)) throw new Error('That email does not look right.');
    map['Login email'] = ne;
    map['Note'] = emailWarning_(ne);
  }
  if ('name' in set) map['Name'] = String(set.name || '').trim();
  if ('role' in set) {
    if (['Volunteer', 'Coordinator', 'Admin'].indexOf(set.role) < 0) throw new Error('Unknown role.');
    map['Role'] = set.role;
  }
  if ('status' in set) {
    if (['Active', 'Inactive'].indexOf(set.status) < 0) throw new Error('Unknown status.');
    map['Status'] = set.status;
  }
  if ('coordinator' in set) map['Coordinator'] = email_(set.coordinator);
  if ('note' in set) map['Note'] = String(set.note || '').slice(0, 300);
  if (map['Status'] === 'Inactive' && emails.indexOf(person.email) >= 0) throw new Error('You cannot make yourself inactive.');
  if (map['Role'] && map['Role'] !== 'Admin' && emails.indexOf(person.email) >= 0) throw new Error('You cannot remove your own Admin role.');
  map['Changed on'] = now_();
  map['Changed by'] = person.email;
  var sh = tab_('Vol tab'), data = read_(sh), n = 0;
  if (map['Login email']) {
    data.rows.forEach(function (r) { if (email_(get_(r, 'Login email')) === map['Login email']) throw new Error(map['Login email'] + ' is already in the Vol tab.'); });
  }
  data.rows.forEach(function (r) {
    if (emails.indexOf(email_(get_(r, 'Login email'))) < 0) return;
    Object.keys(map).forEach(function (h) {
      var c = data.head.indexOf(h);
      if (c >= 0) sh.getRange(r._row, c + 1).setValue(map[h]);
    });
    n++;
  });
  touch_();
  emails.forEach(forgetPerson_);
  if (map['Login email'] && n) {
    forgetPerson_(map['Login email']);
    // the person's schools move with the new email
    var move = {};
    allSchools_().forEach(function (s) { if (s.assignedTo === emails[0]) move[String(s.id)] = { 'Assigned to': map['Login email'] }; });
    setStatusMany_(move);
  }
  log_(person.email, 'People changed', emails.join(', ') + ': ' + JSON.stringify(set));
  return { ok: true, changed: n };
}
// ===== END 40.5 =====


/* =====================================================================
 *  Part 45  Private remarks on volunteers (coordinators and admin only)
 * ===================================================================== */

// ===== START 45.1 Add a remark =====
// Never shown to volunteers. Kind: Positive, Concern or Other.
function addRemark_(person, req) {
  need_(person, 'Coordinator');
  var vol = email_(req.volunteer);
  var row = null;
  read_(tab_('Vol tab')).rows.forEach(function (r) { if (!row && email_(get_(r, 'Login email')) === vol) row = r; });
  if (!row) throw new Error('Person not found.');
  if (person.role === 'Coordinator' && !isMyVolunteer_(row, person)) throw new Error('You can write remarks only about your own volunteers.');
  var text = String(req.remark || '').trim();
  if (!text) throw new Error('Write the remark.');
  var m = String(req.aboutDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  append_(tab_('Remarks'), [{
    'Remark ID': 'R-' + stamp_(),
    'Volunteer': vol, 'Kind': req.kind || 'Other', 'Remark': text.slice(0, 2000),
    'About date': m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : '',
    'Written by': person.email, 'Written on': now_()
  }]);
  return { ok: true };
}
// ===== END 45.1 =====

// ===== START 45.2 Read remarks =====
// { volunteer email: [ {kind, remark, about, by, on, recent}, ... newest first ] }
function remarksByVol_() {
  var sh = tab_('Remarks'), out = {};
  if (!sh) return out;
  var monthAgo = Date.now() - 30 * 86400000;
  read_(sh).rows.forEach(function (r) {
    var v = email_(get_(r, 'Volunteer')), on = get_(r, 'Written on'), ab = get_(r, 'About date');
    (out[v] = out[v] || []).unshift({
      kind: clean_(get_(r, 'Kind')), remark: clean_(get_(r, 'Remark')),
      about: ab instanceof Date ? ist_(ab, 'd MMM yyyy') : '',
      by: email_(get_(r, 'Written by')), on: on instanceof Date ? ist_(on, 'd MMM yyyy') : '',
      recent: on instanceof Date && on.getTime() > monthAgo
    });
  });
  return out;
}
// ===== END 45.2 =====


/* =====================================================================
 *  Part 56  Filled A4 forms (photos uploaded by volunteers)
 * ===================================================================== */

// ===== START 56.1 Save an uploaded A4 form =====
// The volunteer chooses one of their schools, the visit date, and 1 to 5 photos
// (or PDFs) of the filled A4 form. Files go to the A4 folder (FOLDER_A4_FORMS);
// one row goes to the "A4 uploads" tab, where the office later marks it as entered.
function saveA4Upload_(person, req) {
  var files = req.files || [];
  if (!files.length) throw new Error('Choose at least one photo of the filled form.');
  if (files.length > 5) throw new Error('Up to 5 files at a time, please.');
  var school = openSchool_(person, req.schoolId);
  var m = String(req.visitDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Choose the date of the visit.');
  var visitDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  var folder = folder_(PROP.FOLDER_A4_FORMS);
  var who = person.email.split('@')[0].replace(/[^A-Za-z0-9]/g, '');
  var base = 'A4_' + school.id + '_' + school.udise + '_' + m[0] + '_' + who;
  var links = [];
  files.forEach(function (f, i) {
    var bytes = Utilities.base64Decode(String(f.data || '').replace(/^data:[^,]*,/, ''));
    if (bytes.length > 8 * 1024 * 1024) throw new Error('A file is larger than 8 MB. Please take the photo again.');
    var mime = /pdf/i.test(f.type) ? 'application/pdf' : 'image/jpeg';
    var name = base + '_' + (i + 1) + (mime === 'application/pdf' ? '.pdf' : '.jpg');
    var file = folder.createFile(Utilities.newBlob(bytes, mime, name));
    file.setDescription('Filled A4 form. School ' + school.id + ' ' + school.name + ', visit ' + m[0] + ', uploaded by ' + person.email);
    links.push(file.getUrl());
  });

  var id = 'A4-' + stamp_() + '-' + school.id;
  append_(tab_('A4 uploads'), [{
    'Upload ID': id, 'School ID': school.id, 'UDISE Code': school.udise, 'School Name': school.name,
    'Visit date': visitDate, 'Volunteer': person.email, 'Files': links.length, 'File links': links.join('\n'),
    'Note': String(req.note || '').slice(0, 1000), 'Uploaded on': now_()
  }]);
  clearSchoolsCache_();
  log_(person.email, 'A4 uploaded', id + ' (' + links.length + ' files)');
  return { ok: true, id: id, files: links.length, links: person.role === 'Admin' ? links : [] };
}
// ===== END 56.1 =====

// ===== START 56.2 A person's recent A4 uploads =====
function myA4Uploads_(person) {
  var sh = tab_('A4 uploads');
  if (!sh) return [];
  return read_(sh).rows.filter(function (r) { return email_(get_(r, 'Volunteer')) === person.email; })
    .map(function (r) {
      var d = get_(r, 'Visit date'), u = get_(r, 'Uploaded on');
      return {
        school: clean_(get_(r, 'School Name')),
        visitDate: d instanceof Date ? ist_(d, 'd MMM yyyy') : String(d),
        uploadedOn: u instanceof Date ? ist_(u, 'd MMM yyyy, HH:mm') : String(u),
        files: num_(get_(r, 'Files')) || 0,
        entered: /^y/i.test(String(clean_(get_(r, 'Office entered'))))
      };
    }).reverse().slice(0, 10);
}
// ===== END 56.2 =====

// ===== START 56.3 All A4 uploads (for the office) =====
function a4List_() {
  var sh = tab_('A4 uploads');
  if (!sh) return [];
  return read_(sh).rows.map(function (r) {
    var d = get_(r, 'Visit date'), u = get_(r, 'Uploaded on');
    return {
      id: clean_(get_(r, 'Upload ID')),
      visitDay: d instanceof Date ? ist_(d, 'yyyy-MM-dd') : '',
      enteredBy: email_(get_(r, 'Office entered by')),
      schoolId: num_(get_(r, 'School ID')), school: clean_(get_(r, 'School Name')),
      visitDate: d instanceof Date ? ist_(d, 'd MMM yyyy') : String(d),
      uploadedOn: u instanceof Date ? ist_(u, 'd MMM yyyy, HH:mm') : String(u),
      by: email_(get_(r, 'Volunteer')), files: num_(get_(r, 'Files')) || 0,
      links: String(get_(r, 'File links') || '').split(/\n/).filter(String), note: clean_(get_(r, 'Note')),
      entered: /^y/i.test(String(clean_(get_(r, 'Office entered'))))
    };
  }).reverse().slice(0, 200);
}
// ===== END 56.3 =====


/* =====================================================================
 *  Part 50  Call log
 * ===================================================================== */

// ===== START 50.1 Save a call =====
// Who did you speak to, how did the call go ("Other" opens a text box), notes, next visit planned,
// the ticks "Pit digging / tree guard" and "Concern" (alerts for the coordinator and office, like the visit remarks),
// and the tick "School not willing to support", which marks the school (reason = the notes).
function saveCall_(person, req) {
  var s = openSchool_(person, req.schoolId);
  var m = String(req.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Choose the date of the call.');
  if (!req.who) throw new Error('Choose who you spoke to.');
  if (!req.how) throw new Error('Choose how the call went.');
  var n = String(req.next || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var notWilling = !!req.notWilling;
  if (notWilling && !String(req.notes || '').trim()) throw new Error('Write the reason the school is not willing, in the notes.');
  append_(tab_('Calls'), [{
    'Call ID': 'C-' + stamp_() + '-' + s.id,
    'School ID': s.id, 'Call date': new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
    'Volunteer': person.email, 'Who did you speak to': req.who, 'Who (other)': req.who === 'Other' ? String(req.whoOther || '') : '',
    'How did the call go': req.how, 'How (other)': req.how === 'Other' ? String(req.howOther || '') : '',
    'School not willing': notWilling ? 'Yes' : '', 'Notes': String(req.notes || '').slice(0, 2000),
    'Next visit planned': n ? new Date(Number(n[1]), Number(n[2]) - 1, Number(n[3])) : '',
    'Saved on': now_(), 'Saved by': person.email,
    'Remarks ticks': (req.ticks || []).filter(function (t) { return alertKinds_(t).length; }).join(', ')
  }]);
  if (notWilling) {
    setStatus_(s.id, { 'Not willing': 'Yes', 'Not willing reason': String(req.notes || '').slice(0, 500), 'Not willing by': person.email, 'Not willing on': now_() });
  }
  clearSchoolsCache_();
  log_(person.email, 'Call saved', 'School ' + s.id + (notWilling ? ' (not willing)' : ''));
  return { ok: true };
}
// ===== END 50.1 =====


/* =====================================================================
 *  Part 55  Record your visit
 * ===================================================================== */

// ===== START 55.1 Who may record a visit =====
// Admin (office): any school, any time (also when the switches are Off).
// Volunteer: own schools, only while VISIT_FORM_VOLUNTEERS is On.
// Coordinator: own schools, only while VISIT_FORM_COORDINATORS is On.
function visitAllowed_(person, school) {
  if (person.role === 'Admin') return true;
  if (school.assignedTo !== person.email) return false;
  var st = settings_();
  var sw = person.role === 'Coordinator' ? st.VISIT_FORM_COORDINATORS : st.VISIT_FORM_VOLUNTEERS;
  return /^on$/i.test(String(sw).trim());
}
// ===== END 55.1 =====

// ===== START 55.2 Save a visit (new or edited) =====
// req: schoolId, v (the answers), photos (up to 5), visitId (when editing), a4Id (office entering an A4 upload),
//      volunteer (office: whose visit it is; default the school's volunteer).
// Only the visit date and "How did the visit go" are needed; everything else is optional (no hard rules).
// The answer carries the school's visit list, so the page can show it without loading again.
function saveVisit_(person, req) {
  var s = openSchool_(person, req.schoolId);
  if (!visitAllowed_(person, s)) throw new Error('Record your visit is switched off for you. Please use the physical (A4) form.');
  var v = req.v || {};
  var m = String(v.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error('Choose the date of the visit.');
  if (!v.how) throw new Error('Choose how the visit went.');
  var n = function (x) { var k = num_(x); return k === null || k < 0 ? '' : k; };
  var yes = function (b) { return b ? 'Yes' : ''; };
  var list = function (a) { return (a || []).filter(String).join(', '); };
  // v9.7: Engagement = ticks only (Games, Awareness)
  var acts = (v.actTicks || []).filter(function (a) { return a === 'Games' || a === 'Awareness'; });
  var mom = v.momYN === 'Yes';
  var sap = !!v.saplingsTicked, sed = !!v.seedsTicked, nobody = v.wWho === 'Nobody';
  var row = {
    'Visit date': new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
    'How did the visit go': String(v.how), 'Who all accompanied you': String(v.accompanied || '').slice(0, 500),
    'Saplings ticked': yes(sap), 'Seeds ticked': yes(sed),
    'Saplings given': sap ? n(v.sGiven) : '', 'Saplings planted': sap ? (v.sPlantedYN || '') : '',
    'Why not planted': sap ? String(v.sWhyNot || '') : '', 'Planted': sap ? n(v.sPlanted) : '',
    'Alive now': sap ? n(v.sAlive) : '', 'Dead': sap ? n(v.sDead) : '',
    'Health of surviving saplings': sap ? (v.sHealth || '') : '', 'Why died': sap ? list(v.sWhyDied) : '',
    'Why died (other)': sap ? String(v.sWhyDiedOther || '') : '',
    'Replacement asked': sap ? (v.sReplace || '') : '', 'Replacement how many': sap && v.sReplace === 'Yes' ? n(v.sReplaceN) : '',
    // v9.5: seeds = three numbers only (given, sown into packets, grew into saplings).
    // 'Why not sown', 'Health of saplings from seeds' and 'Where planted' are no longer asked; their old answers stay in the Sheet.
    // v9.7: seeds = given (number), sown into packets (Yes/No), why not; 'Seeds grew and planted' no longer asked
    'Seeds given': sed ? n(v.dGiven) : '', 'Seeds sown into packets': sed ? (v.dSown === 'Yes' || v.dSown === 'No' ? v.dSown : '') : '',
    'Why not sown': sed && v.dSown === 'No' ? String(v.dWhyNot || '').slice(0, 500) : '',
    // v9.6: watering is asked for saplings only
    'Who waters': sap ? (v.wWho || '') : '', 'Who waters (other)': sap && v.wWho === 'Other' ? String(v.wWhoOther || '') : '',
    'How often watered': sap && !nobody ? (v.wOften || '') : '', 'Water source': sap && !nobody ? String(v.wSource || '') : '',
    'Activities': acts.join(', '),
    'Miracle of Mind session': v.momYN === 'Yes' || v.momYN === 'No' ? v.momYN : '',
    'Miracle of Mind students': mom ? n(v.momStudents) : '', 'Miracle of Mind teachers': mom ? n(v.momTeachers) : '',
    'Remarks ticks': list(v.rTicks), 'Remarks': String(v.remarks || '').slice(0, 3000),
    'Form data (app)': JSON.stringify(v).slice(0, 45000)
  };

  // photos of the visit (optional) go to the Visit records folder
  var photos = (req.photos || []).slice(0, 5), links = [];
  if (photos.length) {
    var folder = folder_(PROP.FOLDER_VISIT_RECORDS);
    photos.forEach(function (p, i) {
      var bytes = Utilities.base64Decode(String(p.data || '').replace(/^data:[^,]*,/, ''));
      if (bytes.length > 8 * 1024 * 1024) throw new Error('A photo is larger than 8 MB.');
      var f = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', 'Visit_' + s.id + '_' + s.udise + '_' + m[0] + '_' + (i + 1) + '_' + Date.now() + '.jpg'));
      f.setDescription('Visit photo. School ' + s.id + ' ' + s.name + ', visit ' + m[0] + ', by ' + person.email);
      links.push(f.getUrl());
    });
  }

  var sh = tab_('Visits'), id;
  if (req.visitId) {
    var data = read_(sh), hit = null;
    data.rows.forEach(function (r) { if (clean_(get_(r, 'Visit ID')) === String(req.visitId)) hit = r; });
    if (!hit || String(get_(hit, 'School ID')) !== String(s.id)) throw new Error('Visit not found.');
    if (!canEditVisit_(person, hit)) throw new Error('Only the person who entered this visit can change it, within ' + settings_().EDIT_HOURS + ' hours. Ask the office for later changes.');
    var old = String(get_(hit, 'Photo links') || '');
    row['Photo links'] = [old].concat(links).filter(String).join('\n');
    row['Edited on'] = now_();
    putRow_(sh, data, hit._row, row);
    id = req.visitId;
    log_(person.email, 'Visit edited', id);
  } else {
    var office = person.role === 'Admin' && s.assignedTo !== person.email;
    id = 'V-' + stamp_() + '-' + s.id;
    row['Visit ID'] = id;
    row['School ID'] = s.id;
    row['Volunteer'] = office ? (email_(req.volunteer) || s.assignedTo || '') : person.email;
    row['Entered by'] = person.email;
    row['Source'] = req.a4Id ? 'Office (A4 photo)' : office ? 'Office' : 'Self';
    row['A4 upload ID'] = req.a4Id || '';
    row['Photo links'] = links.join('\n');
    row['Saved on'] = now_();
    append_(sh, [row]);
    if (req.a4Id) markA4Entered_(person, req.a4Id, id);
    log_(person.email, 'Visit saved', id + (req.a4Id ? ' from ' + req.a4Id : ''));
  }
  var nowNotWilling = false;
  if ((v.rTicks || []).some(function (t) { return /not willing/i.test(t); }) && !s.notWilling) {
    setStatus_(s.id, { 'Not willing': 'Yes', 'Not willing reason': String(v.remarks || 'From the visit remarks').slice(0, 500), 'Not willing by': person.email, 'Not willing on': now_() });
    nowNotWilling = true;
  }
  clearSchoolsCache_();
  return { ok: true, id: id, visits: visitsOf_(person, s.id), notWilling: nowNotWilling || s.notWilling };
}
// The person who entered a visit can change it for EDIT_HOURS hours; the admin always.
function canEditVisit_(person, row) {
  if (person.role === 'Admin') return true;
  if (email_(get_(row, 'Entered by')) !== person.email) return false;   // only the person who entered it (or the admin)
  var on = get_(row, 'Saved on');
  var hours = num_(settings_().EDIT_HOURS) || 72;
  return on instanceof Date && (Date.now() - on.getTime()) < hours * 3600000;
}
function markA4Entered_(person, uploadId, visitId) {
  var sh = tab_('A4 uploads'), data = read_(sh);
  data.rows.forEach(function (r) {
    if (clean_(get_(r, 'Upload ID')) !== String(uploadId)) return;
    putRow_(sh, data, r._row, { 'Office entered': 'Yes', 'Office entered by': person.email, 'Office entered on': now_(), 'Visit ID': visitId });
  });
}
// ===== END 55.2 =====

// ===== START 55.3 Delete a visit =====
// Nothing is removed from the Sheet: the row is marked Deleted = Yes and no longer counted.
function deleteVisit_(person, req) {
  var sh = tab_('Visits'), data = read_(sh), hit = null;
  data.rows.forEach(function (r) { if (clean_(get_(r, 'Visit ID')) === String(req.visitId)) hit = r; });
  if (!hit) throw new Error('Visit not found.');
  openSchool_(person, get_(hit, 'School ID'));
  if (!canEditVisit_(person, hit)) throw new Error('This visit can no longer be deleted.');
  putRow_(sh, data, hit._row, { 'Deleted': 'Yes', 'Edited on': now_() });
  clearSchoolsCache_();
  log_(person.email, 'Visit deleted', req.visitId);
  return { ok: true };
}
// ===== END 55.3 =====

// ===== START 55.4 Visits of one school (history) =====
function visitsOf_(person, schoolId) {
  var sh = tab_('Visits');
  if (!sh) return [];
  return read_(sh).rows.filter(function (r) {
    return String(get_(r, 'School ID')) === String(schoolId) && !/^y/i.test(String(clean_(get_(r, 'Deleted'))));
  }).map(function (r) {
    var d = get_(r, 'Visit date'), form = {};
    try { form = JSON.parse(String(get_(r, 'Form data (app)') || '{}')); } catch (e) { form = {}; }
    return {
      id: clean_(get_(r, 'Visit ID')), day: d instanceof Date ? ist_(d, 'yyyy-MM-dd') : '',
      date: d instanceof Date ? ist_(d, 'd MMM yyyy') : String(d),
      how: clean_(get_(r, 'How did the visit go')), volunteer: email_(get_(r, 'Volunteer')),
      enteredBy: email_(get_(r, 'Entered by')), source: clean_(get_(r, 'Source')),
      given: num_(get_(r, 'Saplings given')), planted: num_(get_(r, 'Planted')), alive: num_(get_(r, 'Alive now')),
      seedsGiven: num_(get_(r, 'Seeds given')), seedsGrew: num_(get_(r, 'Seeds grew and planted')),
      seedsSownYN: clean_(get_(r, 'Seeds sown into packets')),
      health: clean_(get_(r, 'Health of surviving saplings')),
      mom: clean_(get_(r, 'Miracle of Mind session')), momStudents: num_(get_(r, 'Miracle of Mind students')),
      momTeachers: num_(get_(r, 'Miracle of Mind teachers')), momOthers: num_(get_(r, 'Miracle of Mind others')),
      activities: String(get_(r, 'Activities') || ''), ticks: clean_(get_(r, 'Remarks ticks')), remarks: clean_(get_(r, 'Remarks')),
      photos: String(get_(r, 'Photo links') || '').split(/\n/).filter(String).length,
      canEdit: canEditVisit_(person, r), form: form
    };
  }).sort(function (a, b) { return a.day < b.day ? 1 : -1; });
}
// ===== END 55.4 =====


/* =====================================================================
 *  Part 60  Update details (corrections)
 * ===================================================================== */

// ===== START 60.1 Fields that can be corrected =====
// [name in the Corrections tab, field in the app, label on the screen]. "Other" is free text.
var CORR_FIELDS = [
  ['School Name', 'name', 'School name'],
  ['UDISE Code', 'udise', 'UDISE code'],
  ['Taluk', 'taluk', 'Taluk'],
  ['Hobli', 'hobli', 'Hobli'],
  ['GP Name / ULB Name', 'gp', 'Gram panchayat (GP)'],
  ['Village / Ward', 'village', 'Village'],
  ['No. of Students', 'students', 'Number of students'],
  ['HM/ Principal Name', 'hmName', 'Head master or principal: name'],
  ['HM/ Principal Number', 'hmPhone', 'Head master or principal: number'],
  ['Alternative Contact Name', 'altName', 'Alternative contact: name'],
  ['Alternative Contact Number', 'altPhone', 'Alternative contact: number'],
  ['Saplings Count', 'saplings', 'Saplings given (species-wise)'],
  ['Seeds Count', 'seeds', 'Seeds given'],
  ['Other', '', 'Other (write what)']
];
function corrField_(key) {
  for (var i = 0; i < CORR_FIELDS.length; i++) if (CORR_FIELDS[i][0] === key) return CORR_FIELDS[i];
  return null;
}
// ===== END 60.1 =====

// ===== START 60.2 Read corrections (approved and waiting) =====
// approved: { schoolId: { field: newest approved value } }   (shown in place of School Data)
// pending:  { schoolId: { field: { value, old, species, by, on } } }
function readCorrections_() {
  var out = { approved: {}, pending: {} };
  var sh = tab_('Corrections');
  if (!sh) return out;
  read_(sh).rows.forEach(function (r) {
    var f = corrField_(clean_(get_(r, 'Field')));
    var id = String(get_(r, 'School ID')), st = String(clean_(get_(r, 'Status'))).toLowerCase();
    if (!f) return;
    var val = clean_(get_(r, 'New value'));
    if (val instanceof Date) val = ist_(val, 'd MMM yyyy');
    var prop = f[1] || 'other';
    if (['students', 'saplings', 'seeds'].indexOf(prop) >= 0) val = num_(val);
    else val = String(val);
    if (st === 'approved' && f[1]) {
      (out.approved[id] = out.approved[id] || {})[prop] = val;
      if (prop === 'saplings' && clean_(get_(r, 'Species'))) out.approved[id].species = String(clean_(get_(r, 'Species')));
    }
    if (st === 'pending') {
      var on = get_(r, 'Proposed on');
      (out.pending[id] = out.pending[id] || {})[prop] = {
        value: val, old: String(clean_(get_(r, 'Old value'))), species: String(clean_(get_(r, 'Species'))),
        by: email_(get_(r, 'Proposed by')), on: on instanceof Date ? ist_(on, 'd MMM yyyy') : '',
        field: f[0], id: clean_(get_(r, 'Correction ID'))
      };
    }
  });
  return out;
}
// ===== END 60.2 =====

// ===== START 60.3 Propose a correction =====
// Anyone who can open the school proposes; nothing changes until a coordinator or the admin approves.
// Saplings: req.species = [{kind, count}], the new total is their sum.
// The answer carries the school's waiting proposals, so the page can show them without loading again.
function proposeCorrection_(person, req) {
  var s = openSchool_(person, req.schoolId);
  var f = corrField_(req.field);
  if (!f) throw new Error('Choose what to correct.');
  var value = String(req.value === undefined || req.value === null ? '' : req.value).trim(), species = '';
  if (f[1] === 'saplings') {
    var rows = (req.species || []).filter(function (x) { return x && x.kind && num_(x.count) !== null; });
    if (rows.length) {
      value = String(rows.reduce(function (t, x) { return t + num_(x.count); }, 0));
      species = rows.map(function (x) { return x.kind + ' – ' + num_(x.count); }).join('; ');
    }
  }
  if (!value) throw new Error('Write the correct value.');
  if (['students', 'saplings', 'seeds'].indexOf(f[1]) >= 0 && num_(value) === null) throw new Error('Write a number.');
  var old = f[1] ? s[f[1]] : '';
  if (f[1] === 'saplings' && s.species) old = old + ' (' + s.species + ')';
  append_(tab_('Corrections'), [{
    'Correction ID': 'U-' + stamp_() + '-' + s.id,
    'School ID': s.id, 'UDISE Code': "'" + s.udise, 'School Name': s.name,      // so the office finds the school in School Data
    'Field': f[0] === 'Other' ? 'Other' : f[0], 'Species': species,
    'Old value': f[0] === 'Other' ? String(req.what || '').slice(0, 200) : String(old === null ? '' : old),
    'New value': value.slice(0, 1000), 'Proposed by': person.email, 'Proposed on': now_(), 'Status': 'Pending'
  }]);
  clearSchoolsCache_();
  log_(person.email, 'Correction proposed', 'School ' + s.id + ' ' + f[0]);
  return { ok: true, pending: readCorrections_().pending[String(s.id)] || null };
}
// ===== END 60.3 =====

// ===== START 60.4 Corrections list and approval =====
// Admin: all. Coordinator: schools of their volunteers (and their own).
// Approving writes Status = Approved in the Corrections tab. From then on the app shows the new value
// everywhere (School Data keeps the original Phase 1 value; nothing has to be copied by hand).
function correctionsList_(person) {
  need_(person, 'Coordinator');
  var emails = scopeEmails_(person), byId = {};
  allSchools_().forEach(function (s) { byId[String(s.id)] = s; });
  var sh = tab_('Corrections');
  if (!sh) return { pending: [], done: [] };
  var all = read_(sh).rows.map(function (r) {
    var s = byId[String(get_(r, 'School ID'))] || {}, f = corrField_(clean_(get_(r, 'Field'))) || ['', '', clean_(get_(r, 'Field'))];
    var on = get_(r, 'Proposed on'), ap = get_(r, 'Approved on');
    return {
      id: clean_(get_(r, 'Correction ID')), schoolId: s.id, school: s.name || '', assignedTo: s.assignedTo || '', inScope: !!s.id && inScope_(emails, s),
      field: f[2], species: clean_(get_(r, 'Species')), old: String(clean_(get_(r, 'Old value'))), value: String(clean_(get_(r, 'New value'))),
      by: email_(get_(r, 'Proposed by')), on: on instanceof Date ? ist_(on, 'd MMM yyyy, HH:mm') : '',
      status: clean_(get_(r, 'Status')), decidedBy: email_(get_(r, 'Approved by')), decidedOn: ap instanceof Date ? ist_(ap, 'd MMM yyyy') : ''
    };
  }).filter(function (c) { return c.inScope; });
  return {
    pending: all.filter(function (c) { return /^pending$/i.test(c.status); }),
    done: all.filter(function (c) { return !/^pending$/i.test(c.status); }).reverse().slice(0, 30)
  };
}
function decideCorrection_(person, req) {
  need_(person, 'Coordinator');
  var decision = req.decision === 'Approve' ? 'Approved' : req.decision === 'Reject' ? 'Rejected' : '';
  if (!decision) throw new Error('Approve or Reject?');
  var sh = tab_('Corrections'), data = read_(sh), hit = null;
  data.rows.forEach(function (r) { if (clean_(get_(r, 'Correction ID')) === String(req.id)) hit = r; });
  if (!hit) throw new Error('Correction not found.');
  if (!/^pending$/i.test(String(clean_(get_(hit, 'Status'))))) throw new Error('This correction is already decided.');
  var s = schoolById_(get_(hit, 'School ID'));
  if (!inScope_(scopeEmails_(person), s)) throw new Error('This school is not one of your volunteers\'.');
  putRow_(sh, data, hit._row, { 'Status': decision, 'Approved by': person.email, 'Approved on': now_() });
  clearSchoolsCache_();
  log_(person.email, 'Correction ' + decision, req.id);
  return { ok: true, decidedOn: ist_(new Date(), 'd MMM yyyy') };
}
// ===== END 60.4 =====


/* =====================================================================
 *  Part 65  Alerts and "School not willing"
 * ===================================================================== */

// ===== START 65.1 Alerts list =====
// Alerts come from the ticks "Pit digging / tree guard" and "Concern" in a visit's Remarks or in a call log
// (in-app only). "School not willing" is a separate list. Admin: all; coordinator: their volunteers' schools.
function alertKinds_(ticks) {
  var t = String(ticks || ''), kinds = [];
  if (/pit digging|tree guard/i.test(t)) kinds.push('Pit digging / tree guard');
  if (/concern/i.test(t)) kinds.push('Concern');
  if (/follow.?up/i.test(t)) kinds.push('Follow up');   // v9.7
  return kinds;
}
function alerts_(person) {
  need_(person, 'Coordinator');
  var emails = scopeEmails_(person), byId = {};
  allSchools_().forEach(function (s) { byId[String(s.id)] = s; });
  var out = { alerts: [], notWilling: [] };
  var take = function (tabName, idHead, dateHead, notesHead, from) {
    var sh = tab_(tabName);
    if (!sh) return;
    read_(sh).rows.forEach(function (r) {
      if (/^y/i.test(String(clean_(get_(r, 'Deleted'))))) return;
      if (clean_(get_(r, 'Alert done on'))) return;
      var kinds = alertKinds_(get_(r, 'Remarks ticks'));
      if (!kinds.length) return;
      var s = byId[String(get_(r, 'School ID'))];
      if (!s || !inScope_(emails, s)) return;
      var d = get_(r, dateHead);
      out.alerts.push({ visitId: clean_(get_(r, idHead)), from: from, schoolId: s.id, school: s.name, place: [s.village, s.taluk].filter(String).join(' · '),
                        date: d instanceof Date ? ist_(d, 'd MMM yyyy') : '', day: d instanceof Date ? ist_(d, 'yyyy-MM-dd') : '',
                        volunteer: email_(get_(r, 'Volunteer')), kinds: kinds, remarks: clean_(get_(r, notesHead)) });
    });
  };
  take('Visits', 'Visit ID', 'Visit date', 'Remarks', 'visit');
  take('Calls', 'Call ID', 'Call date', 'Notes', 'call');
  out.alerts.sort(function (a, b) { return a.day < b.day ? 1 : -1; });
  var st = {};
  read_(tab_('School Status')).rows.forEach(function (r) { st[String(get_(r, 'School ID'))] = r; });
  Object.keys(byId).forEach(function (id) {
    var s = byId[id];
    if (!s.notWilling || !inScope_(emails, s)) return;
    var r = st[id] || {}, on = get_(r, 'Not willing on');
    out.notWilling.push({ schoolId: s.id, school: s.name, place: [s.village, s.taluk].filter(String).join(' · '), volunteer: s.assignedTo,
                          reason: clean_(get_(r, 'Not willing reason')), by: email_(get_(r, 'Not willing by')),
                          on: on instanceof Date ? ist_(on, 'd MMM yyyy') : '' });
  });
  return out;
}
// ===== END 65.1 =====

// ===== START 65.2 Mark an alert as done =====
// Written on the row of that visit (Visits tab) or call (Calls tab): columns "Alert done by" and "Alert done on".
function alertDone_(person, req) {
  need_(person, 'Coordinator');
  var found = null;
  [['Visits', 'Visit ID'], ['Calls', 'Call ID']].forEach(function (t) {
    if (found) return;
    var sh = tab_(t[0]);
    if (!sh) return;
    var data = read_(sh);
    data.rows.forEach(function (r) { if (!found && clean_(get_(r, t[1])) === String(req.visitId)) found = { sh: sh, data: data, row: r }; });
  });
  if (!found) throw new Error('Alert not found.');
  var s = schoolById_(get_(found.row, 'School ID'));
  if (!inScope_(scopeEmails_(person), s)) throw new Error('Not one of your volunteers\' schools.');
  if (found.data.head.indexOf('Alert done on') < 0) throw new Error('Run setupAll once (adds the "Alert done" columns to the Calls tab).');
  putRow_(found.sh, found.data, found.row._row, { 'Alert done by': person.email, 'Alert done on': now_() });
  clearSchoolsCache_();
  log_(person.email, 'Alert done', req.visitId);
  return { ok: true };
}
// ===== END 65.2 =====

// ===== START 65.3 Set or clear "School not willing" =====
// Coordinator (their volunteers' schools) or admin. Setting needs a reason; clearing is kept in the Log.
function setNotWilling_(person, req) {
  need_(person, 'Coordinator');
  var s = openSchool_(person, req.schoolId);
  if (req.on) {
    var why = String(req.reason || '').trim();
    if (!why) throw new Error('Write the reason.');
    setStatus_(s.id, { 'Not willing': 'Yes', 'Not willing reason': why.slice(0, 500), 'Not willing by': person.email, 'Not willing on': now_() });
  } else {
    setStatus_(s.id, { 'Not willing': '', 'Not willing reason': '', 'Not willing by': person.email, 'Not willing on': now_() });
  }
  log_(person.email, req.on ? 'Not willing set' : 'Not willing cleared', 'School ' + s.id + (req.reason ? ': ' + req.reason : ''));
  return { ok: true };
}
// ===== END 65.3 =====


/* =====================================================================
 *  Part 70  First things: location, front photo, book (all reminders only)
 * ===================================================================== */

// ===== START 70.1 Save the school location =====
// The phone gives the GPS position, or (when location does not work on the phone) the volunteer pastes a
// Google Maps link of the school (short maps.app.goo.gl links are followed to find the position).
// The first time needs no reason; a change needs a reason.
// Saved in School Status (Location link, Latitude, Longitude, date, by); every saved position is
// also kept in the Locations tab (past records, with Method = GPS or Map link). The Places tab is not changed.
function saveLocation_(person, req) {
  var s = openSchool_(person, req.schoolId);
  var lat = Number(req.lat), lng = Number(req.lng), method = 'GPS';
  if (req.link) {
    var p = coordsFromLink_(req.link);
    if (!p) throw new Error('This link has no position in it. In Google Maps, press and hold on the school, then Share and Copy link.');
    lat = p[0]; lng = p[1]; method = 'Map link';
  }
  if (!(lat > 5 && lat < 40 && lng > 65 && lng < 100)) throw new Error('The position looks wrong. Please try again.');
  var had = !!s.location;
  if (had && !String(req.reason || '').trim()) throw new Error('Write why the location is changing.');
  var link = 'https://www.google.com/maps?q=' + lat.toFixed(6) + ',' + lng.toFixed(6);
  setStatus_(s.id, { 'Location link': link, 'Latitude': lat, 'Longitude': lng, 'Location date': now_(), 'Location by': person.email });
  append_(tab_('Locations'), [{ 'School ID': s.id, 'Date': now_(), 'Location link': link, 'Latitude': lat, 'Longitude': lng,
                                'Reason for change': had ? String(req.reason).slice(0, 500) : '', 'By': person.email, 'Method': method }]);
  log_(person.email, (had ? 'Location changed' : 'Location saved') + ' (' + method + ')', 'School ' + s.id);
  return { ok: true, link: link, date: ist_(new Date(), 'd MMM yyyy') };
}
// Finds "lat, lng" in a Google Maps link (or in typed numbers). Short links are followed (up to 5 steps).
function coordsFromLink_(text) {
  var find = function (u) {
    u = decodeURIComponent(String(u || '')).replace(/%2C/gi, ',');
    var pats = [/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
                /[?&](?:q|query|ll|center|destination|daddr|sll)=(?:loc:)?(-?\d{1,2}\.\d+),\s*\+?(-?\d{1,3}\.\d+)/,
                /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/, /\/(-?\d{1,2}\.\d{3,}),\+?(-?\d{1,3}\.\d{3,})/];
    for (var i = 0; i < pats.length; i++) { var m = u.match(pats[i]); if (m) return [Number(m[1]), Number(m[2])]; }
    return null;
  };
  var u = String(text || '').trim(), hit = find(u);
  if (hit) return hit;
  var url = (u.match(/https?:\/\/\S+/) || [''])[0];
  if (!/^https:\/\/([a-z0-9-]+\.)*(goo\.gl|google\.[a-z.]+|g\.co)\//i.test(url)) return null;   // only Google links are followed
  for (var step = 0; step < 5 && url; step++) {
    var res;
    try { res = UrlFetchApp.fetch(url, { followRedirects: false, muteHttpExceptions: true }); } catch (e) { return null; }
    var h = res.getHeaders(), next = h.Location || h.location || '';
    hit = find(next) || (res.getResponseCode() === 200 ? find(res.getContentText().slice(0, 200000)) : null);
    if (hit) return hit;
    url = next;
  }
  return null;
}
// ===== END 70.1 =====

// ===== START 70.2 Save the school front photo (taken once) =====
// The photo goes to the "School front photos" folder (FOLDER_FRONT_PHOTOS); its link, date and
// who took it are written in School Status (Front photo link, Front photo date, Front photo by).
function saveFrontPhoto_(person, req) {
  var s = openSchool_(person, req.schoolId);
  if (s.frontPhoto) return { ok: true, note: 'The front photo is already saved.', link: s.frontPhoto, date: '' };
  var bytes = Utilities.base64Decode(String(req.data || '').replace(/^data:[^,]*,/, ''));
  if (!bytes.length) throw new Error('Choose a photo.');
  if (bytes.length > 8 * 1024 * 1024) throw new Error('The photo is larger than 8 MB. Please take it again.');
  var name = 'Front_' + s.id + '_' + s.udise + '_' + Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd') + '.jpg';
  var file = folder_(PROP.FOLDER_FRONT_PHOTOS).createFile(Utilities.newBlob(bytes, 'image/jpeg', name));
  file.setDescription('School front photo. School ' + s.id + ' ' + s.name + ', by ' + person.email);
  setStatus_(s.id, { 'Front photo link': file.getUrl(), 'Front photo date': now_(), 'Front photo by': person.email });
  log_(person.email, 'Front photo saved', 'School ' + s.id);
  return { ok: true, link: file.getUrl(), date: ist_(new Date(), 'd MMM yyyy') };
}
// ===== END 70.2 =====

// ===== START 70.3 Save the book answer =====
function saveBook_(person, req) {
  var s = openSchool_(person, req.schoolId);
  var v = req.value === 'Yes' ? 'Yes' : req.value === 'No' ? 'No' : '';
  if (!v) throw new Error('Choose Yes or No.');
  setStatus_(s.id, { 'Book given': v, 'Book date': now_(), 'Book by': person.email });
  return { ok: true, date: ist_(new Date(), 'd MMM yyyy') };
}
// ===== END 70.3 =====


/* =====================================================================
 *  Part 75  Media (photos, audio, video added from the school page)
 * ===================================================================== */

// ===== START 75.1 Save a media file =====
// Goes to the Media folder (FOLDER_MEDIA), one row in the Media tab. Up to 25 MB per file.
function saveMedia_(person, req) {
  var s = openSchool_(person, req.schoolId);
  var bytes = Utilities.base64Decode(String(req.data || '').replace(/^data:[^,]*,/, ''));
  if (!bytes.length) throw new Error('Choose a file.');
  if (bytes.length > 25 * 1024 * 1024) throw new Error('The file is larger than 25 MB. Please send a shorter video.');
  var type = String(req.type || 'application/octet-stream');
  var kind = /^image/.test(type) ? 'Photo' : /^audio/.test(type) ? 'Audio' : /^video/.test(type) ? 'Video' : 'File';
  var ext = (String(req.name || '').match(/\.[A-Za-z0-9]{2,5}$/) || [kind === 'Photo' ? '.jpg' : ''])[0];
  var name = 'Media_' + s.id + '_' + s.udise + '_' + Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd_HHmmss') + '_' + kind + ext;
  var file = folder_(PROP.FOLDER_MEDIA).createFile(Utilities.newBlob(bytes, type, name));
  file.setDescription(kind + ' for school ' + s.id + ' ' + s.name + ', by ' + person.email + (req.explanation ? ': ' + req.explanation : ''));
  append_(tab_('Media'), [{
    'Media ID': 'M-' + stamp_() + '-' + s.id, 'School ID': s.id, 'Date': now_(),
    'File name': name, 'Kind': kind, 'File link': file.getUrl(), 'Explanation': String(req.explanation || '').slice(0, 1000), 'By': person.email
  }]);
  log_(person.email, 'Media saved', 'School ' + s.id + ' ' + kind);
  return { ok: true, item: { date: ist_(new Date(), 'd MMM yyyy'), kind: kind, link: file.getUrl(), explanation: String(req.explanation || '').slice(0, 1000), by: person.email } };
}
// ===== END 75.1 =====

// ===== START 75.2 Media of one school =====
function mediaOf_(schoolId) {
  var sh = tab_('Media');
  if (!sh) return [];
  return read_(sh).rows.filter(function (r) { return String(get_(r, 'School ID')) === String(schoolId); }).map(function (r) {
    var d = get_(r, 'Date');
    return { date: d instanceof Date ? ist_(d, 'd MMM yyyy') : '', kind: clean_(get_(r, 'Kind')), link: clean_(get_(r, 'File link')),
             explanation: clean_(get_(r, 'Explanation')), by: email_(get_(r, 'By')) };
  }).reverse().slice(0, 20);
}
// ===== END 75.2 =====


/* =====================================================================
 *  Part 80  Dashboard
 * ===================================================================== */

// ===== START 80.1 Dashboard numbers =====
// Sapling numbers use each school's LATEST visit (saplings only). "Given" is the number written in
// that visit, or else our record (a correction waiting for approval counts at once, as a provisional number).
// Seeds are kept apart: seeds given and how many grew into saplings and were planted.
// f.taluk / f.hobli: drill down. Rows are by taluk, then hobli (inside a taluk), then GP (inside a hobli).
function dashboard_(f) {
  f = f || {};
  var all = allSchools_();
  var level = f.hobli ? 'gp' : f.taluk ? 'hobli' : 'taluk';
  var pick = all.filter(function (s) { return (!f.taluk || s.taluk === f.taluk) && (!f.hobli || s.hobli === f.hobli); });
  var blank = function () { return { schools: 0, adopted: 0, visited: 0, given: 0, planted: 0, alive: 0, seedsGiven: 0, seedsGrew: 0, seedsSown: 0, notWilling: 0 }; };
  var total = blank(), rows = {};
  pick.forEach(function (s) {
    var r = rows[s[level] || '-'] = rows[s[level] || '-'] || blank();
    [total, r].forEach(function (t) {
      t.schools++;
      if (s.assignedTo) t.adopted++;
      if (s.notWilling) t.notWilling++;
      if (s.lastVisit) t.visited++;
      var L = s.latest;
      if (L && L.saplingsTicked && (L.planted !== null || L.alive !== null)) {
        var prov = s.pending && s.pending.saplings ? num_(s.pending.saplings.value) : null;
        t.given += L.given !== null ? L.given : prov !== null ? prov : (s.saplings || 0);
        t.planted += L.planted || 0;
        t.alive += L.alive || 0;
      }
      // v9.7: seeds = given + whether the school sowed them into packets (Yes/No)
      if (L && L.seedsTicked) {
        t.seedsGiven += L.seedsGiven !== null ? L.seedsGiven : (s.seeds || 0);
        t.seedsGrew += L.seedsGrew || 0;
        if (/^y/i.test(L.seedsSownYN)) t.seedsSown++;
      }
    });
  });
  var vols = read_(tab_('Vol tab')).rows.filter(function (r) { return /^active$/i.test(String(clean_(get_(r, 'Status')))); });
  var withSchools = {};
  all.forEach(function (s) { if (s.assignedTo) withSchools[s.assignedTo] = true; });
  var a4 = tab_('A4 uploads') ? read_(tab_('A4 uploads')).rows.filter(function (r) { return !/^y/i.test(String(clean_(get_(r, 'Office entered')))); }).length : 0;
  var pend = 0;
  all.forEach(function (s) { if (s.pending) pend += Object.keys(s.pending).length; });
  return {
    level: level, taluk: f.taluk || '', hobli: f.hobli || '', total: total,
    rows: Object.keys(rows).sort().map(function (k) { return Object.assign({ name: k }, rows[k]); }),
    volunteersWithSchools: vols.filter(function (r) { return withSchools[email_(get_(r, 'Login email'))]; }).length,
    a4Waiting: a4, correctionsWaiting: pend, totalSaplingsRecord: all.reduce(function (t, s) { return t + (s.saplings || 0); }, 0),
    totalSeedsRecord: all.reduce(function (t, s) { return t + (s.seeds || 0); }, 0)
  };
}
// ===== END 80.1 =====


/* =====================================================================
 *  Part 85  Map
 * ===================================================================== */

// ===== START 85.1 Map points =====
// Real GPS (saved by a volunteer, School Status) where it exists; otherwise the village position from the
// Places tab (filled by geocodeVillages); otherwise near the taluk centre. Scope: admin all, coordinator their
// volunteers' schools (and own), volunteer ONLY their own schools.
var TALUK_CENTRES = {
  'chikkaballapura': [13.435, 77.727], 'chikkaballapur': [13.435, 77.727], 'chintamani': [13.400, 78.057],
  'gowribidanur': [13.585, 77.518], 'gauribidanur': [13.585, 77.518], 'bagepalli': [13.783, 77.794],
  'sidlaghatta': [13.389, 77.864], 'shidlaghatta': [13.389, 77.864], 'gudibande': [13.670, 77.703]
};
function placeKey_(t, h, g, v) { return [t, h, g, v].map(function (x) { return String(x || '').toLowerCase().replace(/\s+/g, ' ').trim(); }).join('|'); }
function mapPoints_(person) {
  var emails = scopeEmails_(person);
  var places = {};
  var ps = tab_('Places');
  if (ps) read_(ps).rows.forEach(function (r) {
    var la = num_(get_(r, 'Latitude')), lo = num_(get_(r, 'Longitude'));
    if (la !== null && lo !== null) places[placeKey_(get_(r, 'Taluk'), get_(r, 'Hobli'), get_(r, 'GP'), get_(r, 'Village'))] = [la, lo];
  });
  var list = allSchools_().filter(function (s) { return emails === null || inScope_(emails, s); });
  return list.map(function (s) {
    var lat = s.lat, lng = s.lng, kind = 'gps';
    if (lat === null || lng === null) {
      var p = places[placeKey_(s.taluk, s.hobli, s.gp, s.village)];
      // a small fixed shift per school, so schools of one village do not sit on top of each other
      var j = function (k) { return (((s.id * (k ? 7919 : 104729)) % 1000) / 1000 - 0.5); };
      if (p) { lat = p[0] + j(0) * 0.004; lng = p[1] + j(1) * 0.004; kind = 'village'; }
      else {
        var c = TALUK_CENTRES[String(s.taluk).toLowerCase().trim()] || [13.43, 77.73];
        lat = c[0] + j(0) * 0.12; lng = c[1] + j(1) * 0.12; kind = 'taluk';
      }
    }
    return { id: s.id, n: s.name, u: s.udise, t: s.taluk, h: s.hobli, g: s.gp, v: s.village, la: Math.round(lat * 1e5) / 1e5, lo: Math.round(lng * 1e5) / 1e5,
             k: kind, a: s.assignedTo || '', w: s.notWilling ? 1 : 0, c: s.caution ? 1 : 0, lv: s.lastVisit || '', sp: s.saplings || 0, sd: s.seeds || 0,
             gr: s.groupNo || '', al: (s.alerts || []).length, an: s.assignedName || '', st: s.students };
  });
}
// ===== END 85.1 =====

// ===== START 85.2 geocodeVillages: find village positions (run by hand) =====
// In the editor choose "geocodeVillages" and Run. It looks up about 250 villages per run with Google's
// geocoder and writes them to the Places tab. Run it again until the log says "All villages are done".
// Villages that cannot be found are written as "Not found" (the map then uses the taluk centre).
function geocodeVillages() {
  touch_();
  var start = Date.now();
  var sh = tab_('Places');
  if (!sh) throw new Error('The Places tab is missing. Run setupAll first.');
  var have = {};
  read_(sh).rows.forEach(function (r) { have[placeKey_(get_(r, 'Taluk'), get_(r, 'Hobli'), get_(r, 'GP'), get_(r, 'Village'))] = true; });
  var todo = [], seen = {};
  schoolDataBase_().forEach(function (s) {
    var k = placeKey_(s.taluk, s.hobli, s.gp, s.village);
    if (have[k] || seen[k]) return;
    seen[k] = true;
    todo.push(s);
  });
  var geo = Maps.newGeocoder().setRegion('in');
  var inside = function (la, lo) { return la > 12.9 && la < 14.3 && lo > 77.1 && lo < 78.7; };
  var find = function (q) {
    var res = geo.geocode(q);
    if (res.status !== 'OK') return null;
    for (var i = 0; i < res.results.length; i++) {
      var p = res.results[i].geometry.location;
      if (inside(p.lat, p.lng)) return [p.lat, p.lng];
    }
    return null;
  };
  var out = [], done = 0;
  for (var i = 0; i < todo.length && done < 250 && Date.now() - start < 300000; i++) {
    var s = todo[i], hit = null, as = 'Not found';
    var urban = /urban/i.test(s.hobli) || /ward/i.test(s.village);
    try {
      if (!urban) { hit = find(s.village + ', ' + s.gp + ', ' + s.taluk + ', Chikkaballapur district, Karnataka'); as = 'Village'; }
      if (!hit && !urban) { hit = find(s.gp + ', ' + s.taluk + ', Chikkaballapur district, Karnataka'); as = 'GP'; }
      if (!hit) { hit = find(s.taluk + ' town, Chikkaballapur district, Karnataka'); as = 'Taluk town'; }
    } catch (e) {
      // Google's daily limit reached: stop here, nothing is marked; run again tomorrow
      Logger.log('Stopped: ' + e.message + '. Run geocodeVillages again later (tomorrow if it says a daily limit).');
      break;
    }
    out.push({ 'Taluk': s.taluk, 'Hobli': s.hobli, 'GP': s.gp, 'Village': s.village, 'Latitude': hit ? hit[0] : '', 'Longitude': hit ? hit[1] : '',
               'Found as': hit ? as : 'Not found', 'Checked on': now_() });
    done++;
    Utilities.sleep(120);
  }
  if (out.length) append_(sh, out);
  var left = todo.length - done;
  Logger.log(done + ' villages looked up now. ' + (left > 0 ? left + ' left: run geocodeVillages again.' : 'All villages are done.'));
}
// ===== END 85.2 =====


/* =====================================================================
 *  Part 88  Settings and Lists
 * ===================================================================== */

// ===== START 88.1 Read Settings =====
var _settings = null;
function settings_() {
  if (_settings) return _settings;
  var out = {};
  SETTINGS_START.forEach(function (s) { out[s[0]] = s[1]; });       // starting values
  var sh = null;
  try { sh = tab_('Settings'); } catch (e) { sh = null; }
  if (sh) {
    read_(sh).rows.forEach(function (r) {
      var k = clean_(get_(r, 'Key'));
      if (k) out[k] = get_(r, 'Value');
    });
  }
  _settings = out;
  return out;
}
// ===== END 88.1 =====

// ===== START 88.2 Read Lists =====
// Kept in the short-term memory for 10 minutes (a change in the Lists tab shows within 10 minutes).
function lists_() {
  var cache = CacheService.getScriptCache(), ck = cacheKey_('lists');
  try { var hit = cache.get(ck); if (hit) return JSON.parse(hit); } catch (x) { }
  var out = {};
  var sh = tab_('Lists');
  if (!sh || sh.getLastRow() < 1) return LISTS_START;
  var values = sh.getRange(1, 1, sh.getLastRow(), Math.max(1, sh.getLastColumn())).getValues();
  values[0].forEach(function (h, c) {
    var name = String(h).trim();
    if (!name) return;
    out[name] = [];
    for (var r = 1; r < values.length; r++) {
      var v = clean_(values[r][c]);
      if (v !== '') out[name].push(String(v));
    }
  });
  try { cache.put(ck, JSON.stringify(out), 600); } catch (x2) { }
  return out;
}
// ===== END 88.2 =====

// ===== START 88.3 Change a switch (admin) =====
// Only these keys can be changed from the app; every other setting is changed in the Settings tab.
var SWITCH_KEYS = ['VISIT_FORM_VOLUNTEERS', 'VISIT_FORM_COORDINATORS', 'MAP_VOLUNTEERS', 'MAP_COORDINATORS'];
function setSwitch_(person, req) {
  need_(person, 'Admin');
  if (SWITCH_KEYS.indexOf(req.key) < 0) throw new Error('This setting cannot be changed from the app.');
  var value = req.value === 'On' ? 'On' : 'Off';
  var sh = tab_('Settings'), data = read_(sh), done = false;
  data.rows.forEach(function (r) {
    if (clean_(get_(r, 'Key')) === req.key) { sh.getRange(r._row, data.head.indexOf('Value') + 1).setValue(value); done = true; }
  });
  touch_();
  if (!done) append_(sh, [{ 'Key': req.key, 'Value': value, 'What it means': '' }]);
  _settings = null;
  log_(person.email, 'Switch', req.key + ' = ' + value);
  return { ok: true };
}
function switches_() {
  var st = settings_(), out = {};
  SWITCH_KEYS.forEach(function (k) { out[k] = /^on$/i.test(String(st[k]).trim()) ? 'On' : 'Off'; });
  return out;
}
// ===== END 88.3 =====

// ===== START 88.4 Sapling kinds =====
// The names from your SaplingKinds tab (first column, below the heading). Kept for 10 minutes.
function saplingKinds_() {
  var cache = CacheService.getScriptCache(), ck = cacheKey_('kinds');
  try { var hit = cache.get(ck); if (hit) return JSON.parse(hit); } catch (x) { }
  try {
    var sh = userTab_('TAB_SAPLING_KINDS');
    if (sh.getLastRow() < 2) return [];
    var out = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(clean_(r[0])); }).filter(String);
    try { cache.put(ck, JSON.stringify(out), 600); } catch (x2) { }
    return out;
  } catch (e) { return []; }
}
// ===== END 88.4 =====


/* =====================================================================
 *  Part 90  Setup (run by hand from the editor)
 * ===================================================================== */

// ===== START 90.1 setupAll: run this once =====
// In the editor, choose "setupAll" in the drop-down next to Run, then click Run.
// It is safe to run again: it only adds what is missing and never deletes.
function setupAll() {
  fresh_();
  var lines = [];
  lines.push('Version ' + APP_VERSION + ', ' + ist_());
  lines = lines.concat(checkIds_());
  lines = lines.concat(createAppTabs_());
  lines = lines.concat(fillSettingsAndLists_());
  lines = lines.concat(fillSchoolStatus_());
  lines = lines.concat(addOwnerAndPlaceholders_());
  var r = refreshVolTab();
  lines.push('Vol tab: ' + r.added + ' sign-ups added' + (r.note ? ' (' + r.note + ')' : ''));
  lines = lines.concat(startVolRefresh_());
  // forget the short-term memories, so the app reads everything fresh
  ['schools', 'sd'].forEach(function (k) { cacheDrop_(cacheKey_(k)); });
  try { CacheService.getScriptCache().removeAll([cacheKey_('lists'), cacheKey_('kinds')]); } catch (e) { }
  lines.push('ALL DONE.');
  log_(me_(), 'setupAll', lines.join(' | '));
  Logger.log(lines.join('\n'));
}
// ===== END 90.1 =====

// ===== START 90.2 Check the IDs and folders =====
// A folder that is not set yet is only reported; setup still goes on.
function checkIds_() {
  var out = [];
  var b = book_();
  out.push('OK Sheet: ' + b.getName());
  out.push('OK Sheet time zone: ' + b.getSpreadsheetTimeZone() +
           (/Kolkata|Calcutta/.test(b.getSpreadsheetTimeZone()) ? '' : '  <-- please set File > Settings > Time zone to India'));
  [PROP.FOLDER_FRONT_PHOTOS, PROP.FOLDER_MEDIA, PROP.FOLDER_VISIT_RECORDS, PROP.FOLDER_A4_FORMS].forEach(function (p) {
    try { out.push('OK ' + p + ': ' + folder_(p).getName()); }
    catch (e) { out.push('NOT SET YET ' + p + ' (add it in Script Properties when the folder is ready)'); }
  });
  ['TAB_SCHOOLS', 'TAB_SIGNUPS', 'TAB_SAPLING_KINDS'].forEach(function (k) {
    out.push('OK your tab found: ' + userTab_(k).getName());
  });
  return out;
}
// ===== END 90.2 =====

// ===== START 90.3 Create the app tabs and headings =====
// Creates a tab only if it is missing. Adds only missing headings, at the end. Never deletes.
function createAppTabs_() {
  var out = [];
  var b = book_();
  Object.keys(APP_TABS).forEach(function (name) {
    var heads = APP_TABS[name];
    var sh = b.getSheetByName(name), made = false;
    if (!sh) { sh = b.insertSheet(name); made = true; }
    if (heads.length) {
      var have = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); }) : [];
      var missing = heads.filter(function (h) { return have.indexOf(h.toLowerCase()) < 0; });
      if (missing.length) {
        var startCol = have.filter(String).length + 1;
        sh.getRange(1, startCol, 1, missing.length).setValues([missing]);
      }
      sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).setFontWeight('bold');
      sh.setFrozenRows(1);
      out.push((made ? 'Created ' : 'OK ') + name + (missing.length && !made ? ' (added headings: ' + missing.join(', ') + ')' : ''));
    } else {
      out.push((made ? 'Created ' : 'OK ') + name);
    }
  });
  touch_();
  return out;
}
// ===== END 90.3 =====

// ===== START 90.4 Fill Settings and Lists =====
function fillSettingsAndLists_() {
  var out = [];
  // Settings: add missing keys only
  var st = tab_('Settings');
  var haveKeys = {};
  read_(st).rows.forEach(function (r) { haveKeys[clean_(get_(r, 'Key'))] = true; });
  var add = SETTINGS_START.filter(function (s) { return !haveKeys[s[0]]; })
    .map(function (s) { return { 'Key': s[0], 'Value': s[1], 'What it means': s[2] }; });
  if (add.length) append_(st, add);
  st.setColumnWidth(1, 230); st.setColumnWidth(3, 480);
  out.push('Settings: ' + add.length + ' rows added');

  // Lists: add missing list columns only
  var ls = tab_('Lists');
  var width = ls.getLastColumn();
  var heads = width ? ls.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
  var added = 0;
  Object.keys(LISTS_START).forEach(function (name) {
    if (heads.indexOf(name) >= 0) return;
    var col = heads.filter(String).length + 1;
    var vals = [[name]].concat(LISTS_START[name].map(function (v) { return [v]; }));
    ls.getRange(1, col, vals.length, 1).setValues(vals);
    heads[col - 1] = name;
    added++;
  });
  ls.getRange(1, 1, 1, Math.max(1, ls.getLastColumn())).setFontWeight('bold');
  ls.setFrozenRows(1);
  touch_();
  out.push('Lists: ' + added + ' lists added');
  return out;
}
// ===== END 90.4 =====

// ===== START 90.5 Fill School Status (one row per school) =====
// One row per school in School Data, keyed by Sl. No. (the School ID).
// Only schools that are not there yet are added. UDISE and name are copied for easy reading.
function fillSchoolStatus_() {
  var schools = read_(userTab_('TAB_SCHOOLS')).rows;
  var ss = tab_('School Status');
  var have = {};
  read_(ss).rows.forEach(function (r) { have[String(get_(r, 'School ID'))] = true; });
  var add = [];
  schools.forEach(function (r) {
    var id = num_(get_(r, 'Sl. No.'));
    if (id === null || have[String(id)]) return;
    have[String(id)] = true;
    add.push({ 'School ID': id, 'UDISE Code': String(get_(r, 'UDISE Code')), 'School Name': clean_(get_(r, 'School Name')) });
  });
  if (add.length) {
    // keep UDISE as text (set the format before writing, so long numbers are not changed)
    var head = ss.getRange(1, 1, 1, ss.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    var uc = head.indexOf('UDISE Code') + 1;
    if (uc > 0) ss.getRange(nextFreeRow_(ss), uc, add.length, 1).setNumberFormat('@');
    append_(ss, add);
  }
  return ['School Status: ' + add.length + ' schools added (' + schools.length + ' in School Data)'];
}
// ===== END 90.5 =====

// ===== START 90.6 Add the owner and the placeholder people =====
// The account that runs setup (the department account) becomes an Active Admin,
// so somebody can sign in. The 16 placeholders are Inactive until you put real
// emails in "Login email" and set Status to Active.
function addOwnerAndPlaceholders_() {
  var vol = tab_('Vol tab');
  var have = {};
  read_(vol).rows.forEach(function (r) { have[email_(get_(r, 'Login email'))] = true; });
  var add = [];
  var owner = email_(me_());
  if (owner && owner !== 'script' && !have[owner]) {
    add.push({ 'Login email': owner, 'Sign-up email': owner, 'Name': 'Department account', 'Role': 'Admin', 'Status': 'Active',
               'Note': 'Owner of the script', 'Added on': now_(), 'Added by': 'Setup' });
    have[owner] = true;
  }
  ['coordinator', 'admin'].forEach(function (kind) {
    for (var i = 1; i <= 8; i++) {
      var e = kind + i + '@test.com';
      if (have[e]) continue;
      add.push({ 'Login email': e, 'Sign-up email': e, 'Name': (kind === 'admin' ? 'Admin ' : 'Coordinator ') + i,
                 'Role': kind === 'admin' ? 'Admin' : 'Coordinator', 'Status': 'Inactive',
                 'Note': 'Placeholder: put a real email in Login email, then set Status to Active',
                 'Added on': now_(), 'Added by': 'Setup' });
    }
  });
  if (add.length) append_(vol, add);
  return ['Vol tab: owner and placeholders, ' + add.length + ' added'];
}
// ===== END 90.6 =====

// ===== START 90.7 Start the 15-minute volunteer refresh =====
// Makes sure there is exactly one trigger that runs refreshVolTab every 15 minutes.
function startVolRefresh_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshVolTab') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshVolTab').timeBased().everyMinutes(15).create();
  return ['Trigger: refreshVolTab every 15 minutes'];
}
// ===== END 90.7 =====

// ===== START 90.8 authorizeOnce: approve new permissions =====
// Run this by hand once after pasting a new version that uses something new.
// It only opens the approval window. (geocodeVillages asks for its own approval when first run.)
function authorizeOnce() {
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=test', { muteHttpExceptions: true });
  CacheService.getScriptCache().get('x');
  Logger.log('OK: permissions approved. Now Deploy > Manage deployments > New version.');
}
// ===== END 90.8 =====


/* =====================================================================
 *  Part 99  Entry (the web app)
 * ===================================================================== */

// ===== START 99.1 doGet: the ping check =====
// The app itself lives on GitHub. Opening this /exec link only answers a check.
// Test in a browser: <your /exec link>?action=ping
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  return reply_(handle_(Object.assign({}, e && e.parameter, { action: action })));
}
// ===== END 99.1 =====

// ===== START 99.2 doPost: requests from the page on GitHub =====
// The page sends {"action": "...", ...} as plain text.
function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { body = {}; }
  return reply_(handle_(body));
}
// ===== END 99.2 =====

// ===== START 99.3 One place that answers every request =====
// Every action except "ping" and "config" needs a sign-in token.
function handle_(req) {
  req = req || {};
  fresh_();
  try {
    var action = req.action || '';
    if (action === 'ping') {
      var tabsOk = false;
      try { tabsOk = !!tab_('Vol tab') && !!tab_('School Status') && !!tab_('Settings'); } catch (err) { tabsOk = false; }
      return { ok: true, app: 'Hasiru Shaale adoption', version: APP_VERSION, time: ist_(), setupDone: tabsOk };
    }
    if (action === 'config') {
      return { ok: true, version: APP_VERSION, clientId: prop_(PROP.OAUTH_CLIENT_ID) };
    }

    var person = whoIs_(verifyToken_(req.token));

    switch (action) {
      case 'me':
        var st = settings_();
        return { ok: true, person: person, session: makeSession_(person.email), today: ist_(new Date(), 'yyyy-MM-dd'), clientId: prop_(PROP.OAUTH_CLIENT_ID), version: APP_VERSION,
                 schools: schoolsOf_(person.email),
                 settings: { mapVolunteers: st.MAP_VOLUNTEERS, mapCoordinators: st.MAP_COORDINATORS,
                             visitFormVolunteers: st.VISIT_FORM_VOLUNTEERS, visitFormCoordinators: st.VISIT_FORM_COORDINATORS,
                             schoolsGuide: st.SCHOOLS_PER_VOLUNTEER_GUIDE, visitDueDays: num_(st.VISIT_DUE_DAYS) || 120,
                             callDueDays: num_(st.CALL_DUE_DAYS) || 30, editHours: num_(st.EDIT_HOURS) || 72 },
                 alertCount: person.role === 'Volunteer' ? 0 : alerts_(person).alerts.length };
      case 'alertCount':    need_(person, 'Coordinator'); var ac = alerts_(person); return { ok: true, alerts: ac.alerts.length, notWilling: ac.notWilling.length };
      case 'warm':          allSchools_(); return { ok: true };   // fills the short-term memory after a save
      case 'mySchools':     return { ok: true, schools: schoolsOf_(person.email) };
      case 'school':        return { ok: true, school: schoolPage_(person, req.schoolId) };
      case 'saveCall':      return saveCall_(person, req);
      case 'saveLocation':  return saveLocation_(person, req);
      case 'saveFrontPhoto':return saveFrontPhoto_(person, req);
      case 'saveBook':      return saveBook_(person, req);
      case 'uploadA4':      return saveA4Upload_(person, req);
      case 'myA4Uploads':   return { ok: true, uploads: myA4Uploads_(person) };
      case 'volunteers':    need_(person, 'Coordinator'); return { ok: true, volunteers: volunteerList_(person) };
      case 'overview':      need_(person, 'Admin'); return { ok: true, overview: overview_() };
      case 'findSchools':   need_(person, 'Coordinator'); return Object.assign({ ok: true }, findSchools_(req.filters, person));
      case 'groups':        need_(person, 'Coordinator'); return Object.assign({ ok: true }, groupList_(req.filters, person));
      case 'assign':        return assignSchools_(person, req);
      case 'takeBack':      return takeBack_(person, req);
      case 'savePeople':    return savePeople_(person, req);
      case 'addRemark':     return addRemark_(person, req);
      case 'a4List':        need_(person, 'Admin'); return { ok: true, uploads: a4List_() };
      case 'saveVisit':     return saveVisit_(person, req);
      case 'deleteVisit':   return deleteVisit_(person, req);
      case 'propose':       return proposeCorrection_(person, req);
      case 'corrections':   return Object.assign({ ok: true }, correctionsList_(person));
      case 'decide':        return decideCorrection_(person, req);
      case 'alerts':        return Object.assign({ ok: true }, alerts_(person));
      case 'alertDone':     return alertDone_(person, req);
      case 'setNotWilling': return setNotWilling_(person, req);
      case 'saveMedia':     return saveMedia_(person, req);
      case 'dashboard':     need_(person, 'Admin'); return { ok: true, dashboard: dashboard_(req.filters), overview: overview_(), switches: switches_() };
      case 'setSwitch':     return setSwitch_(person, req);
      case 'map':
        var ms = settings_();
        if (person.role === 'Volunteer' && !/^on$/i.test(String(ms.MAP_VOLUNTEERS).trim())) throw new Error('The map is switched off for volunteers.');
        if (person.role === 'Coordinator' && !/^on$/i.test(String(ms.MAP_COORDINATORS).trim())) throw new Error('The map is switched off for coordinators.');
        return { ok: true, points: mapPoints_(person) };
      case 'refreshVolunteers':
        need_(person, 'Admin');
        var r = refreshVolTab();
        log_(person.email, 'Refresh volunteers', r.added + ' added');
        return { ok: true, added: r.added, note: r.note || '' };
    }
    return { ok: false, error: 'Unknown action: ' + action };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err), needSignIn: !!(err && err.needSignIn), notRegistered: !!(err && err.notRegistered) };
  }
}
// ===== END 99.3 =====
