const fs = require('fs');
let code = fs.readFileSync('backend/middleware/auth.js', 'utf8');
code = code.replace(/}\s*catch\s*{\s*return res\.status\(401\)\.json\(\{ message: 'Invalid or expired token' \}\);\s*}\s*}/, 
`} catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function authenticateOptional(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : req.query.token;
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user) {
      req.user = { id: user._id.toString(), role: user.role, email: user.email, name: user.name };
    }
  } catch {}
  next();
}`);
fs.writeFileSync('backend/middleware/auth.js', code);
