import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';
import { createCentroCostoCtrl, listCentrosCostoCtrl, getCentroCostoCtrl, updateCentroCostoCtrl, 
    deleteCentroCostoCtrl,listRaices, listHijos, subtree,moveCentro, exportCentrosCosto, exportCentrosCostoPdf
} from '../controllers/centro-costo.controller.js';

const router = Router();

// EXPORTAR
router.get('/export.xlsx', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    exportCentrosCosto
);

router.get('/export.pdf', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    exportCentrosCostoPdf
);

// LISTAR
router.get('/', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    listCentrosCostoCtrl
);

// Jerarquía
router.get('/roots/list', listRaices);
router.get('/:id/children', listHijos);
router.get('/:id/subtree', subtree);
router.patch('/:id/move', moveCentro);

// OBTENER POR ID
router.get('/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    getCentroCostoCtrl
);

// CREAR
router.post('/', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [
        body('id_centro').isInt({ min: 1 }),
        body('serie_venta').isString().trim().notEmpty(),
        body('nombre_centro').isString().trim().notEmpty(),
        body('calle').isString().trim().notEmpty(),
        body('num_ext').isInt(),
        body('num_int').customSanitizer(v => v === '' ? null : v).optional({ nullable: true }).isInt().toInt(),
        body('cp').isInt().toInt(),
        body('region').isString().trim().notEmpty(),
        body('telefono').optional({ nullable: true, checkFalsy: true }).isString().matches(/^\d{7,10}$/).withMessage('telefono debe tener 7 a 10 dígitos'),
        body('activo').optional().isBoolean(),
    ],
    createCentroCostoCtrl
);

// ACTUALIZAR
router.put('/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('id_centro').optional().isInt({ min: 1 }),
        body('serie_venta').optional().isString().trim().notEmpty(),
        body('nombre_centro').optional().isString().trim().notEmpty(),
        body('calle').optional().isString().trim().notEmpty(),
        body('num_ext').optional().isInt(),
        body('num_int').customSanitizer(v => v === '' ? null : v).optional({ nullable: true }).isInt().toInt(),
        body('cp').optional().isInt().toInt(),
        body('region').optional().isString().trim().notEmpty(),
        body('telefono').optional({ nullable: true, checkFalsy: true }).isString().matches(/^\d{7,10}$/).withMessage('telefono debe tener 7 a 10 dígitos'),
        body('activo').optional().isBoolean(),
    ],
    updateCentroCostoCtrl
);

// ELIMINAR
router.delete('/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    deleteCentroCostoCtrl
);

export default router;