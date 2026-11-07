# Testing

## Automated (`npm test`)
Lead validation & import normalisation, duplicate detection, URL safety, revenue ranges/bucketing, Asia/Dhaka date handling, meeting/payment schemas, password policy, and the route-authorisation rules (anonymous / moderator / super admin).

## Manual checklist (needs a running app + database)
- **Auth:** wrong password shows a generic error; 9 failed attempts → rate-limit message; disabled moderator cannot sign in and is kicked out on next request.
- **Roles:** as moderator visit `/overview`, `/meetings`, `/payments`, `/moderators`, `/settings`, `/api/leads/export` → all return to `/leads`. Leads shows 7 columns, no edit controls.
- **Theme:** toggle Light / Dark / System on login and in the header; reload — preference persists, no flash. Check tables, dialogs, charts, calendar in both themes.
- **Leads:** add (duplicate phone is blocked); double-click edit → Enter / Esc / click-away; dropdown autosaves; Open buttons open pages; search + several filters together; sort; paginate; hide columns.
- **Import/Export:** import the template, a file with duplicates and a bad row; check summary and error report; export CSV and open in a spreadsheet.
- **Notes:** add with reminder; due dot appears; complete / delete.
- **Classification:** change a lead's size on `/clients/growth` → it disappears there and shows on its new page.
- **Meetings:** create from the table (calendar icon) and from Meetings; all six views; status change; outcome / next action.
- **Payments:** record Paid / Partial / Pending / Refunded; confirm Overview revenue = Paid + Partial only, Pending shown separately; chart presets and custom range.
- **Moderators / Settings:** create, edit, reset password, disable, reactivate; change own password; audit log updates.
