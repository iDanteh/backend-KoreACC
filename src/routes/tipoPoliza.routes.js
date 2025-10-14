import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';
import {createTipoPoliza,getTipoPoliza,listTipoPolizas,updateTipoPoliza,deleteTipoPoliza } from '../controllers/tipoPoliza.controller.js';

const router = Router();

router.get('/',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        query('naturaleza').optional().isIn(['ingreso', 'egreso', 'diario']),
        query('q').optional().isString().trim(),
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('pageSize').optional().isInt({ min: 1, max: 200 }).toInt(),
    ],
    listTipoPolizas
);

router.get('/:id',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    getTipoPoliza
);

router.post('/',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        body('naturaleza').isIn(['ingreso', 'egreso', 'diario']),
        body('descripcion').isString().trim().notEmpty(),
    ],
    createTipoPoliza
);

router.put('/:id',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('naturaleza').optional().isIn(['ingreso', 'egreso', 'diario']),
        body('descripcion').optional().isString().trim(),
    ],
    updateTipoPoliza
);

router.delete('/:id',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    deleteTipoPoliza
);

export default router;