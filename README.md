# Wedding invitation website

![Thumbnail](/assets/images/banner.webp)

English wedding invitation (Orthodox Christian) with guest wishes and RSVP stored in **Google Sheets**, and photo uploads stored in **Google Drive**.

## Quick start

```powershell
cd "c:\Users\NH RICH\Documents\undangan"
npm install
copy .env.example .env
# Edit .env with your Google credentials (see below)
npm start
```

Open:

- Invitation: http://localhost:3000/
- Dashboard: http://localhost:3000/dashboard.html (or http://localhost:3000/dashboard)

`npm start` runs `build:public` first, then serves the `public/` folder and API from one Node server.

## Google setup (free)

1. **Google Sheet**  create a spreadsheet named e.g. "Wedding Blessings". Row 1 headers (optional): Name, Email, Message, Timestamp, RSVP. Copy the spreadsheet ID from the URL (`/d/ID/edit`).
2. **Google Drive**  create a folder e.g. "Wedding Photos". Copy the folder ID from the URL (`/folders/ID`).
3. **Google Cloud**  create a project, enable **Google Drive API** and **Google Sheets API**, create a **service account**, download JSON key.
4. **Share** the Sheet and Drive folder with the service account email (Editor permission).
5. **`.env`**  copy `.env.example` to `.env` and set:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`  entire JSON on one line, **or**
   - `GOOGLE_APPLICATION_CREDENTIALS`  path to the JSON file
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_DRIVE_FOLDER_ID`
   - `PORT` (default 3000)

Never commit `.env` (it is in `.gitignore`).

## Features

- **Languages**: English and Amharic ù choose on the welcome screen; switch anytime with the EN/?? button.
- **Wishes & RSVP**: saved to your Google Sheet via `POST /api/wishes`.
- **Guest photos**: upload from the gallery section; files go to Drive and appear in the guest grid.
- **No ulems API**: `data-key` / `data-url` are removed; everything uses the local Node API.

## Development

| Command | Purpose |
|---------|---------|
| `npm run build` | Bundle JS to `dist/` |
| `npm run build:public` | Copy site + `dist/` into `public/` |
| `npm start` | Build public + run server (port 3000) |
| `npm run dev` | Build `public/`, then static preview on port 8080 (no Google API  use `npm start` for full stack). Dashboard: http://localhost:8080/dashboard.html |

Edit guest copy in `js/i18n/strings.js` (`en` and `am`).

Edit layout and couple details in `index.html`.

## Deployment (Vercel)

The project includes `vercel.json`. **`npm run build`** bundles JS and copies the site into **`public/`** (Vercels output directory).

In the Vercel project ù **Settings ù Environment Variables**, add:

- `GOOGLE_SERVICE_ACCOUNT_JSON`  full service account JSON (one line)
- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_DRIVE_FOLDER_ID`

API routes live in the `api/` folder (`/api/wishes`, `/api/photos`, etc.).

Redeploy after changing env vars.

## Deployment (other hosts)

- **Render / Railway / Fly.io**  `npm start` (Node server on port 3000)
- Plain static hosting without `api/` will not run wishes or photo uploads

## Tech stack

- Bootstrap 5, Font Awesome, vanilla JS (esbuild bundle)
- Express + googleapis + multer (API)
- Google Sheets & Drive

## License

MIT
