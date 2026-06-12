import { validationResult } from 'express-validator';

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map((e) => ({ field: e.path, msg: e.msg }));
    const mainMsg = errorList.map(e => `${e.field}: ${e.msg}`).join(', ');
    
    return res.status(400).json({
      message: `Validation failed: ${mainMsg}`,
      errors: errorList,
    });
  }
  next();
}
