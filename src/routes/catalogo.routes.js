import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.js';
import { getRolesYPermisos } from '../controllers/catalogo.controller.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';

const router = Router();

// Lectura para construir formularios: cualquiera autenticado con rol de lectura
router.get( '/roles-permisos', authenticateJWT,requireFreshPassword(),
    getRolesYPermisos
);

export default router;