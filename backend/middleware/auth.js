const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function verifyAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'No token provided' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
}

module.exports = { verifyToken, verifyAdmin };
