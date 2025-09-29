import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import { createImpuestoCtrl, listImpuestosCtrl, getImpuestoCtrl, updateImpuestoCtrl, deleteImpuestoCtrl
} from '../controllers/impuesto.controller.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';

const router = Router();

router.get('/',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        query('id_empresa').optional().isInt({ min: 1 }),
        query('tipo').optional().isIn(['IVA','ISR','IEPS','RETENCION','OTRO']),
        query('aplica_en').optional().isIn(['VENTA','COMPRA','AMBOS']),
    ],
    listImpuestosCtrl
);

router.get('/:id',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    getImpuestoCtrl
);

router.post('/',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        body('id_empresa').isInt({ min: 1 }),
        body('nombre').isString().trim().notEmpty(),
        body('tipo').isIn(['IVA','ISR','IEPS','RETENCION','OTRO']),
        body('modo').isIn(['TASA','CUOTA','EXENTO']),
        body('tasa').optional().isDecimal(),
        body('cuota').optional().isDecimal(),
        body('aplica_en').isIn(['VENTA','COMPRA','AMBOS']),
        body('es_estandar').optional().isBoolean().toBoolean(),
        body('vigencia_inicio').isISO8601(),
        body('vigencia_fin').optional({ nullable: true }).custom(v => v === null || !isNaN(Date.parse(v)))
        .withMessage('vigencia_fin debe ser fecha (YYYY-MM-DD) o null'),
        body('cuenta_relacionada').optional().isString(),
    ],
    createImpuestoCtrl
);

router.put('/:id',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('nombre').optional().isString().trim(),
        body('tipo').optional().isIn(['IVA','ISR','IEPS','RETENCION','OTRO']),
        body('modo').optional().isIn(['TASA','CUOTA','EXENTO']),
        body('tasa').optional().isDecimal(),
        body('cuota').optional().isDecimal(),
        body('aplica_en').optional().isIn(['VENTA','COMPRA','AMBOS']),
        body('es_estandar').optional().isBoolean().toBoolean(),
        body('vigencia_inicio').optional().isISO8601(),
        body('vigencia_fin').optional().isISO8601(),
        body('cuenta_relacionada').optional().isString(),
    ],
    updateImpuestoCtrl
);

router.delete('/:id',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    deleteImpuestoCtrl
);

export default router;