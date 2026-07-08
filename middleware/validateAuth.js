const { body, validationResult } = require('express-validator');

const registerRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['student', 'landlord']).withMessage('Invalid role')
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
];

const googleAuthRules = [
  body('idToken').notEmpty().withMessage('Missing Google ID token'),
  body('role').optional().isIn(['student', 'landlord']).withMessage('Invalid role')
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { registerRules, loginRules, googleAuthRules, validate };