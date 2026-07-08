/**
 * NGOs Directory backend.
 *
 * Deploy this bound to the Google Sheet described in README.md, as a Web App
 * (Deploy > New deployment > Web app), with:
 *   Execute as:      Me
 *   Who has access:  Anyone
 *
 * Copy the resulting /exec URL into app.json -> extra.ngos.ngosGasUrl.
 */

var SHEET_NAME = 'NGOs';

// Maps each Sheet column header (row 1, exact text) to the JSON field name
// the app expects. Add a row here whenever you add a new column.
var HEADER_MAP = {
  'Timestamp': 'timestamp',
  'NGO Name': 'name',
  'Logo URL': 'logo',
  'NGO Type': 'ngoType',
  'Sector / Focus Area': 'sector',
  'Website': 'website',
  'Headquarters': 'headquarters',
  'Nepal Office Location': 'officeLocation',
  'Established Year': 'establishedYear',
  'About / Description': 'description',
  'Key Programs': 'keyPrograms',
  'Contact Email': 'contactEmail',
  'Contact Phone': 'contactPhone',
  'Facebook Page': 'facebook',
};

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ error: 'Sheet "' + SHEET_NAME + '" not found.' });
    }

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return jsonResponse({ ngos: [] });
    }

    // Header cells in the sheet may carry stray leading/trailing whitespace
    // (e.g. copy-pasted from a form), so normalize before matching HEADER_MAP.
    var headers = values[0].map(function (h) { return String(h).trim().replace(/\s+/g, ' '); });
    var rows = values.slice(1);

    var ngos = rows
      .map(function (row, index) {
        var record = { id: String(index + 1) };
        headers.forEach(function (header, col) {
          var field = HEADER_MAP[header];
          if (!field) return;
          var value = row[col];
          record[field] = value instanceof Date ? value.toISOString() : String(value || '').trim();
        });
        return record;
      })
      .filter(function (record) {
        return record.name;
      });

    return jsonResponse({ ngos: ngos });
  } catch (error) {
    return jsonResponse({ error: String(error) });
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
