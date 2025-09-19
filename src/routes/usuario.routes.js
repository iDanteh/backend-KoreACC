import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, authorizeRoles, ensureNotRevoked } from '../middlewares/auth.js';
import { listUsuarios, me, getUsuarioById, createUsuario, updateUsuario, deleteUsuario,
    reactivateUsuario, replaceRoles } from '../controllers/usuario.controller.js';

const router = Router();

router.get('/me', authenticateJWT, me);

// Listado con filtros/paginación
router.get( '/', authenticateJWT, ensureNotRevoked, authorizeRoles('Administrador', 'Contador', 'Auditor'),
    [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('q').optional().isString().trim(),
        query('estatus').optional().isBoolean().toBoolean(),
    ],
    listUsuarios
);

router.get( '/:id', authenticateJWT, ensureNotRevoked, authorizeRoles('Administrador', 'Contador', 'Auditor'),
    [param('id').isInt({ min: 1 })],
    getUsuarioById
);

router.post( '/', authenticateJWT,ensureNotRevoked, authorizeRoles('Administrador'),
    [
        body('nombre').isString().trim().notEmpty(),
        body('apellido_p').isString().trim().notEmpty(),
        body('apellido_m').optional({ nullable: true }).isString().trim(),
        body('correo').isEmail().normalizeEmail(),
        body('telefono').optional({ nullable: true }).isString().trim(),
        body('usuario').isString().trim().notEmpty(),
        body('estatus').optional().isBoolean().toBoolean(),
        body('roles').optional().isArray().custom((arr)=>arr.every(r=>typeof r==='string')),
    ],
    createUsuario
);

router.put( '/:id', authenticateJWT,ensureNotRevoked, authorizeRoles('Administrador'),
    [
        param('id').isInt({ min: 1 }),
        body('nombre').optional().isString().trim(),
        body('apellido_p').optional().isString().trim(),
        body('apellido_m').optional({ nullable: true }).isString().trim(),
        body('correo').optional().isEmail().normalizeEmail(),
        body('telefono').optional({ nullable: true }).isString().trim(),
        body('usuario').optional().isString().trim(),
        body('estatus').optional().isBoolean().toBoolean(),
        body('roles').optional().isArray().custom((arr)=>arr.every(r=>typeof r==='string')),
    ],
    updateUsuario
);

router.delete( '/:id', authenticateJWT, ensureNotRevoked, authorizeRoles('Administrador'),
    [param('id').isInt({ min: 1 })],
    deleteUsuario
);

router.patch( '/:id/reactivar', authenticateJWT, ensureNotRevoked, authorizeRoles('Administrador'),
    [param('id').isInt({ min: 1 })],
    reactivateUsuario
);

router.post( '/:id/roles', authenticateJWT, ensureNotRevoked, authorizeRoles('Administrador'),
    [
        param('id').isInt({ min: 1 }),
        body('roles').isArray({ min: 0 }).custom((arr)=>arr.every(r=>typeof r==='string')),
    ],
    replaceRoles
);

export default router;