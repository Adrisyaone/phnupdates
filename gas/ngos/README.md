# NGOs Directory — Sheet + Apps Script setup

Backs the "NGOs" screen (`app/(tabs)/(home)/ngos.tsx`), the same way the Job
Portal and Research Grants screens are backed: a Google Sheet holds the data,
a bound Apps Script serves it as JSON, and the app fetches that JSON via
`services/ngos.ts`.

## 1. Create the Google Sheet

Create a new Google Sheet with a single tab named exactly `NGOs`, and this
header row (row 1), in this order:

```
Timestamp | NGO Name | Logo URL | NGO Type | Sector / Focus Area | Website | Headquarters | Nepal Office Location | Established Year | About / Description | Key Programs | Contact Email | Contact Phone | Facebook Page | Linkedin | Location gps
```

`Location gps` should hold `latitude,longitude` (e.g. `27.7172,85.3240`) — the app parses this to link out to Maps.

The Apps Script trims stray whitespace around header text, so small
copy-paste spacing differences are fine — but the words themselves must match.

**NGO Name must match exactly** (case-insensitive) the "Organization" value
used for that NGO's postings in the Job Portal sheet. When someone taps an
NGO in the app, it opens the Job Portal filtered to jobs whose organization
name matches this field — a mismatch (extra abbreviation, different casing
of an acronym, etc.) means no jobs will show up for that NGO.

## 2. Attach the Apps Script

1. In the Sheet: **Extensions → Apps Script**.
2. Delete the default `Code.gs` contents and paste in this folder's
   [`Code.gs`](./Code.gs).
3. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the deployment's `/exec` URL.

## 3. Wire the URL into the app

Paste the URL into `app.json`:

```json
"extra": {
  "ngos": {
    "ngosGasUrl": "https://script.google.com/macros/s/XXXXXXXX/exec"
  }
}
```

Rebuild/restart the dev server and reload the app — the "NGOs" screen will
now load rows from the Sheet, cache them locally, and fall back to the cache
if the network or script is unreachable.

## Adding a new field later

Add a column to the Sheet, add one line to `HEADER_MAP` in `Code.gs`, and add
the matching field to the `Ngo` interface in `services/ngos.ts` (plus
wherever you want it displayed in `ngos.tsx`).
