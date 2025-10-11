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
        query('tipo').optional().isIn(['IVA', 'ISR', 'IEPS', 'RETENCION', 'OTRO']),
        query('aplica_en').optional().isIn(['VENTA', 'COMPRA', 'AMBOS']),
        query('q').optional().isString().trim(),
        query('includeCuenta').optional().isBoolean().toBoolean(),
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
        body('tasa').optional({ nullable: true }).isDecimal().toFloat(),
        body('cuota').optional({ nullable: true }).isDecimal().toFloat(),
        body('aplica_en').isIn(['VENTA','COMPRA','AMBOS']),
        body('es_estandar').optional().isBoolean().toBoolean(),
        body('vigencia_inicio').isISO8601(),
        body('vigencia_fin').optional({ nullable: true }).custom(v => v === null || !isNaN(Date.parse(v)))
        .withMessage('vigencia_fin debe ser fecha (YYYY-MM-DD) o null'),
        body('id_cuenta').optional({ nullable: true })
        .customSanitizer((v) => (v === '' || v === undefined ? null : v))
        .if(body('id_cuenta').not().equals(null))
        .isInt({ min: 1 })
        .toInt(),
    ],
    createImpuestoCtrl
);

router.put('/:id',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('nombre').optional().isString().trim(),
        body('tipo').optional().isIn(['IVA','ISR','IEPS','RETENCION','OTRO']),
        body('modo').optional().isIn(['TASA','CUOTA','EXENTO']),
        body('tasa').optional({ nullable: true }).isDecimal().toFloat(),
        body('cuota').optional({ nullable: true }).isDecimal().toFloat(),
        body('aplica_en').optional().isIn(['VENTA','COMPRA','AMBOS']),
        body('es_estandar').optional().isBoolean().toBoolean(),
        body('vigencia_inicio').optional().isISO8601(),
        body('vigencia_fin').optional().isISO8601(),
        body('id_cuenta').optional({ nullable: true })
        .customSanitizer((v) => (v === '' || v === undefined ? null : v))
        .if(body('id_cuenta').not().equals(null))
        .isInt({ min: 1 })
        .toInt(),
    ],
    updateImpuestoCtrl
);

router.delete('/:id',authenticateJWT,ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    deleteImpuestoCtrl
);

export default router;