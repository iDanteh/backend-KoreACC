import { sequelize } from '../config/db.js';
import { EjercicioContable } from '../models/index.js';
import { getPrimerPeriodoDelEjercicio, obtenerSaldosFinalesBalancePorCuenta, upsertPolizaApertura } from './periodo-autogen.service.js';

export async function recalcularAperturaTrasCierre({ id_empresa, id_ejercicio_cerrado, id_ejercicio_destino, id_usuario, id_centro }) {
  const ejercicioAnterior = await EjercicioContable.findByPk(id_ejercicio_cerrado);
  const ejercicioDestino  = await EjercicioContable.findByPk(id_ejercicio_destino);
  if (!ejercicioAnterior || !ejercicioDestino) throw new Error('Ejercicio no encontrado');

  const primerPeriodo = await getPrimerPeriodoDelEjercicio(ejercicioDestino.id_ejercicio);
  if (!primerPeriodo) throw new Error('Ejercicio destino sin períodos');

  const saldos = await obtenerSaldosFinalesBalancePorCuenta(ejercicioAnterior.id_ejercicio);

  const t = await sequelize.transaction();
  try {
    const pol = await upsertPolizaApertura({
      id_empresa,
      ejercicioDestino,
      primerPeriodo,
      saldos,
      id_usuario,
      id_centro,
      provisional: false,
      t,
    });
    await t.commit();
    return { id_poliza: pol.id_poliza, actualizado: true };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}