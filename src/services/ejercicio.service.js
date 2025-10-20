// services/ejercicio.service.js
import { Op } from 'sequelize';
import { EjercicioContable, Empresa, PeriodoContable, sequelize } from '../models/index.js';
import { httpError } from '../utils/helper-poliza.js';

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

export async function cerrarEjercicio(id_ejercicio) {
  return sequelize.transaction( async (t) => {
    const ejercicio = await EjercicioContable.findByPk(id_ejercicio, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if(!ejercicio) return null;
    if(!ejercicio.esta_abierto) return true;

    const existeAbierto = await PeriodoContable.findOne({
      where: { id_ejercicio, esta_abierto: true },
      attributes: ['id_periodo'],
      transaction: t,
    });
    if (existeAbierto) throw httpError('No se puede cerrar: hay periodos abiertos.', 409);

    await ejercicio.update(
      { esta_abierto: false, updated_at: new Date() },
      { transaction: t },
    );
    return true;
  });
}