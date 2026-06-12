const fs = require('fs');
let code = fs.readFileSync('backend/routes/eventRoutes.js', 'utf8');
code = code.replace("import { authenticate, requireAdmin } from '../middleware/auth.js';", "import { authenticate, authenticateOptional, requireAdmin } from '../middleware/auth.js';");
code = code.replace("router.get('/', listEvents);", "router.get('/', authenticateOptional, listEvents);");
fs.writeFileSync('backend/routes/eventRoutes.js', code);
