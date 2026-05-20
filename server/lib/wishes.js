'use strict';

const { SPREADSHEET_ID, sheetsClient } = require('./google');

const WISHES_LIMIT = 100;

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        return Promise.resolve(JSON.stringify(req.body));
    }

    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function getWishes(req, res) {
    if (!SPREADSHEET_ID) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'GOOGLE_SPREADSHEET_ID not configured' }));
        return;
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

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: rows }));
    } catch (err) {
        console.error('GET /api/wishes', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Failed to load wishes' }));
    }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function postWish(req, res) {
    if (!SPREADSHEET_ID) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'GOOGLE_SPREADSHEET_ID not configured' }));
        return;
    }

    let parsed = {};
    try {
        parsed = JSON.parse(await readBody(req) || '{}');
    } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
    }

    const name = String(parsed.name || '').trim().slice(0, 50);
    const email = String(parsed.email || '').trim().slice(0, 254);
    const message = String(parsed.message || '').trim().slice(0, 1000);
    const presence = String(parsed.presence ?? '').trim();

    if (name.length < 2) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Name is required (at least 2 characters).' }));
        return;
    }

    if (!message) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Message is required.' }));
        return;
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

        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            data: { name, email, message, timestamp, presence: presenceLabel },
        }));
    } catch (err) {
        console.error('POST /api/wishes', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Failed to save wish' }));
    }
}

module.exports = { getWishes, postWish };
