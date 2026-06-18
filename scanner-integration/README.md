# Scanner ↔ dashboard integration

Your existing scanner (`ada-external-scanner`) already does the hard part:
Puppeteer + axe-core, SSRF protection, scoring. It's missing the FUNNEL.

## Wire it up (highest-ROI task in the whole project)
1. Drop `EmailCapture.tsx` into the scanner's report page, below the results.
2. Set its `ingestUrl` to your dashboard, e.g. `https://app.makoya.example/api/scan-ingest`.
3. After a scan, pass `url`, `score`, `totals` from the scanner's report object.
4. On submit → a lead + scan appear in the dashboard's Leads + site report.

That's it. Scanner stays where it is; the dashboard becomes the CRM.

REQUIRED_MANUAL_SETUP: RESEND_API_KEY in the dashboard to actually email the
PDF + a day-2 follow-up (the ingest route has the TODO marked).
