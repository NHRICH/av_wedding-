const { getWishes, postWish } = require('../server/lib/wishes');

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        return getWishes(req, res);
    }

    if (req.method === 'POST') {
        return postWish(req, res);
    }

    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
};
