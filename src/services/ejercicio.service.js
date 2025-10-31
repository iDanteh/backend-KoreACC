import { Op, QueryTypes } from 'sequelize';
import { EjercicioContable, Empresa, PeriodoContable, TipoPoliza, Poliza, MovimientoPoliza, sequelize } from '../models/index.js';
import { httpError } from '../utils/helper-poliza.js';
import { recalcularAperturaTrasCierre } from './apertura-recalc.service.js';

function assertFechas(data) {
  const ini = new Date(data.fecha_inicio);
  const fin = new Date(data.fecha_fin);
  if (fin < ini) {
    const err = new Error('fecha_fin no puede ser menor a fecha_inicio');
    err.status = 400;
    throw err;
  }
}

async function haySolapeEmpresa({ id_empresa, fecha_inicio, fecha_fin, excludeId = null }) {
  const where = {
    id_empresa,
    [Op.and]: [
      { fecha_inicio: { [Op.lte]: fecha_fin } },
      { fecha_fin:     { [Op.gte]: fecha_inicio } },
    ],
  };
  if (excludeId) where.id_ejercicio = { [Op.ne]: excludeId };

  const choque = await EjercicioContable.findOne({ where });
  return !!choque;
}

export async function createEjercicio(data) {
  assertFechas(data);

  const empresa = await Empresa.findByPk(data.id_empresa);
  if (!empresa) {
    const err = new Error('Empresa no encontrada');
    err.status = 404;
    throw err;
  }

  const solapa = await haySolapeEmpresa({
    id_empresa: data.id_empresa,
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin,
  });
  if (solapa) {
    const err = new Error('Rango de fechas solapa con otro ejercicio de la misma empresa');
    err.status = 409;
    throw err;
  }

  return EjercicioContable.create(data);
}

export const getEjercicio = (id) =>
  EjercicioContable.findByPk(id, { include: [{ model: Empresa }] });

export const listEjercicios = (filters = {}) => {
  const where = {};
  if (filters.id_empresa) where.id_empresa = filters.id_empresa;
  if (filters.anio) where.anio = filters.anio;
  if (typeof filters.esta_abierto !== 'undefined') where.esta_abierto = filters.esta_abierto;

  if (filters.desde || filters.hasta) {
    const desde = filters.desde ? new Date(filters.desde) : null;
    const hasta = filters.hasta ? new Date(filters.hasta) : null;
    if (desde && hasta) {
      where.fecha_inicio = { [Op.between]: [desde, hasta] };
    } else if (desde) {
      where.fecha_inicio = { [Op.gte]: desde };
    } else if (hasta) {
      where.fecha_inicio = { [Op.lte]: hasta };
    }
  }

  return EjercicioContable.findAll({
    where,
    order: [['fecha_inicio', 'DESC'], ['id_ejercicio', 'DESC']],
  });
};

export async function updateEjercicio(id, updates) {
  const item = await EjercicioContable.findByPk(id);
  if (!item) return null;

  // Validación de fechas con mezcla de valores actuales y nuevos
  const fecha_inicio = updates.fecha_inicio ?? item.fecha_inicio;
  const fecha_fin    = updates.fecha_fin ?? item.fecha_fin;
  assertFechas({ fecha_inicio, fecha_fin });

  const id_empresa = updates.id_empresa ?? item.id_empresa;
  if (updates.id_empresa) {
    const empresa = await Empresa.findByPk(updates.id_empresa);
    if (!empresa) {
      const err = new Error('Empresa no encontrada');
      err.status = 404;
      throw err;
    }
  }

  const solapa = await haySolapeEmpresa({
    id_empresa,
    fecha_inicio,
    fecha_fin,
    excludeId: item.id_ejercicio,
  });
  if (solapa) {
    const err = new Error('Rango de fechas solapa con otro ejercicio de la misma empresa');
    err.status = 409;
    throw err;
  }

  await item.update({ ...updates, fecha_inicio, fecha_fin, id_empresa });
  return item;
}

export async function deleteEjercicio(id) {
  const item = await EjercicioContable.findByPk(id);
  if (!item) return null;
  await item.destroy();
  return true;
}

export async function abrirEjercicio(id, { cerrar_otros = true } = {}) {
  const item = await EjercicioContable.findByPk(id);
  if (!item) return null;

  if (item.esta_abierto) return item; 

  if (cerrar_otros) {
    await EjercicioContable.update(
      { esta_abierto: false },
      { where: { id_empresa: item.id_empresa, id_ejercicio: { [Op.ne]: item.id_ejercicio }, esta_abierto: true } }
    );
  }

  await item.update({ esta_abierto: true });
  return item;
}

