import { Router } from 'express';
import { estadoResultados, exportEstadoRes } from '../../controllers/reports/estadoResultados.controller.js';
import { mayorPorPeriodo, exportBalanza } from '../../controllers/reports/balanzaComrpobacion.controller.js';
import { balanceGeneral, exportBalance } from '../../controllers/reports/balanceGral.controller.js';

const router = Router();


// GET reports/estado-resultados?periodo_ini=160&periodo_fin=161
router.get('/estado-resultados', estadoResultados);

router.get('/estado-resultados/export', exportEstadoRes);

// GET reports/mayor?periodo_ini=160&periodo_fin=161
router.get('/balanza-comprobacion', mayorPorPeriodo);

router.get('/balanza-comprobacion/export', exportBalanza);

// GET reports/mayor?periodo_ini=160&periodo_fin=161
router.get('/balance-gral', balanceGeneral);

router.get('/balance-gral/export', exportBalance);
export default router;