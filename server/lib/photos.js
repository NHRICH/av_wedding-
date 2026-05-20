'use strict';

const { Readable } = require('stream');
const Busboy = require('busboy');
const { DRIVE_FOLDER_ID, driveClient } = require('./google');

const MAX_UPLOAD_MB = 8;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{buffer: Buffer, mimetype: string, originalname: string}|null>}
 */
function parsePhotoUpload(req) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 } });
        let file = null;

        busboy.on('file', (_name, stream, info) => {
            const chunks = [];
            stream.on('data', (c) => chunks.push(c));
            stream.on('end', () => {
                file = {
                    buffer: Buffer.concat(chunks),
                    mimetype: info.mimeType,
                    originalname: info.filename || 'photo.jpg',
                };
            });
        });

        busboy.on('finish', () => resolve(file));
        busboy.on('error', reject);
        req.pipe(busboy);
    });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function getPhotos(req, res) {
    if (!DRIVE_FOLDER_ID) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'GOOGLE_DRIVE_FOLDER_ID not configured' }));
        return;
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

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: files }));
    } catch (err) {
        console.error('GET /api/photos', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Failed to list photos' }));
    }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function postPhoto(req, res) {
    if (!DRIVE_FOLDER_ID) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'GOOGLE_DRIVE_FOLDER_ID not configured' }));
        return;
    }

    try {
        const file = await parsePhotoUpload(req);

        if (!file || !file.buffer.length) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No photo file provided.' }));
            return;
        }

        if (!ALLOWED.includes(file.mimetype)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }));
            return;
        }

        const drive = driveClient();
        const created = await drive.files.create({
            requestBody: {
                name: `wedding-${Date.now()}-${file.originalname}`.replace(/[^\w.\-]+/g, '_'),
                parents: [DRIVE_FOLDER_ID],
            },
            media: {
                mimeType: file.mimetype,
                body: Readable.from(file.buffer),
            },
            fields: 'id, name, thumbnailLink, webViewLink, createdTime',
        });

        await drive.permissions.create({
            fileId: created.data.id,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: created.data }));
    } catch (err) {
        console.error('POST /api/photos', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Failed to upload photo' }));
    }
}

module.exports = { getPhotos, postPhoto };
