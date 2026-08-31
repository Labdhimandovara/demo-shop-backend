const { verifyToken } = require('../lib/jwt');

function withAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header', data: null });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid or expired', data: null });
  }
}

function withAdmin(req, res, next) {
  withAuth(req, res, () => {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required', data: null });
    }
    next();
  });
}

module.exports = { withAuth, withAdmin };
