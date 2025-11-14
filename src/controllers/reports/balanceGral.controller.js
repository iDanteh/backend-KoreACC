import { getBalanceGeneral } from '../../services/reports/balanceGral.service.js';

export async function balanceGeneral(req, res) {
    try {
        const periodoIni = parseInt(req.query.periodo_ini, 10);
        const periodoFin = parseInt(req.query.periodo_fin, 10);

        if (Number.isNaN(periodoIni) || Number.isNaN(periodoFin)) {
            return res.status(400).json({ error: 'Parametros inválidos'})
        }

        if (periodoIni > periodoFin) {
            return res.status(400).json({ error: 'Parametros inválidos'})
        }

        const data = await getBalanceGeneral({ periodoIni, periodoFin});
        return res.json({ ok: true, count: data.length, data});
    } catch (error) {
        console.log('Error en balance general: ', error)
        return res.status(500).json({ ok: false, error: 'Error interno'});
    }
}