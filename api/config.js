const { SPREADSHEET_ID, DRIVE_FOLDER_ID } = require('../server/lib/google');

module.exports = (_req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        google: Boolean(SPREADSHEET_ID && DRIVE_FOLDER_ID),
        spreadsheet: Boolean(SPREADSHEET_ID),
        drive: Boolean(DRIVE_FOLDER_ID),
    }));
};
