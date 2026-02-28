// Accepts either the regular admin key or the developer key
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  const { ADMIN_API_KEY, DEVELOPER_API_KEY } = process.env;

  if (!ADMIN_API_KEY) {
    return res.status(500).json({ error: 'Admin API key not configured on server' });
  }

  if (!key || (key !== ADMIN_API_KEY && key !== DEVELOPER_API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = requireApiKey;
