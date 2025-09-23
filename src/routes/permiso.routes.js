import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import { listPermisos, getPermisoById, createPermiso, updatePermiso, deletePermiso} from '../controllers/permiso.controller.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';

const router = Router();

router.get( '/', authenticateJWT, ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador', 'Contador', 'Auditor'),
    [
        query('q').optional().isString().trim(),
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    ],
    listPermisos
);

router.get( '/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador', 'Contador', 'Auditor'),
    [param('id').isInt({ min: 1 })],
    getPermisoById
);

router.post( '/', authenticateJWT, ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador'),
    [
        body('nombre').isString().trim().notEmpty(),
        body('descripcion').optional({ nullable: true }).isString().trim(),
    ],
    createPermiso
);

router.put( '/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador'),
    [
        param('id').isInt({ min: 1 }),
        body('nombre').optional().isString().trim(),
        body('descripcion').optional({ nullable: true }).isString().trim(),
    ],
    updatePermiso
);

router.delete( '/:id', authenticateJWT, ensureNotRevoked, requireFreshPassword(), authorizeRoles('Administrador'),
    [param('id').isInt({ min: 1 })],
    deletePermiso
);

export default router;