
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

/**
 * Retorna una sola fila con totales del Estado de Resultados:
 * ingresos, costos, utilidad_bruta, gastos_operacion, utilidad_neta
 */
export async function getEstadoResultados({ periodoIni, periodoFin }) {
  const sql = `
WITH
per AS (
  SELECT
    MIN(fecha_inicio) AS f_ini,
    MAX(fecha_fin)    AS f_fin
  FROM periodo_contable
  WHERE id_periodo BETWEEN :pini AND :pfin
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
    COALESCE(u.cargos_per, 0) AS cargos_per,
    COALESCE(u.abonos_per, 0) AS abonos_per,
    CASE
      WHEN c.codigo LIKE '4%' THEN 'INGRESO'
      WHEN c.codigo LIKE '5%' THEN 'COSTO'
      WHEN c.codigo LIKE '6%' THEN 'GASTO'
      ELSE 'OTRO'
    END AS tipo_er
  FROM cuentas c
  LEFT JOIN cur u ON u.id_cuenta = c.id
  WHERE COALESCE(c.posteable, TRUE) = TRUE
    AND COALESCE(c.deleted,  FALSE) = FALSE
),

detalle AS (
  SELECT
    CASE WHEN tipo_er = 'INGRESO' THEN GREATEST(abonos_per - cargos_per, 0) ELSE 0 END AS ingresos,
    CASE WHEN tipo_er = 'COSTO'   THEN GREATEST(cargos_per - abonos_per, 0) ELSE 0 END AS costos,
    CASE WHEN tipo_er = 'GASTO'   THEN GREATEST(cargos_per - abonos_per, 0) ELSE 0 END AS gastos
  FROM base
)

SELECT
  SUM(ingresos)                                      AS ingresos,
  SUM(costos)                                        AS costos,
  SUM(ingresos) - SUM(costos)                        AS utilidad_bruta,
  SUM(gastos)                                        AS gastos_operacion,
  (SUM(ingresos) - SUM(costos) - SUM(gastos))        AS utilidad_neta
FROM detalle;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { pini: periodoIni, pfin: periodoFin }, // <- Sequelize sustituye :pini y :pfin
  });

  // rows será un arreglo con 1 objeto; devolvemos el primero
  return rows[0] ?? {
    ingresos: 0,
    costos: 0,
    utilidad_bruta: 0,
    gastos_operacion: 0,
    utilidad_neta: 0,
  };
}
