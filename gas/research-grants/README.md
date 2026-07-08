# Research Grants Portal — Sheet + Apps Script setup

Backs the "Research Grants" screen (`app/(tabs)/(home)/research-grants.tsx`),
the same way the Job Portal is backed: a Google Sheet holds the data, a bound
Apps Script serves it as JSON, and the app fetches that JSON via
`services/researchGrants.ts`.

## 1. Create the Google Sheet

Create a new Google Sheet (lives in your Google Drive) with a single tab named
exactly `Research Grants`, and this header row (row 1), in this order:

```
Timestamp | Type of research opportunities | Opportunity Title | Hosting Organization | Official Website | Opportunity Mode | Research Area | Short Description | Opportunity Highlights | Eligible Applicants | Eligible Countries | Required Qualifications | Preferred Qualifications | Required Skills | Application Opens date | Application Deadline | Duration | Is this funded? | Funding/Scholarship Details | Benefits | Application Method | Application Link | Required Documents | Contact Email | Additional Instructions | Maximum Grant Amount (for grant) | Funding Agency | Scholarship for | University name | Tuition Covered? | Monthly Stipend | IELTS/TOEFL Required? | GRE Required? | Fellowship Duration | Host Department | Registration Fee | Certificate Provided? | Skill Level | Maximum Participants
```

The Apps Script trims stray whitespace around header text, so small
copy-paste spacing differences are fine — but the words themselves must match.

## 2. One sheet, many opportunity types

**Type of research opportunities** is free text — `Research Grant`,
`PhD Scholarship`, `Masters Scholarship`, `Fellowship`, `Research Internship`,
`Workshop`, `Training`, `Conference`, or anything else. The app builds its
"Opportunity Type" filter chips from whatever distinct values appear in this
column, so adding a new category is just typing a new value here — no code
change needed.

Most of the later columns are type-specific and are simply left **blank** for
rows where they don't apply:

| Column | Mainly relevant to |
|---|---|
| Maximum Grant Amount (for grant) | Research Grants |
| Funding Agency | Grants, Fellowships |
| Scholarship for | Scholarships (put the degree level here: `Masters`, `PhD`, `Postdoc`, `Undergraduate`, `Any`) |
| University name, Tuition Covered?, Monthly Stipend | Scholarships |
| IELTS/TOEFL Required?, GRE Required? | Scholarships, Fellowships |
| Fellowship Duration, Host Department | Fellowships |
| Registration Fee, Certificate Provided?, Skill Level, Maximum Participants | Workshops, Trainings |

The "Is this funded?" and the three `...Required?`/`...Provided?` columns
should be `Yes`/`No` — the app renders them as green/grey badges accordingly.

**Application Opens date** and **Application Deadline** should be real dates
(a Sheet date cell, or an ISO/parseable date string) so the app can flag
expired opportunities and show an "Opens" date.

You can add rows by hand, or hook a Google Form to this sheet (Form responses
land as new rows automatically) if non-technical staff will be submitting
opportunities.

## 3. Attach the Apps Script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete the default `Code.gs` contents and paste in this folder's
   [`Code.gs`](./Code.gs).
3. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the deployment's `/exec` URL.

## 4. Wire the URL into the app

Paste the URL into `app.json`:

```json
"extra": {
  "researchGrants": {
    "researchGrantsGasUrl": "https://script.google.com/macros/s/XXXXXXXX/exec"
  }
}
```

Rebuild/reload the app — the "Research Grants" screen will now load rows from
the Sheet, cache them locally, and fall back to the cache if the network or
script is unreachable.

## Adding a new field later

Add a column to the Sheet, add one line to `HEADER_MAP` in `Code.gs`, and add
the matching field to the `ResearchOpportunity` interface in
`services/researchGrants.ts` (plus wherever you want it displayed in
`research-grants.tsx`).
