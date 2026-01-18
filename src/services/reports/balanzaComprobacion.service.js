import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

/**
 * Ejecuta el mayor resumido para el rango de periodos dado.
 * Mantiene la semántica de: WHERE id_periodo BETWEEN :pini AND :pfin
 */
export async function getMayorByPeriodRange({ periodoIni, periodoFin }) {
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
    c.id, c.codigo, c.nombre, c.naturaleza,
    COALESCE(i.cargos_ini,0) AS cargos_ini,
    COALESCE(i.abonos_ini,0) AS abonos_ini,
    COALESCE(u.cargos_per,0) AS cargos_per,
    COALESCE(u.abonos_per,0) AS abonos_per
  FROM cuentas c
  LEFT JOIN ini i ON i.id_cuenta = c.id
  LEFT JOIN cur u ON u.id_cuenta = c.id
  WHERE COALESCE(c.posteable, TRUE) = TRUE
    AND COALESCE(c.deleted, FALSE) = FALSE
)

SELECT
  codigo,
  nombre,

  -- netos (con signo)
  (cargos_ini - abonos_ini) AS neto_ini,
  (cargos_ini - abonos_ini) + (cargos_per - abonos_per) AS neto_fin,

  -- SALDO INICIAL (partido por signo)
  CASE WHEN (cargos_ini - abonos_ini) > 0 THEN (cargos_ini - abonos_ini) ELSE 0 END AS saldo_inicial_deudor,
  CASE WHEN (cargos_ini - abonos_ini) < 0 THEN ABS(cargos_ini - abonos_ini) ELSE 0 END AS saldo_inicial_acreedor,

  -- MOVIMIENTO
  cargos_per AS cargos,
  abonos_per AS abonos,

  -- SALDO FINAL (partido por signo)
  CASE WHEN ((cargos_ini - abonos_ini) + (cargos_per - abonos_per)) > 0
       THEN ((cargos_ini - abonos_ini) + (cargos_per - abonos_per))
       ELSE 0
  END AS saldo_final_deudor,

  CASE WHEN ((cargos_ini - abonos_ini) + (cargos_per - abonos_per)) < 0
       THEN ABS((cargos_ini - abonos_ini) + (cargos_per - abonos_per))
       ELSE 0
  END AS saldo_final_acreedor

FROM base
WHERE (cargos_ini + abonos_ini + cargos_per + abonos_per) <> 0
ORDER BY codigo;
`;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { pini: periodoIni, pfin: periodoFin },
  });

  return rows;
}
