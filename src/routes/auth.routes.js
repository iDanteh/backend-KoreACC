import { Router } from 'express';
import { body } from 'express-validator';
import { login } from '../controllers/auth.controller.js';
import { verifyRecaptcha } from '../middlewares/verifyRecaptcha.js';

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

export default router;
