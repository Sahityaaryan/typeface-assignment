const jwt = require('jsonwebtoken');

  module.exports = function (req, res, next) {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        return res.status(401).json({ error: 'Token expired. Please log in again.' });
      }
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token.' });
    }
  };