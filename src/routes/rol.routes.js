import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import { listRoles, getRolById, createRol, updateRol, deleteRol, replacePermisosOnRol} from '../controllers/rol.controller.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';

const router = Router();

router.get( '/', authenticateJWT, ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador', 'Contador', 'Auditor'),
    [
        query('q').optional().isString().trim(),
        query('activo').optional().isBoolean().toBoolean(),
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    listRoles
);

router.get( '/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador', 'Contador', 'Auditor'),
    [param('id').isInt({ min: 1 })],
    getRolById
);

router.post( '/', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [
        body('nombre').isString().trim().notEmpty(),
        body('descripcion').optional({ nullable: true }).isString().trim(),
        body('activo').optional().isBoolean().toBoolean(),
    ],
    createRol
);

router.put( '/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('nombre').optional().isString().trim(),
        body('descripcion').optional({ nullable: true }).isString().trim(),
        body('activo').optional().isBoolean().toBoolean(),
    ],
    updateRol
);

router.delete( '/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [param('id').isInt({ min: 1 })],
    deleteRol
);

// Reemplaza TODOS los permisos del rol por los nombres enviados
router.post( '/:id/permisos', authenticateJWT, ensureNotRevoked, requireFreshPassword(),
    [
        param('id').isInt({ min: 1 }),
        body('permisos').isArray().withMessage('Debe ser un arreglo de nombres de permiso'),
        body('permisos.*').isString().trim().notEmpty(),
    ],
    replacePermisosOnRol
);

export default router;
