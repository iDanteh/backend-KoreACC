import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

export async function getBalanceGeneral({ periodoIni, periodoFin }) {
    const sql = `
    WITH
    per AS (
    SELECT MIN(fecha_inicio) AS f_ini, MAX(fecha_fin) AS f_fin
    FROM periodo_contable
    WHERE id_periodo BETWEEN :pini AND :pfin
    ),
    ini AS (
    SELECT m.id_cuenta,
        SUM(CASE WHEN m.operacion='0' THEN m.monto ELSE 0 END) AS cargos_ini,
        SUM(CASE WHEN m.operacion='1' THEN m.monto ELSE 0 END) AS abonos_ini
    FROM movimiento_poliza m
    CROSS JOIN per p
    WHERE m.fecha < p.f_ini
    GROUP BY m.id_cuenta
    ),
    cur AS (
    SELECT m.id_cuenta,
        SUM(CASE WHEN m.operacion='0' THEN m.monto ELSE 0 END) AS cargos_per,
        SUM(CASE WHEN m.operacion='1' THEN m.monto ELSE 0 END) AS abonos_per
    FROM movimiento_poliza m
    CROSS JOIN per p
    WHERE m.fecha >= p.f_ini AND m.fecha <= p.f_fin
    GROUP BY m.id_cuenta
    ),
    base AS (
    SELECT
        c.id, c.codigo, c.nombre, c.naturaleza, c.tipo,
        COALESCE(i.cargos_ini,0) AS cargos_ini,
        COALESCE(i.abonos_ini,0) AS abonos_ini,
        COALESCE(u.cargos_per,0) AS cargos_per,
        COALESCE(u.abonos_per,0) AS abonos_per
    FROM cuentas c
    LEFT JOIN ini i ON i.id_cuenta = c.id
    LEFT JOIN cur u ON u.id_cuenta = c.id
    WHERE COALESCE(c.posteable, TRUE) = TRUE
        AND COALESCE(c.deleted,  FALSE) = FALSE
    ),

    resultado AS (
    SELECT
        SUM(
        CASE
            WHEN b.tipo='INGRESO' THEN (b.abonos_ini - b.cargos_ini) + (b.abonos_per - b.cargos_per)
            WHEN b.tipo='GASTO'   THEN -1 * ((b.cargos_ini - b.abonos_ini) + (b.cargos_per - b.abonos_per))
            ELSE 0
        END
        ) AS resultado
    FROM base b
    ),

    cta_resultado AS (
    SELECT id, codigo, nombre
    FROM cuentas
    WHERE codigo='3105000000' AND COALESCE(deleted,FALSE)=FALSE
    LIMIT 1
    ),

    -- Aquí queda la magia: lado correcto según naturaleza, y si queda “al revés”, se pasa al otro lado.
    bs_detalle AS (
    SELECT
        b.tipo,
        b.codigo,
        b.nombre,

        CASE
        WHEN b.naturaleza='DEUDORA' THEN GREATEST(((b.cargos_ini-b.abonos_ini)+(b.cargos_per-b.abonos_per)), 0)
        ELSE GREATEST(-(((b.abonos_ini-b.cargos_ini)+(b.abonos_per-b.cargos_per))), 0)
        END AS saldo_final_deudor,

        CASE
        WHEN b.naturaleza='ACREEDORA' THEN GREATEST(((b.abonos_ini-b.cargos_ini)+(b.abonos_per-b.cargos_per)), 0)
        ELSE GREATEST(-(((b.cargos_ini-b.abonos_ini)+(b.cargos_per-b.abonos_per))), 0)
        END AS saldo_final_acreedor

    FROM base b
    WHERE b.tipo IN ('ACTIVO','PASIVO','CAPITAL')
        AND b.codigo ~ '^[123]'

    UNION ALL

    -- Inyección del resultado del ejercicio en CAPITAL: si es utilidad → acreedor, si es pérdida → deudor
    SELECT
        'CAPITAL' AS tipo,
        COALESCE(cr.codigo,'3105000000') AS codigo,
        COALESCE(cr.nombre,'RESULTADO DEL EJERCICIO') AS nombre,
        CASE WHEN r.resultado < 0 THEN ABS(r.resultado) ELSE 0 END AS saldo_final_deudor,
        CASE WHEN r.resultado > 0 THEN r.resultado      ELSE 0 END AS saldo_final_acreedor
    FROM resultado r
    LEFT JOIN cta_resultado cr ON TRUE
    WHERE COALESCE(r.resultado,0) <> 0
    ),

    bs_limpio AS (
    SELECT *
    FROM bs_detalle
    WHERE (saldo_final_deudor + saldo_final_acreedor) <> 0
    )

    SELECT
    CASE
        WHEN GROUPING(tipo)=0 AND GROUPING(codigo)=0 THEN 'DETALLE'
        WHEN GROUPING(tipo)=0 AND GROUPING(codigo)=1 THEN 'SUBTOTAL'
        WHEN GROUPING(tipo)=1 THEN 'TOTAL'
    END AS nivel,
    tipo, codigo, nombre,
    SUM(saldo_final_deudor)   AS saldo_deudor,
    SUM(saldo_final_acreedor) AS saldo_acreedor
    FROM bs_limpio
    GROUP BY GROUPING SETS ((tipo,codigo,nombre),(tipo),())
    ORDER BY
    CASE WHEN GROUPING(tipo)=1 THEN 4
        WHEN tipo='ACTIVO' THEN 1 WHEN tipo='PASIVO' THEN 2 WHEN tipo='CAPITAL' THEN 3 ELSE 9 END,
    CASE WHEN GROUPING(codigo)=1 THEN 2 ELSE 1 END,
    codigo;
    `;

    const rows = await sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: { pini: periodoIni, pfin: periodoFin },
    });

    return rows;
}