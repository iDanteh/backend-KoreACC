import { Router } from 'express';
import { sequelize } from '../config/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [resumen] = await sequelize.query(`
      SELECT 
        tp.naturaleza AS tipo,
        p.estado,
        COUNT(*) AS total_polizas
      FROM poliza p
      JOIN tipo_poliza tp ON tp.id_tipopoliza = p.id_tipopoliza
      GROUP BY tp.naturaleza, p.estado
    `);

   const [movimientos] = await sequelize.query(`
 SELECT 
  DATE_TRUNC('month', p.fecha_creacion)::date AS mes,

  -- GANANCIAS: cuentas 4...
  SUM(
    CASE 
      WHEN LEFT(c.codigo, 1) = '4' THEN
        CASE 
          WHEN m.operacion = '1' THEN m.monto    -- abono a cuenta 4 = ingreso
          WHEN m.operacion = '0' THEN -m.monto   -- cargo a cuenta 4 = disminuye ingreso
        END
      ELSE 0
    END
  ) AS ganancias,

  -- PÉRDIDAS: cuentas 5... y 6...
  SUM(
    CASE 
      WHEN LEFT(c.codigo, 1) IN ('5','6') THEN
        CASE 
          WHEN m.operacion = '0' THEN m.monto    -- cargo a cuenta 5/6 = gasto/costo
          WHEN m.operacion = '1' THEN -m.monto   -- abono a cuenta 5/6 = disminuye gasto/costo
        END
      ELSE 0
    END
  ) AS perdidas

FROM movimiento_poliza m
JOIN poliza   p ON p.id_poliza = m.id_poliza
JOIN cuentas  c ON c.id = m.id_cuenta
GROUP BY 1
ORDER BY 1;

`);


    res.json({ resumen, movimientos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error generando dashboard contable' });
  }
});

export default router;
