// حماية routes الـ admin بـ password بسيط
const adminAuth = (req, res, next) => {
  const header = req.headers['authorization'];
  const body   = req.body?.admin_password;

  let password = null;
  if (header?.startsWith('Bearer ')) password = header.slice(7);
  else if (body) password = body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

module.exports = adminAuth;
