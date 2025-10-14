import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, ensureNotRevoked } from '../middlewares/auth.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';
import { createPoliza, listPolizas, getPoliza,updatePoliza,deletePoliza,changeEstadoPoliza,addMovimientoToPoliza,
    addMovimientosToPoliza,
    getPolizaWithMovimientos
    } from '../controllers/poliza.controller.js';

const router = Router();

router.get('/',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        query('id_tipopoliza').optional().isInt({ min: 1 }),
        query('id_periodo').optional().isInt({ min: 1 }),
        query('id_usuario').optional().isInt({ min: 1 }),
        query('id_centro').optional().isInt({ min: 1 }),
        query('estado').optional().isIn(['Por revisar', 'Revisada', 'Contabilizada']),
        query('q').optional().isString().trim(),
        query('fecha_desde').optional().isISO8601(),
        query('fecha_hasta').optional().isISO8601(),
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('pageSize').optional().isInt({ min: 1, max: 200 }).toInt(),
    ],
    listPolizas
);

router.get('/:id',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    getPoliza
);

router.get('/:id/movimientos', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    getPolizaWithMovimientos
);

router.post('/', authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        body('id_tipopoliza').isInt({ min: 1 }),
        body('id_periodo').isInt({ min: 1 }),
        body('id_usuario').isInt({ min: 1 }),
        body('id_centro').isInt({ min: 1 }),
        body('folio').isString().trim().notEmpty(),
        body('concepto').isString().trim().notEmpty(),
        body('movimientos').optional().isArray(),
    ],
    createPoliza
);

router.put('/:id',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('id_tipopoliza').optional().isInt({ min: 1 }),
        body('id_periodo').optional().isInt({ min: 1 }),
        body('id_usuario').optional().isInt({ min: 1 }),
        body('id_centro').optional().isInt({ min: 1 }),
        body('estado').optional().isIn(['Por revisar', 'Revisada', 'Contabilizada']),
        body('concepto').optional().isString().trim(),
    ],
    updatePoliza
);

router.patch('/:id/estado',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('estado').isIn(['Por revisar', 'Revisada', 'Contabilizada']),
    ],
    changeEstadoPoliza
);

router.post('/:id/movimiento',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('id_cuenta').optional().isInt({ min: 1 }),
        body('operacion').isIn(['0', '1']),
        body('monto').isDecimal(),
    ],
    addMovimientoToPoliza
);

router.post('/:id/movimientos',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('movimientos').isArray({ min: 1 }),
    ],
    addMovimientosToPoliza
);

router.delete('/:id',authenticateJWT,ensureNotRevoked,requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    deletePoliza
);

export default router;