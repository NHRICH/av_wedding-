const { getPhotos, postPhoto } = require('../server/lib/photos');

module.exports.config = {
    api: {
        bodyParser: false,
    },
};

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        return getPhotos(req, res);
    }

    if (req.method === 'POST') {
        return postPhoto(req, res);
    }

    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
};
