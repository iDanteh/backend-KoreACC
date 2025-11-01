// routes/ejercicio.routes.js
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticateJWT, ensureNotRevoked } from '../middlewares/auth.js';
import { requireFreshPassword } from '../middlewares/requiereFreshPassword.js';
import{ EjercicioContable } from '../models/Ejercicio.js';
import {
  createEjercicioCtrl,
  listEjerciciosCtrl,
  getEjercicioCtrl,
  updateEjercicioCtrl,
  deleteEjercicioCtrl,
  abrirEjercicioCtrl,
  cerrarEjercicioCtrl,
} from '../controllers/ejercicio.controller.js';

const router = Router();

router.get('/',
  authenticateJWT, ensureNotRevoked, requireFreshPassword(),
  [
    query('id_empresa').optional().isInt({ min: 1 }),
    query('anio').optional().isInt({ min: 1900 }),
    query('esta_abierto').optional().isBoolean().toBoolean(),
    query('desde').optional().isISO8601(),
    query('hasta').optional().isISO8601(),
  ],
  listEjerciciosCtrl
);

router.get('/:id',
  authenticateJWT, ensureNotRevoked, requireFreshPassword(),
  [ param('id').isInt({ min: 1 }) ],
  getEjercicioCtrl
);

router.post('/',
  authenticateJWT, ensureNotRevoked, requireFreshPassword(),
  [
    body('id_empresa').isInt({ min: 1 }),
    body('anio').isInt({ min: 1900 }),
    body('fecha_inicio').isISO8601(),
    body('fecha_fin').isISO8601(),
    body('esta_abierto').optional().isBoolean().toBoolean(),
  ],
  createEjercicioCtrl
);

router.put('/:id',
  authenticateJWT, ensureNotRevoked, requireFreshPassword(),
  [
    param('id').isInt({ min: 1 }),
    body('id_empresa').optional().isInt({ min: 1 }),
    body('anio').optional().isInt({ min: 1900 }),
    body('fecha_inicio').optional().isISO8601(),
    body('fecha_fin').optional().isISO8601(),
    body('esta_abierto').optional().isBoolean().toBoolean(),
  ],
  updateEjercicioCtrl
);

router.delete('/:id',
  authenticateJWT, ensureNotRevoked, requireFreshPassword(),
  [ param('id').isInt({ min: 1 }) ],
  deleteEjercicioCtrl
);

router.patch('/:id/abrir',
  authenticateJWT, ensureNotRevoked, requireFreshPassword(),
  [
    param('id').isInt({ min: 1 }),
    body('cerrar_otros').optional().isBoolean().toBoolean(), 
  ],
  abrirEjercicioCtrl
);

router.patch('/:id/cerrar',
  authenticateJWT, ensureNotRevoked, requireFreshPassword(),
  [ param('id').isInt({ min: 1 }) ],
  cerrarEjercicioCtrl
);
router.put('/:id_ejercicio/select', async (req, res) => {
  const { id_ejercicio } = req.params;

  try {
    console.log('📘 Recibido id_ejercicio:', id_ejercicio);

    await EjercicioContable.update(
      { is_selected: false },
      { where: {} }
    );

    const [rowsUpdated] = await EjercicioContable.update(
      { is_selected: true },
      { where: { id_ejercicio } }
    );

    console.log('✅ rowsUpdated:', rowsUpdated);

    if (rowsUpdated === 0) {
      return res.status(404).json({ message: 'Ejercicio no encontrado' });
    }

    return res.json({ message: 'Ejercicio actualizado correctamente' });
  } catch (err) {
    console.error('🔥 Error en /ejercicios/:id/select:', err);
    return res.status(500).json({ message: 'Error al actualizar el ejercicio', error: err.message });
  }
});

export default router;