import { Router } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const estados = ['Por revisar', 'Aprobada', 'Contabilizada'];

    const resumen = await sequelize.query(
      `
      SELECT 
        tp.naturaleza AS tipo,
        p.estado,
        COUNT(*)::int AS total_polizas
      FROM poliza p
      JOIN tipo_poliza tp ON tp.id_tipopoliza = p.id_tipopoliza
      WHERE p.estado IN (:estados)
      GROUP BY tp.naturaleza, p.estado
      ORDER BY tp.naturaleza, p.estado;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { estados },
      }
    );
    const movimientos = await sequelize.query(
      `
      SELECT
        DATE_TRUNC('month', m.fecha)::date AS mes,

        -- INGRESOS: 4... y 52...
        SUM(
          CASE
            WHEN LEFT(c.codigo::text, 1) = '4' OR LEFT(c.codigo::text, 2) = '52' THEN
              CASE
                WHEN m.operacion = '1' THEN m.monto       -- abono a ingreso = aumenta ingreso
                WHEN m.operacion = '0' THEN -m.monto      -- cargo a ingreso = disminuye ingreso
                ELSE 0
              END
            ELSE 0
          END
        ) AS ingresos,

        -- EGRESOS: 5... y 6...
        SUM(
          CASE
            WHEN LEFT(c.codigo::text, 1) IN ('5','6') THEN
              CASE
                WHEN m.operacion = '0' THEN m.monto       -- cargo a gasto/costo/impuesto = aumenta egreso
                WHEN m.operacion = '1' THEN -m.monto      -- abono a gasto/costo/impuesto = disminuye egreso
                ELSE 0
              END
            ELSE 0
          END
        ) AS egresos

      FROM movimiento_poliza m
      JOIN poliza  p ON p.id_poliza = m.id_poliza
      JOIN cuentas c ON c.id = m.id_cuenta
      WHERE p.estado IN (:estados)
      GROUP BY 1
      ORDER BY 1;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { estados },
      }
    );

    const movimientosConResultado = movimientos.map((r) => {
      const ingresos = Number(r.ingresos ?? 0);
      const egresos = Number(r.egresos ?? 0);
      return {
        ...r,
        resultado: ingresos - egresos,
      };
    });

    res.json({ resumen, movimientos: movimientosConResultado });
  } catch (error) {
    console.error('Dashboard contable error:', error);
    res.status(500).json({ error: 'Error generando dashboard contable' });
  }
});

export default router;