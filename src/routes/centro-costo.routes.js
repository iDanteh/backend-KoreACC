// routes/centro-costo.routes.js
import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';
import { createCentroCostoCtrl, listCentrosCostoCtrl, getCentroCostoCtrl, updateCentroCostoCtrl, deleteCentroCostoCtrl,} from '../controllers/centro-costo.controller.js';

const router = Router();

// LISTAR
router.get('/', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    listCentrosCostoCtrl
);

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
        body('num_int').optional({ nullable: true }).isInt(),
        body('cp').isInt(),
        body('region').isString().trim().notEmpty(),
        body('telefono').optional({ nullable: true }).isInt(),
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
        body('num_int').optional({ nullable: true }).isInt(),
        body('cp').optional().isInt(),
        body('region').optional().isString().trim().notEmpty(),
        body('telefono').optional({ nullable: true }).isInt(),
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