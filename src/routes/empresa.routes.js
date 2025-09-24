import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import {createEmpresaCtrl, listEmpresasCtrl, getEmpresaCtrl, updateEmpresaCtrl, deleteEmpresaCtrl } from '../controllers/empresa.controller.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';

const router = Router();

router.get('/', authenticateJWT, ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador', 'Contador', 'Auditor'),
    listEmpresasCtrl
);

router.get('/:id', authenticateJWT,ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador', 'Contador', 'Auditor'),
    [param('id').isInt({ min: 1 })],
    getEmpresaCtrl
);

router.post('/', authenticateJWT,ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador', 'Contador'),
    [
        body('razon_social').isString().trim().notEmpty(),
        body('rfc').isString().trim().notEmpty(),
        body('domicilio_fiscal').isString().trim().notEmpty(),
        body('telefono').optional().isString(),
        body('correo_contacto').optional().isEmail(),
    ],
    createEmpresaCtrl
);

router.put('/:id', authenticateJWT,ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador', 'Contador'),
    [
        param('id').isInt({ min: 1 }),
        body('razon_social').optional().isString().trim(),
        body('rfc').optional().isString().trim(),
        body('domicilio_fiscal').optional().isString().trim(),
        body('telefono').optional().isString(),
        body('correo_contacto').optional().isEmail(),
    ],
    updateEmpresaCtrl
);

router.delete('/:id', authenticateJWT,ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador'),
    [param('id').isInt({ min: 1 })],
    deleteEmpresaCtrl
);

export default router;