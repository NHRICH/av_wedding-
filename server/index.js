'use strict';

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const { google } = require('googleapis');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = Number(process.env.PORT) || 3000;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const MAX_UPLOAD_MB = 8;
const WISHES_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_POSTS = 20;

const postHits = new Map();

/**
 * @returns {object}
 */
function loadCredentials() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    }

    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw || !raw.trim()) {
        throw new Error('Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS in .env');
    }

    return JSON.parse(raw);
}

/**
 * @returns {import('googleapis').drive_v3.Drive}
 */
function driveClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: loadCredentials(),
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
}

/**
 * @returns {import('googleapis').sheets_v4.Sheets}
 */
function sheetsClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: loadCredentials(),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
}

/**
 * @param {import('express').Request} req
 * @returns {boolean}
 */
function rateLimit(req) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = postHits.get(ip);

    if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
        bucket = { start: now, count: 0 };
        postHits.set(ip, bucket);
    }

    bucket.count += 1;
    return bucket.count <= RATE_MAX_POSTS;
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
        cb(ok ? null : new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), ok);
    },
});

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/api/config', (_req, res) => {
    res.json({
        google: Boolean(SPREADSHEET_ID && DRIVE_FOLDER_ID),
        spreadsheet: Boolean(SPREADSHEET_ID),
        drive: Boolean(DRIVE_FOLDER_ID),
    });
});

app.get('/api/wishes', async (_req, res) => {
    if (!SPREADSHEET_ID) {
        return res.status(503).json({ error: 'GOOGLE_SPREADSHEET_ID not configured' });
    }

    try {
        const sheets = sheetsClient();
        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A2:E',
        });

        const rows = (result.data.values || [])
            .map((row, index) => ({
                id: String(index + 2),
                name: row[0] || '',
                email: row[1] || '',
                message: row[2] || '',
                timestamp: row[3] || '',
                presence: row[4] || '',
            }))
            .filter((r) => r.name || r.message)
            .reverse()
            .slice(0, WISHES_LIMIT);

        res.json({ data: rows });
    } catch (err) {
        console.error('GET /api/wishes', err);
        res.status(500).json({ error: err.message || 'Failed to load wishes' });
    }
});

app.post('/api/wishes', async (req, res) => {
    if (!rateLimit(req)) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }

    if (!SPREADSHEET_ID) {
        return res.status(503).json({ error: 'GOOGLE_SPREADSHEET_ID not configured' });
    }

    const name = String(req.body?.name || '').trim().slice(0, 50);
    const email = String(req.body?.email || '').trim().slice(0, 254);
    const message = String(req.body?.message || '').trim().slice(0, 1000);
    const presence = String(req.body?.presence ?? '').trim();

    if (name.length < 2) {
        return res.status(400).json({ error: 'Name is required (at least 2 characters).' });
    }

    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const presenceLabel = presence === '1' ? 'Attending' : presence === '2' ? 'Unable to attend' : 'Not specified';
    const timestamp = new Date().toISOString();

    try {
        const sheets = sheetsClient();
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:E',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [[name, email, message, timestamp, presenceLabel]],
            },
        });

        res.status(201).json({
            data: { name, email, message, timestamp, presence: presenceLabel },
        });
    } catch (err) {
        console.error('POST /api/wishes', err);
        res.status(500).json({ error: err.message || 'Failed to save wish' });
    }
});

app.get('/api/photos', async (_req, res) => {
    if (!DRIVE_FOLDER_ID) {
        return res.status(503).json({ error: 'GOOGLE_DRIVE_FOLDER_ID not configured' });
    }

    try {
        const drive = driveClient();
        const result = await drive.files.list({
            q: `'${DRIVE_FOLDER_ID}' in parents and trashed=false and mimeType contains 'image/'`,
            fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, createdTime)',
            orderBy: 'createdTime desc',
            pageSize: 50,
        });

        const files = (result.data.files || []).map((f) => ({
            id: f.id,
            name: f.name,
            thumbnailLink: f.thumbnailLink,
            webViewLink: f.webViewLink,
            createdTime: f.createdTime,
        }));

        res.json({ data: files });
    } catch (err) {
        console.error('GET /api/photos', err);
        res.status(500).json({ error: err.message || 'Failed to list photos' });
    }
});

app.post('/api/photos', upload.single('photo'), async (req, res) => {
    if (!rateLimit(req)) {
        return res.status(429).json({ error: 'Too many uploads. Please wait a moment.' });
    }

    if (!DRIVE_FOLDER_ID) {
        return res.status(503).json({ error: 'GOOGLE_DRIVE_FOLDER_ID not configured' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided.' });
    }

    try {
        const drive = driveClient();
        const created = await drive.files.create({
            requestBody: {
                name: `wedding-${Date.now()}-${req.file.originalname}`.replace(/[^\w.\-]+/g, '_'),
                parents: [DRIVE_FOLDER_ID],
            },
            media: {
                mimeType: req.file.mimetype,
                body: Readable.from(req.file.buffer),
            },
            fields: 'id, name, thumbnailLink, webViewLink, createdTime',
        });

        await drive.permissions.create({
            fileId: created.data.id,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        res.status(201).json({ data: created.data });
    } catch (err) {
        console.error('POST /api/photos', err);
        res.status(500).json({ error: err.message || 'Failed to upload photo' });
    }
});

app.use((err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }

    if (err.message?.includes('Only JPEG')) {
        return res.status(400).json({ error: err.message });
    }

    next(err);
});

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

/**
 * Sync site files into public/ (folder is gitignored; may be missing after clone).
 */
function syncPublicSite() {
    const copyRecursive = (src, dest) => {
        if (!fs.existsSync(src)) {
            return;
        }

        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
            fs.mkdirSync(dest, { recursive: true });
            for (const entry of fs.readdirSync(src)) {
                copyRecursive(path.join(src, entry), path.join(dest, entry));
            }
            return;
        }

        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    };

    fs.mkdirSync(publicDir, { recursive: true });

    for (const name of ['assets', 'css', 'dist', 'index.html', 'dashboard.html']) {
        copyRecursive(path.join(rootDir, name), path.join(publicDir, name));
    }
}

syncPublicSite();

/**
 * @param {string} name
 * @returns {string|null}
 */
function resolvePublicFile(name) {
    const inPublic = path.join(publicDir, name);
    if (fs.existsSync(inPublic)) {
        return inPublic;
    }

    const inRoot = path.join(rootDir, name);
    if (fs.existsSync(inRoot)) {
        return inRoot;
    }

    return null;
}

app.get(['/dashboard', '/dashboard/'], (_req, res) => {
    res.redirect(301, '/dashboard.html');
});

app.get('/dashboard.html', (_req, res) => {
    const file = resolvePublicFile('dashboard.html');
    if (!file) {
        return res.status(404).send('dashboard.html not found. Run: npm run build:public');
    }

    return res.sendFile(file);
});

app.get('/api/admin/status', (_req, res) => {
    res.json({
        ok: true,
        spreadsheet: Boolean(SPREADSHEET_ID),
        drive: Boolean(DRIVE_FOLDER_ID),
        spreadsheetId: SPREADSHEET_ID || null,
        driveFolderId: DRIVE_FOLDER_ID || null,
    });
});

app.use(express.static(publicDir));

app.use(express.static(rootDir));

app.listen(PORT, () => {
    console.log(`Wedding invitation server: http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
    if (!SPREADSHEET_ID || !DRIVE_FOLDER_ID) {
        console.warn('Warning: set GOOGLE_SPREADSHEET_ID and GOOGLE_DRIVE_FOLDER_ID in .env for full features.');
    }
});
