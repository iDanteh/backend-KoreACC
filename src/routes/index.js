import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usuarioRoutes from './usuario.routes.js';
import rolRoutes from './rol.routes.js';
import permisoRoutes from './permiso.routes.js';
import catalogoRoutes  from './catalogo.routes.js'
import empresaRoutes from './empresa.routes.js';
import periodoRoutes from './periodo.routes.js';
import impuestoRoutes from './impuesto.routes.js';
import ejercicios from './ejercicios.routes.js';
import cuentaRoutes from './cuenta.routes.js';
import centroCostoRoutes from './centro-costo.routes.js';
import tipoPoliza from './tipoPoliza.routes.js';
import poliza from './poliza.routes.js';
import movimientoPoliza from './movimientoPoliza.routes.js';

const router = Router();

router.use('/auth', authRoutes);

router.use('/usuarios', usuarioRoutes);
router.use('/roles', rolRoutes);
router.use('/permisos', permisoRoutes);
router.use('/catalogos', catalogoRoutes);
router.use('/empresas', empresaRoutes);
router.use('/periodos', periodoRoutes);
router.use('/impuestos', impuestoRoutes);
router.use('/ejercicios', ejercicios);
router.use('/cuentas', cuentaRoutes);
router.use('/centros', centroCostoRoutes);

router.use('/tipo-poliza', tipoPoliza);
router.use('/poliza', poliza);
router.use('/movimiento-poliza', movimientoPoliza);

export default router;
