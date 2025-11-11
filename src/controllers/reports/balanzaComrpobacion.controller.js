// controllers/mayorController.js
import { getMayorByPeriodRange } from '../../services/reports/balanzaComprobacion.service.js';

export async function mayorPorPeriodo(req, res) {
  try {
    const periodoIni = parseInt(req.query.periodo_ini, 10);
    const periodoFin = parseInt(req.query.periodo_fin, 10);

    if (Number.isNaN(periodoIni) || Number.isNaN(periodoFin)) {
      return res.status(400).json({ error: 'Parámetros inválidos: periodo_ini y periodo_fin deben ser enteros.' });
    }
    if (periodoIni > periodoFin) {
      return res.status(400).json({ error: 'El periodo inicial no puede ser mayor que el final.' });
    }

    const data = await getMayorByPeriodRange({ periodoIni, periodoFin });
    return res.json({ ok: true, count: data.length, data });
  } catch (err) {
    console.error('Error en mayorPorPeriodo:', err);
    return res.status(500).json({ ok: false, error: 'Error interno al generar el reporte.' });
  }
}
