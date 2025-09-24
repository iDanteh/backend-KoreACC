import { PeriodoContable, Empresa } from '../models/index.js';
import { Op } from 'sequelize';

export async function createPeriodo(data) {
    if (new Date(data.fecha_fin) < new Date(data.fecha_inicio)) {
        const err = new Error('fecha_fin no puede ser menor a fecha_inicio');
        err.status = 400;
        throw err;
    }
    const emp = await Empresa.findByPk(data.id_empresa);
    if (!emp) {
        const err = new Error('Empresa no encontrada');
        err.status = 404;
        throw err;
    }
    return PeriodoContable.create(data);
}

export const getPeriodo = (id) =>
    PeriodoContable.findByPk(id, { include: [{ model: Empresa }] });

export const listPeriodos = (filters = {}) => {
    const where = {};
    if (filters.id_empresa) where.id_empresa = filters.id_empresa;
    if (filters.tipo_periodo) where.tipo_periodo = filters.tipo_periodo;
    if (typeof filters.esta_abierto !== 'undefined') where.esta_abierto = filters.esta_abierto;
    if (filters.desde || filters.hasta) {
        const desde = filters.desde ? new Date(filters.desde) : null;
        const hasta = filters.hasta ? new Date(filters.hasta) : null;
        if (desde && hasta) where.fecha_inicio = { [Op.between]: [desde, hasta] };
    }
    return PeriodoContable.findAll({ where, order: [['fecha_inicio','DESC'], ['id_periodo','DESC']] });
};

export async function updatePeriodo(id, updates) {
    const item = await PeriodoContable.findByPk(id);
    if (!item) return null;
    if (updates.fecha_inicio && updates.fecha_fin) {
        if (new Date(updates.fecha_fin) < new Date(updates.fecha_inicio)) {
        const err = new Error('fecha_fin no puede ser menor a fecha_inicio');
        err.status = 400;
        throw err;
        }
    }
    await item.update(updates);
    return item;
}

export async function deletePeriodo(id) {
    const item = await PeriodoContable.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
}
