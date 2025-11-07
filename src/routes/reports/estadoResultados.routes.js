import { Router } from 'express';
import { estadoResultadosController } from '../../controllers/reports/estadoResultados.controller.js';

const router = Router();

/**
 * GET /api/estado-resultados
 * Query params:
 *  - desde=YYYY-MM-DD (requerido)
 *  - hasta=YYYY-MM-DD (requerido)  [exclusivo]
 *  - periodStatus=abiertos|cerrados|ambos (default ambos)
 *  - idCentro=<id>|todos (default todos)
 *  - detalle=true|false (default false)
 *  - porMes=true|false (default false)
 *
 * Ejemplos:
 *  /api/estado-resultados?desde=2025-01-01&hasta=2026-01-01&periodStatus=abiertos&idCentro=1&detalle=true&porMes=true
 *  /api/estado-resultados?desde=2025-01-01&hasta=2025-07-01&periodStatus=ambos&idCentro=todos
 */
router.get('/estado-resultados', estadoResultadosController);

export default router;