# Kiddie Log

Kiddie Log is a multi-tenant child attendance, care and verified-handover web application for churches, schools and care organizations.

## Product entry points

- `/` — Kiddie Log public face with Institution and User access.
- `/institution/register` — organization onboarding and public-page creation.
- `/t/{institution-code}/` — an institution’s public page for member sign-in and family registration.
- `/t/{institution-code}/login` — unified sign-in. The approved account determines the user’s role privately.

The seeded development institution is available at `/t/evangel/`. Seeded identities and development OTPs exist only to support local testing; the public UI does not display a list of internal roles.

## Included workflows

- Institution creation and isolated tenant records
- Family application, review and approval
- Structured child care profiles: allergies, diet, medical, accessibility and emergency instructions
- Parent-owned care-profile updates with explicit consent
- Staff attendance and verified pickup handovers
- Individual family conversations
- Organization announcements to all families or a selected class
- In-app parent notifications with unread status
- Role-based permissions, security audit records and append-only attendance events
- Institution branding and shareable public links
- Installable Progressive Web App manifests for institution-specific home-screen shortcuts

## Local verification

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd start
```

Open `http://127.0.0.1:4174`. The SQLite file is created at `data/kiddie-log.sqlite`.

## Production configuration

Copy `.env.example` into the hosting platform’s secret/configuration system. Do not commit real credentials. Production requires HTTPS, a persistent Node runtime, persistent storage, encrypted backups and a verified email provider for private sign-in-code delivery.

GitHub Pages can host static files only. The complete Kiddie Log application also needs the included Node API and SQLite-compatible persistent volume, so deploy it to a service that runs Node rather than publishing the frontend alone.

## Install on a phone or tablet

Open the institution’s public page over HTTPS, then choose **Install app** or **Add to Home Screen** in the browser. The installed shortcut opens that institution directly. No `.ini` file is needed; the standards-based web app manifest and service worker provide the installable app experience.