async function getTipoPolizaIdCierre() {
  const tp = await TipoPoliza.findOne({ where: { naturaleza: 'cierre' } });
  if (!tp) throw new Error('Tipo de póliza "cierre" no configurado');
  return tp.id_tipopoliza;
}

async function getUltimoPeriodoDelEjercicio(id_ejercicio) {
  return PeriodoContable.findOne({
    where: { id_ejercicio },
    order: [['fecha_fin', 'DESC']],
  });
}

async function getEjercicioSiguiente(id_empresa, anio) {
  return EjercicioContable.findOne({
    where: { id_empresa, anio: { [Op.gt]: anio } },
    order: [['anio', 'ASC']],
  });
}

async function obtenerSaldosResultadosPorCuenta(id_ejercicio) {
  const rows = await sequelize.query(`
    SELECT c.id AS id_cuenta,
           c.tipo,
           SUM(CASE WHEN m.operacion='0' THEN m.monto ELSE 0 END) AS cargos,
           SUM(CASE WHEN m.operacion='1' THEN m.monto ELSE 0 END) AS abonos
    FROM movimiento_poliza m
    JOIN poliza p  ON p.id_poliza = m.id_poliza
    JOIN periodo_contable per ON per.id_periodo = p.id_periodo
    JOIN ejercicio_contable e  ON e.id_ejercicio = per.id_ejercicio
    JOIN cuentas c ON c.id = m.id_cuenta
    WHERE e.id_ejercicio = :ej
      AND c.tipo IN ('INGRESO','GASTO')
    GROUP BY c.id, c.tipo
  `, { replacements: { ej: id_ejercicio }, type: QueryTypes.SELECT });

  // Para cerrar: 
  //  - INGRESO: saldo = abonos - cargos  (si >0 se cierra con CARGO en la cuenta de ingreso)
  //  - GASTO:   saldo = cargos - abonos  (si >0 se cierra con ABONO en la cuenta de gasto)
  return rows.map(r => {
    const cargos = Number(r.cargos) || 0;
    const abonos = Number(r.abonos) || 0;
    const saldo = (r.tipo === 'INGRESO') ? (abonos - cargos) : (cargos - abonos);
    return { id_cuenta: r.id_cuenta, tipo: r.tipo, saldo };
  }).filter(x => Math.abs(x.saldo) > 0.00005);
}

