# Masonic Calendar

A private PWA for tracking regular lodge meetings, special meetings, and visits.

Personal data is stored in the browser on each device. The Backup tab can export that data as JSON and import it again later.

## Local Development

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Production Build

```bash
npm run build
```

## GitHub Pages

This repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

After pushing to GitHub:

1. Open the repository on GitHub.
2. Go to Settings, then Pages.
3. Set the source to GitHub Actions.
4. Push to `main`; GitHub will build and publish the app.

On iPhone, open the published GitHub Pages URL in Safari and use Share, then Add to Home Screen.
