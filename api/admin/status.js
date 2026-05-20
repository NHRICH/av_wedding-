const { SPREADSHEET_ID, DRIVE_FOLDER_ID } = require('../../server/lib/google');

module.exports = (_req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        ok: true,
        spreadsheet: Boolean(SPREADSHEET_ID),
        drive: Boolean(DRIVE_FOLDER_ID),
        spreadsheetId: SPREADSHEET_ID || null,
        driveFolderId: DRIVE_FOLDER_ID || null,
    }));
};
