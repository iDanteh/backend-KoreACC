import { sequelize } from '../../config/db.js';

// Cuentas que inician con el código: '5105%' = Compras (costo)
const COSTO_VENTAS_PREFIJOS = ['5105%']; 
const GASTOS_OP_PREFIJOS    = [''];

// Construye condición SQL de filtro por estado de periodo
function buildPeriodoEstadoCondition(periodStatus) {
    if (!periodStatus || periodStatus === 'ambos') return 'TRUE';
    if (periodStatus === 'abiertos') return 'per.esta_abierto = TRUE';
    if (periodStatus === 'cerrados') return 'per.esta_abierto = FALSE';
    return 'TRUE';
}

// Construye condición por centro (todos o uno)

function buildCentroCondition(idCentro) {
    if (!idCentro || idCentro === 'todos') return 'TRUE';
    return 'p.id_centro = :idCentro';
}

function buildLikeAny(field, prefixes) {
    if (!prefixes || prefixes.length === 0) return 'FALSE';
    return '(' + prefixes.map((_, i) => `${field} LIKE :px${i}`).join(' OR ') + ')';
}

/**
 * Endpoint principal: Estado de Resultados
 * Parámetros:
 *  - desde (DATE, requerido)
 *  - hasta (DATE, requerido)  [exclusivo: < hasta]
 *  - periodStatus: 'abiertos' | 'cerrados' | 'ambos'
 *  - idCentro: número o 'todos'
 *  - detalle: boolean ('true'/'false') -> incluye detalle por cuenta
 *  - porMes: boolean -> agrega arreglo mensual
 */
