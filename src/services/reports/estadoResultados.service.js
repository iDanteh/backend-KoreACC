import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/db.js';

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
    codigo,
    nombre,
    tipo_er,
    naturaleza,
    cargos_per,
    abonos_per,
    CASE
      WHEN tipo_er = 'INGRESO'
        THEN GREATEST(abonos_per - cargos_per, 0)
      WHEN tipo_er = 'COSTO'
        THEN GREATEST(cargos_per - abonos_per, 0)
      WHEN tipo_er = 'GASTO'
        THEN GREATEST(cargos_per - abonos_per, 0)
      ELSE 0
    END AS importe
  FROM base
  WHERE tipo_er IN ('INGRESO','COSTO','GASTO')
)

SELECT
  codigo,
  nombre,
  tipo_er,
  naturaleza,
  cargos_per,
  abonos_per,
  importe
FROM detalle
WHERE importe <> 0
ORDER BY
  CASE tipo_er
    WHEN 'INGRESO' THEN 1
    WHEN 'COSTO'  THEN 2
    WHEN 'GASTO'  THEN 3
    ELSE 99
  END,
  codigo;
  `;

  const rows = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { pini: periodoIni, pfin: periodoFin },
  });

  // Totales para el resumen
  let ingresos = 0;
  let costos = 0;
  let gastos = 0;

  for (const row of rows) {
    const importe = Number(row.importe) || 0;

    if (row.tipo_er === 'INGRESO') {
      ingresos += importe;
    } else if (row.tipo_er === 'COSTO') {
      costos += importe;
    } else if (row.tipo_er === 'GASTO') {
      gastos += importe;
    }
  }

  const utilidadBruta     = ingresos - costos;
  const gastosOperacion   = gastos;
  const utilidadNeta      = utilidadBruta - gastosOperacion;

  return {
    resumen: {
      ingresos,
      costos,
      utilidad_bruta: utilidadBruta,
      gastos_operacion: gastosOperacion,
      utilidad_neta: utilidadNeta,
    },
    detalle: rows,
  };
}