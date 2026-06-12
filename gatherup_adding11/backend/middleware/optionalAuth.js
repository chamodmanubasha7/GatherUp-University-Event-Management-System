import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/** Attaches req.user when a valid Bearer token is present; never sends 401 */
export async function optionalAuthenticate(req, _res, next) {
  req.user = null;
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    const token = header.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user) {
      req.user = { id: user._id.toString(), role: user.role, email: user.email, name: user.name };
    }
  } catch {
    /* ignore invalid token for public routes */
  }
  next();
}
