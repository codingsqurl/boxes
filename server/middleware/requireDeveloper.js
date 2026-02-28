// Only the developer key may access user management routes
function requireDeveloper(req, res, next) {
  const key = req.headers['x-api-key'];
  const { DEVELOPER_API_KEY } = process.env;

  if (!DEVELOPER_API_KEY) {
    return res.status(500).json({ error: 'Developer API key not configured on server' });
  }

  if (!key || key !== DEVELOPER_API_KEY) {
    return res.status(403).json({ error: 'Forbidden — developer access only' });
  }

  next();
}

module.exports = requireDeveloper;
