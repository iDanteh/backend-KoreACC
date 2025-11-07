import { getEstadoResultados } from '../../services/reports/estadoResultados.service.js';

export async function estadoResultadosController(req, res) {
  try {
    const {
      desde,
      hasta,
      periodStatus = 'ambos', // 'abiertos' | 'cerrados' | 'ambos'
      idCentro = 'todos',
      detalle = 'false',
      porMes = 'false',
    } = req.query;

    const data = await getEstadoResultados({
      desde,
      hasta,
      periodStatus,
      idCentro,
      detalle,
      porMes,
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error('[ER] Error:', err);
    res.status(err.status || 500).json({
      ok: false,
      message: err.message || 'Error generando Estado de Resultados',
    });
  }
}