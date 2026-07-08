/**
 * Research Grants Portal backend.
 *
 * Deploy this bound to the Google Sheet described in README.md, as a Web App
 * (Deploy > New deployment > Web app), with:
 *   Execute as:      Me
 *   Who has access:  Anyone
 *
 * Copy the resulting /exec URL into app.json -> extra.researchGrants.researchGrantsGasUrl.
 */

var SHEET_NAME = 'Research Grants';

// Maps each Sheet column header (row 1, exact text) to the JSON field name
// the app expects. Add a row here whenever you add a new column.
var HEADER_MAP = {
  'Timestamp': 'timestamp',
  'Type of research opportunities': 'type',
  'Opportunity Title': 'title',
  'Hosting Organization': 'organization',
  'Official Website': 'website',
  'Opportunity Mode': 'mode',
  'Research Area': 'researchArea',
  'Short Description': 'shortDescription',
  'Opportunity Highlights': 'highlights',
  'Eligible Applicants': 'eligibleApplicants',
  'Eligible Countries': 'eligibleCountries',
  'Required Qualifications': 'requiredQualifications',
  'Preferred Qualifications': 'preferredQualifications',
  'Required Skills': 'requiredSkills',
  'Application Opens date': 'applicationOpensDate',
  'Application Deadline': 'applicationDeadline',
  'Duration': 'duration',
  'Is this funded?': 'isFunded',
  'Funding/Scholarship Details': 'fundingDetails',
  'Benefits': 'benefits',
  'Application Method': 'applicationMethod',
  'Application Link': 'applicationLink',
  'Required Documents': 'requiredDocuments',
  'Contact Email': 'contactEmail',
  'Additional Instructions': 'additionalInstructions',
  'Maximum Grant Amount (for grant)': 'maxGrantAmount',
  'Funding Agency': 'fundingAgency',
  'Scholarship for': 'scholarshipFor',
  'University name': 'universityName',
  'Tuition Covered?': 'tuitionCovered',
  'Monthly Stipend': 'monthlyStipend',
  'IELTS/TOEFL Required?': 'ieltsToeflRequired',
  'GRE Required?': 'greRequired',
  'Fellowship Duration': 'fellowshipDuration',
  'Host Department': 'hostDepartment',
  'Registration Fee': 'registrationFee',
  'Certificate Provided?': 'certificateProvided',
  'Skill Level': 'skillLevel',
  'Maximum Participants': 'maxParticipants',
};

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ error: 'Sheet "' + SHEET_NAME + '" not found.' });
    }

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return jsonResponse({ opportunities: [] });
    }

    // Header cells in the sheet may carry stray leading/trailing whitespace
    // (e.g. copy-pasted from a form), so normalize before matching HEADER_MAP.
    var headers = values[0].map(function (h) { return String(h).trim().replace(/\s+/g, ' '); });
    var rows = values.slice(1);

    var opportunities = rows
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
        return record.title || record.organization;
      });

    return jsonResponse({ opportunities: opportunities });
  } catch (error) {
    return jsonResponse({ error: String(error) });
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
