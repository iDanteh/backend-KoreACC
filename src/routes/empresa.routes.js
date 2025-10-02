import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import {createEmpresaCtrl, listEmpresasCtrl, getEmpresaCtrl, updateEmpresaCtrl, deleteEmpresaCtrl } from '../controllers/empresa.controller.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';

const router = Router();

router.get('/', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    listEmpresasCtrl
);

router.get('/:id', authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    getEmpresaCtrl
);

const rfcPersonaMoral = /^[A-ZÑ&]{3}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{2}[0-9A]$/;
const rfcPersonaFisica = /^[A-ZÑ&]{4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{2}[0-9A]$/;

router.post('/', authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        body('razon_social').isString().trim().notEmpty(),
        body('rfc')
            .isString().trim().notEmpty().withMessage('El RFC es obligatorio')
            .custom((value) => {
                if (rfcPersonaMoral.test(value)) return true;
                if (rfcPersonaFisica.test(value)) return true;
                throw new Error('El RFC no es válido. Debe cumplir con el formato de persona física o moral');
            }),
        body('domicilio_fiscal').isString().trim().notEmpty(),
        body('telefono').optional().isString(),
        body('correo_contacto').optional().isEmail(),
    ],
    createEmpresaCtrl
);

router.put('/:id', authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('razon_social').optional().isString().trim(),
        body('rfc')
            .isString().trim().notEmpty().withMessage('El RFC es obligatorio')
            .custom((value) => {
                if (rfcPersonaMoral.test(value)) return true;
                if (rfcPersonaFisica.test(value)) return true;
                throw new Error('El RFC no es válido. Debe cumplir con el formato de persona física o moral');
            }),
        body('domicilio_fiscal').optional().isString().trim(),
        body('telefono').optional().isString(),
        body('correo_contacto').optional().isEmail(),
    ],
    updateEmpresaCtrl
);

router.delete('/:id', authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    deleteEmpresaCtrl
);

export default router;