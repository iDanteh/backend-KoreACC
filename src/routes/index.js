import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usuarioRoutes from './usuario.routes.js';
import rolRoutes from './rol.routes.js';
import permisoRoutes from './permiso.routes.js';
import catalogoRoutes  from './catalogo.routes.js'

const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/roles', rolRoutes);
router.use('/permisos', permisoRoutes);
router.use('/catalogos', catalogoRoutes);

export default router;