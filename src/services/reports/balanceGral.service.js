import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

export async function getBalanceGeneral({ periodoIni, periodoFin }) {
    const sql = `
    WITH
    per AS (
    SELECT
        MIN(fecha_inicio) AS f_ini,
        MAX(fecha_fin)    AS f_fin
    FROM periodo_contable
    WHERE id_periodo BETWEEN :pini AND :pfin
    ),

    ini AS (
    SELECT
        m.id_cuenta,
        SUM(CASE WHEN m.operacion = '0' THEN m.monto ELSE 0 END) AS cargos_ini,
        SUM(CASE WHEN m.operacion = '1' THEN m.monto ELSE 0 END) AS abonos_ini
    FROM movimiento_poliza m, per p
    WHERE m.fecha < p.f_ini
    GROUP BY m.id_cuenta
    ),

    cur AS (
    SELECT
        m.id_cuenta,
        SUM(CASE WHEN m.operacion = '0' THEN m.monto ELSE 0 END) AS cargos_per,
        SUM(CASE WHEN m.operacion = '1' THEN m.monto ELSE 0 END) AS abonos_per
    FROM movimiento_poliza m, per p
    WHERE m.fecha >= p.f_ini AND m.fecha <= p.f_fin
    GROUP BY m.id_cuenta
    ),

    base AS (
    SELECT
        c.id,
        c.codigo,
        c.nombre,
        c.naturaleza,
        c.tipo,
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

    bs_detalle AS (
    SELECT
        tipo,
        codigo,
        nombre,
        naturaleza,
        CASE WHEN naturaleza = 'DEUDORA'
            THEN GREATEST((cargos_ini - abonos_ini) + (cargos_per - abonos_per), 0)
            ELSE 0 END AS saldo_final_deudor,
        CASE WHEN naturaleza = 'ACREEDORA'
            THEN GREATEST((abonos_ini - cargos_ini) + (abonos_per - cargos_per), 0)
            ELSE 0 END AS saldo_final_acreedor
    FROM base
    WHERE tipo IN ('ACTIVO','PASIVO','CAPITAL')
        AND codigo SIMILAR TO '(1|2|3)%'   -- Blindaje por prefijo
    ),

    bs_limpio AS (
    SELECT
        tipo,
        codigo,
        nombre,
        saldo_final_deudor,
        saldo_final_acreedor
    FROM bs_detalle
    WHERE (saldo_final_deudor + saldo_final_acreedor) <> 0
    )

    SELECT
    CASE
        WHEN GROUPING(tipo) = 0 AND GROUPING(codigo) = 0 THEN 'DETALLE'
        WHEN GROUPING(tipo) = 0 AND GROUPING(codigo) = 1 THEN 'SUBTOTAL'
        WHEN GROUPING(tipo) = 1 THEN 'TOTAL'
    END AS nivel,
    tipo,
    codigo,
    nombre,
    SUM(saldo_final_deudor)   AS saldo_deudor,
    SUM(saldo_final_acreedor) AS saldo_acreedor
    FROM bs_limpio
    GROUP BY GROUPING SETS (
    (tipo, codigo, nombre),
    (tipo),
    ()
    )
    ORDER BY
    CASE WHEN GROUPING(tipo)=1 THEN 4
        WHEN tipo='ACTIVO'  THEN 1
        WHEN tipo='PASIVO'  THEN 2
        WHEN tipo='CAPITAL' THEN 3
        ELSE 9 END,
    CASE WHEN GROUPING(codigo)=1 THEN 2 ELSE 1 END,
    codigo;
    `;

    const rows = await sequelize.query(sql, {
        type: QueryTypes.SELECT,
        replacements: { pini: periodoIni, pfin: periodoFin },
    });

    return rows;
}