export async function getEstadoResultados({
    desde,
    hasta,
    periodStatus = 'ambos',
    idCentro = 'todos',
    detalle = false,
    porMes = false,
    }) {
    if (!desde || !hasta) {
        const err = new Error('Parámetros requeridos: desde, hasta');
        err.status = 400;
        throw err;
    }

    const periodoEstadoCond = buildPeriodoEstadoCondition(periodStatus);
    const centroCond = buildCentroCondition(idCentro);

    const replacementsBase = {
    desde,
    hasta,
    periodoEstadoCond: periodStatus === 'abiertos'
        ? 'per.esta_abierto = TRUE'
        : periodStatus === 'cerrados'
        ? 'per.esta_abierto = FALSE'
        : 'TRUE',
    centroCond: (idCentro && idCentro !== 'todos') ? 'p.id_centro = :idCentro' : 'TRUE',
    hasGastoOp: GASTOS_OP_PREFIJOS.length > 0,
    costo1: COSTO_VENTAS_PREFIJOS[0] || '____',
    gop1:   GASTOS_OP_PREFIJOS[0]    || '____',
    };
    if (idCentro !== 'todos') replacementsBase.idCentro = Number(idCentro);

    // Prefijos costo/gasto-op en replacements
    COSTO_VENTAS_PREFIJOS.forEach((p, i) => (replacementsBase[`px${i}`] = p));
    GASTOS_OP_PREFIJOS.forEach((p, i) => (replacementsBase[`gx${i}`] = p));

    const costoLike = buildLikeAny('c.codigo', COSTO_VENTAS_PREFIJOS);
    const gastoOpLike = buildLikeAny('c.codigo', GASTOS_OP_PREFIJOS);

    const sqlER = `
        WITH mov AS (
    SELECT
        mp.id_cuenta,
        c.codigo,
        c.nombre,
        c.tipo,  -- ACTIVO | PASIVO | CAPITAL | INGRESO | GASTO
        (CASE WHEN mp.operacion='0' THEN mp.monto ELSE 0 END) AS debe,
        (CASE WHEN mp.operacion='1' THEN mp.monto ELSE 0 END) AS haber
    FROM movimiento_poliza mp
    JOIN poliza p              ON p.id_poliza = mp.id_poliza
    JOIN tipo_poliza t         ON t.id_tipopoliza = p.id_tipopoliza
    JOIN cuentas c             ON c.id = mp.id_cuenta
    JOIN periodo_contable per  ON per.id_periodo = p.id_periodo
    WHERE t.naturaleza NOT IN ('apertura','cierre')
        AND mp.fecha >= :desde AND mp.fecha < :hasta
        AND /*periodo*/  :periodoEstadoCond
        AND /*centro*/   :centroCond
    ),
    sumas AS (
    SELECT
        SUM(CASE WHEN tipo='INGRESO' THEN (haber - debe) ELSE 0 END) AS ingresos,
        SUM(CASE WHEN tipo='GASTO'   THEN (debe - haber) ELSE 0 END) AS gastos_totales,
        SUM(CASE WHEN (codigo LIKE :costo1) THEN (debe - haber) ELSE 0 END) AS costo_ventas,
        -- si marcas prefijos de gasto operativo, se llenará; si no, quedará 0
        SUM(CASE WHEN (codigo LIKE :gop1)   THEN (debe - haber) ELSE 0 END) AS gastos_op_marcados
    FROM mov
    )
    SELECT
    COALESCE(ingresos,0)                                   AS ingresos,
    COALESCE(costo_ventas,0)                               AS costo_ventas,
    (COALESCE(ingresos,0) - COALESCE(costo_ventas,0))      AS utilidad_bruta,
    CASE
        WHEN :hasGastoOp THEN COALESCE(gastos_op_marcados,0)
        ELSE GREATEST(COALESCE(gastos_totales,0) - COALESCE(costo_ventas,0), 0)
    END                                                    AS gastos_operacion,
    (COALESCE(ingresos,0) - COALESCE(costo_ventas,0)
    - CASE
        WHEN :hasGastoOp THEN COALESCE(gastos_op_marcados,0)
        ELSE GREATEST(COALESCE(gastos_totales,0) - COALESCE(costo_ventas,0), 0)
        END)                                                AS ebit
    FROM sumas;
    `;

    const rows = await sequelize.query(sqlER, {
    replacements: replacementsBase,
    type: sequelize.QueryTypes.SELECT,
    });
    const er = rows[0] || { ingresos:0, costo_ventas:0, utilidad_bruta:0, gastos_operacion:0, ebit:0 };

    // Detalle por cuenta (opcional)
    let detalleCuentas = [];
    if (String(detalle) === 'true') {
        const sqlDetalle = `
        WITH mov AS (
            SELECT
            mp.id_cuenta, c.codigo, c.nombre, c.tipo,
            (CASE WHEN mp.operacion='0' THEN mp.monto ELSE 0 END) AS debe,
            (CASE WHEN mp.operacion='1' THEN mp.monto ELSE 0 END) AS haber
            FROM movimiento_poliza mp
            JOIN poliza p              ON p.id_poliza = mp.id_poliza
            JOIN tipo_poliza t         ON t.id_tipopoliza = p.id_tipopoliza
            JOIN cuentas c             ON c.id = mp.id_cuenta
            JOIN periodo_contable per  ON per.id_periodo = p.id_periodo
            WHERE t.naturaleza NOT IN ('apertura','cierre')
            AND mp.fecha >= :desde AND mp.fecha < :hasta
            AND ${periodoEstadoCond}
            AND ${centroCond}
        )
        SELECT
            codigo, nombre, tipo,
            SUM(haber - debe) AS signo_ingresos,   -- útil para revisar ingresos
            SUM(debe - haber) AS signo_gastos      -- útil para revisar gastos
        FROM mov
        GROUP BY codigo, nombre, tipo
        ORDER BY codigo;
        `;
        detalleCuentas = await sequelize.query(sqlDetalle, {
        replacements: replacementsBase,
        type: sequelize.QueryTypes.SELECT,
        });
    }

    // Serie mensual (opcional)
    let mensual = [];
    if (String(porMes) === 'true') {
        const sqlMes = `
        WITH mov AS (
            SELECT
            date_trunc('month', mp.fecha)::date AS mes,
            c.tipo, c.codigo,
            (CASE WHEN mp.operacion='0' THEN mp.monto ELSE 0 END) AS debe,
            (CASE WHEN mp.operacion='1' THEN mp.monto ELSE 0 END) AS haber
            FROM movimiento_poliza mp
            JOIN poliza p              ON p.id_poliza = mp.id_poliza
            JOIN tipo_poliza t         ON t.id_tipopoliza = p.id_tipopoliza
            JOIN cuentas c             ON c.id = mp.id_cuenta
            JOIN periodo_contable per  ON per.id_periodo = p.id_periodo
            WHERE t.naturaleza NOT IN ('apertura','cierre')
            AND mp.fecha >= :desde AND mp.fecha < :hasta
            AND ${periodoEstadoCond}
            AND ${centroCond}
        )
        SELECT
            mes,
            SUM(CASE WHEN tipo='INGRESO' THEN (haber - debe) ELSE 0 END) AS ingresos,
            SUM(CASE WHEN ${costoLike} THEN (debe - haber) ELSE 0 END)   AS costo_ventas,
            SUM(CASE WHEN tipo='GASTO' THEN (debe - haber) ELSE 0 END)   AS gastos_totales
        FROM mov
        GROUP BY mes
        ORDER BY mes;
        `;
        mensual = await sequelize.query(sqlMes, {
        replacements: replacementsBase,
        type: sequelize.QueryTypes.SELECT,
        }).then(rows => rows.map(r => ({
        ...r,
        utilidad_bruta: Number(r.ingresos) - Number(r.costo_ventas || 0),
        ebit: Number(r.ingresos) - Number(r.costo_ventas || 0) - Math.max(Number(r.gastos_totales || 0) - Number(r.costo_ventas || 0), 0),
        })));
    }

    return {
        params: { desde, hasta, periodStatus, idCentro },
        er: {
        ingresos: Number(er.ingresos || 0),
        costo_ventas: Number(er.costo_ventas || 0),
        utilidad_bruta: Number(er.utilidad_bruta || 0),
        gastos_operacion: Number(er.gastos_operacion || 0),
        ebit: Number(er.ebit || 0),
        },
        detalle: detalleCuentas,
        mensual,
    };
}