import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout } from '../controllers/auth.controller.js';
import { sendResetByEmail, changePassword } from '../controllers/password.controller.js';
import { verifyRecaptcha } from '../middlewares/verifyRecaptcha.js';
import { authenticateJWT, ensureNotRevoked } from '../middlewares/auth.js'

const router = Router();

router.post('/login',
    [
        body('identifier').isString().trim().notEmpty().withMessage('identifier requerido (correo o usuario)'),
        body('password').isString().notEmpty().withMessage('password requerido'),
        body('recaptchaToken').isString().notEmpty().withMessage('recaptchaToken requerido'),
    ],
    verifyRecaptcha,
    login
);

router.post('/logout', authenticateJWT, ensureNotRevoked,
    logout
);

router.post('/reset-password',
    [
        body('email').isEmail().normalizeEmail().withMessage('email inválido'),
    ],
    sendResetByEmail
);

router.patch('/change-password', authenticateJWT, ensureNotRevoked,
    [
        body('oldPassword').isString().notEmpty(),
        body('newPassword').isString().notEmpty(),
    ],
    changePassword
);

export default router;