export async function cerrarEjercicio({
  id_ejercicio,
  id_usuario,
  id_centro,
  cuentaResultadosId,
  traspasarACapital = false,
  cuentaCapitalId = null,
}) {
  const ejercicio = await EjercicioContable.findByPk(id_ejercicio);
  if (!ejercicio) throw new Error('Ejercicio no encontrado');

  const ultimoPeriodo = await getUltimoPeriodoDelEjercicio(id_ejercicio);
  if (!ultimoPeriodo) throw new Error('El ejercicio no tiene períodos');

  const id_tipopoliza_cierre = await getTipoPolizaIdCierre();
  const fechaCierre = ultimoPeriodo.fecha_fin;

  const saldos = await obtenerSaldosResultadosPorCuenta(id_ejercicio);

  let t = await sequelize.transaction();
  try {
    // 1) Upsert póliza de cierre
    const folio = `CIERRE-${ejercicio.id_empresa}-${ejercicio.anio}`;
    const concepto = `CIERRE DEL EJERCICIO ${ejercicio.anio}`;

    let polizaCierre = await Poliza.findOne({
      where: { id_periodo: ultimoPeriodo.id_periodo, id_tipopoliza: id_tipopoliza_cierre, folio },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!polizaCierre) {
      polizaCierre = await Poliza.create({
        id_tipopoliza: id_tipopoliza_cierre,
        id_periodo: ultimoPeriodo.id_periodo,
        id_usuario,
        id_centro,
        folio,
        concepto,
        estado: 'Por revisar',
        fecha_creacion: fechaCierre,
      }, { transaction: t });
    } else {
      polizaCierre.concepto = concepto;
      await polizaCierre.save({ transaction: t });
      await MovimientoPoliza.destroy({ where: { id_poliza: polizaCierre.id_poliza }, transaction: t });
    }

    // 2) Movimientos de cierre resultados vs cuentaResultadosId
    const movs = [];
    let totalIngresos = 0;
    let totalGastos = 0;

    for (const s of saldos) {
      if (s.tipo === 'INGRESO' && Math.abs(s.saldo) > 0.00005) {
        const operCuenta   = s.saldo > 0 ? '0' : '1';
        const operResultados = s.saldo > 0 ? '1' : '0';
        const monto = Math.abs(s.saldo);
        movs.push({ id_poliza: polizaCierre.id_poliza, id_cuenta: s.id_cuenta,        fecha: fechaCierre, operacion: operCuenta,     monto, cc: id_centro });
        movs.push({ id_poliza: polizaCierre.id_poliza, id_cuenta: cuentaResultadosId, fecha: fechaCierre, operacion: operResultados, monto, cc: id_centro });
        totalIngresos += s.saldo;
      }
      if (s.tipo === 'GASTO' && Math.abs(s.saldo) > 0.00005) {
        const operCuenta   = s.saldo > 0 ? '1' : '0';
        const operResultados = s.saldo > 0 ? '0' : '1';
        const monto = Math.abs(s.saldo);
        movs.push({ id_poliza: polizaCierre.id_poliza, id_cuenta: s.id_cuenta,        fecha: fechaCierre, operacion: operCuenta,     monto, cc: id_centro });
        movs.push({ id_poliza: polizaCierre.id_poliza, id_cuenta: cuentaResultadosId, fecha: fechaCierre, operacion: operResultados, monto, cc: id_centro });
        totalGastos += s.saldo;
      }
    }

    if (movs.length) {
      await MovimientoPoliza.bulkCreate(movs, { transaction: t });
    }

    if (traspasarACapital) {
      if (!cuentaCapitalId) throw new Error('cuentaCapitalId requerido para traspasar a capital');

      const utilidad = totalIngresos - totalGastos;
      if (Math.abs(utilidad) > 0.00005) {
        const folio2 = `CIERRE-CAP-${ejercicio.id_empresa}-${ejercicio.anio}`;
        const concepto2 = `TRASPASO RESULTADO ${ejercicio.anio} A CAPITAL`;

        let polizaCap = await Poliza.findOne({
          where: { id_periodo: ultimoPeriodo.id_periodo, id_tipopoliza: id_tipopoliza_cierre, folio: folio2 },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!polizaCap) {
          polizaCap = await Poliza.create({
            id_tipopoliza: id_tipopoliza_cierre,
            id_periodo: ultimoPeriodo.id_periodo,
            id_usuario,
            id_centro,
            folio: folio2,
            concepto: concepto2,
            estado: 'Por revisar',
            fecha_creacion: fechaCierre,
          }, { transaction: t });
        } else {
          polizaCap.concepto = concepto2;
          await polizaCap.save({ transaction: t });
          await MovimientoPoliza.destroy({ where: { id_poliza: polizaCap.id_poliza }, transaction: t });
        }

        const monto = Math.abs(utilidad);
        if (utilidad > 0) {
          await MovimientoPoliza.bulkCreate([
            { id_poliza: polizaCap.id_poliza, id_cuenta: cuentaResultadosId, fecha: fechaCierre, operacion: '0', monto, cc: id_centro },
            { id_poliza: polizaCap.id_poliza, id_cuenta: cuentaCapitalId,    fecha: fechaCierre, operacion: '1', monto, cc: id_centro },
          ], { transaction: t });
        } else {
          await MovimientoPoliza.bulkCreate([
            { id_poliza: polizaCap.id_poliza, id_cuenta: cuentaResultadosId, fecha: fechaCierre, operacion: '1', monto, cc: id_centro },
            { id_poliza: polizaCap.id_poliza, id_cuenta: cuentaCapitalId,    fecha: fechaCierre, operacion: '0', monto, cc: id_centro },
          ], { transaction: t });
        }
      }
    }

    ejercicio.esta_abierto = false;
    await ejercicio.save({ transaction: t });

    await t.commit();

    // 5) Recalcular/apretar apertura del ejercicio siguiente (en SU propio try/catch)
    const ejercicioDestino = await getEjercicioSiguiente(ejercicio.id_empresa, ejercicio.anio);
    let aperturaActualizada = null;
    if (ejercicioDestino) {
      try {
        aperturaActualizada = await recalcularAperturaTrasCierre({
          id_empresa: ejercicio.id_empresa,
          id_ejercicio_cerrado: ejercicio.id_ejercicio,
          id_ejercicio_destino: ejercicioDestino.id_ejercicio,
          id_usuario,
          id_centro,
        });
      } catch (e) {
        aperturaActualizada = { error: e.message };
      }
    }

    return {
      cerrado: true,
      poliza_cierre_creada: true,
      traspaso_capital: !!traspasarACapital,
      ejercicio_siguiente: ejercicioDestino?.anio ?? null,
      apertura_actualizada: aperturaActualizada,
    };
  } catch (e) {
    try {
      if (t && !t.finished) await t.rollback();
    } catch {  }
    throw e;
  }
}
