'use strict';

const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

/**
 * @returns {object}
 */
function loadCredentials() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    }

    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw || !raw.trim()) {
        throw new Error('Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS');
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

module.exports = {
    SPREADSHEET_ID,
    DRIVE_FOLDER_ID,
    driveClient,
    sheetsClient,
};
