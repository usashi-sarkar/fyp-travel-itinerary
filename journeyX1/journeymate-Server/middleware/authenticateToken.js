const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Assumes 'Bearer <token>'

    if (!token) {
        return res.status(401).json({ message: 'Access token is missing or invalid' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id; // Extract userId from the token payload
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid token', error });
    }
}

module.exports = authenticateToken;
