import { Router } from 'express';
import { estadoResultados } from '../../controllers/reports/estadoResultados.controller.js';
import { mayorPorPeriodo } from '../../controllers/reports/balanzaComrpobacion.controller.js';

const router = Router();


// GET reports/estado-resultados?periodo_ini=160&periodo_fin=161
router.get('/estado-resultados', estadoResultados);

// GET reports/mayor?periodo_ini=160&periodo_fin=161
router.get('/mayor', mayorPorPeriodo);

export default router;