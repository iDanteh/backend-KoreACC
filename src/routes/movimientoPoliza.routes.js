import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, ensureNotRevoked } from '../middlewares/auth.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';
import { listMovimientos, getMovimiento, createMovimiento, updateMovimiento, deleteMovimiento, replaceAllForPoliza } from '../controllers/movimientoPoliza.controller.js';

const router = Router();

router.get('/', authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        query('id_poliza').optional().isInt({ min: 1 }),
        query('id_cuenta').optional().isInt({ min: 1 }),
        query('operacion').optional().isIn(['0', '1']),
        query('fecha_desde').optional().isISO8601(),
        query('fecha_hasta').optional().isISO8601(),
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('pageSize').optional().isInt({ min: 1, max: 500 }).toInt(),
    ],
    listMovimientos
);

router.get('/:id',authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    getMovimiento
);

router.post('/', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [
        body('id_poliza').isInt({ min: 1 }),
        body('id_cuenta').optional().isInt({ min: 1 }),
        body('operacion').isIn(['0', '1']),
        body('monto').isDecimal(),
        body('fecha').isISO8601(),
    ],
    createMovimiento
);

router.put('/:id',authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('id_poliza').optional().isInt({ min: 1 }),
        body('id_cuenta').optional().isInt({ min: 1 }),
        body('operacion').optional().isIn(['0', '1']),
        body('monto').optional().isDecimal(),
        body('fecha').optional().isISO8601(),
    ],
    updateMovimiento
);

router.delete('/:id',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    deleteMovimiento
);

router.post('/poliza/:id_poliza/replace',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        param('id_poliza').isInt({ min: 1 }),
        body('movimientos').isArray({ min: 1 }),
    ],
    replaceAllForPoliza
);

export default router;