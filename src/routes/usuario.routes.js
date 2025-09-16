import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.js';
import { listUsuarios, me } from '../controllers/usuario.controller.js';

const router = Router();

router.get('/me', authenticateJWT, me);
router.get('/', authenticateJWT, authorizeRoles('Administrador', 'Contador'), listUsuarios);

export default router;
