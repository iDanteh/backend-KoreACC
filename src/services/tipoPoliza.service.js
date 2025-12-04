import { Op } from 'sequelize';
import * as Models from '../models/index.js';

const { TipoPoliza, Poliza, sequelize } = Models;

function httpError(message, status = 400) {
    return Object.assign(new Error(message), { status });
}

export async function createTipoPoliza(data) {
    if (!['ingreso', 'egreso', 'diario'].includes(data?.naturaleza)) {
        throw httpError('naturaleza inválida (ingreso|egreso|diario)');
    }
    if (!data?.descripcion) throw httpError('descripcion requerida');
    return TipoPoliza.create(data);
}

export async function getNaturalezas() {
    const filas = await TipoPoliza.findAll({
        attributes: ['naturaleza'],
        group: ['naturaleza'],
        raw: true,
        order: [['naturaleza', 'ASC']],
    });

    return filas.map(f => f.naturaleza);
}

export async function getTipoPoliza(id_tipopoliza) {
    const tp = await TipoPoliza.findByPk(id_tipopoliza);
    if (!tp) throw httpError('TipoPoliza no encontrado', 404);
    return tp;
    }

    export async function listTipoPolizas({
    page = 1,
    pageSize = 20,
    naturaleza,
    q,
    order = [['id_tipopoliza', 'ASC']],
    } = {}) {
    const where = {};
    if (naturaleza) where.naturaleza = naturaleza;
    if (q) where.descripcion = { [Op.iLike]: `%${q}%` };

    const limit = Math.min(+pageSize || 20, 200);
    const offset = Math.max(+page - 1, 0) * limit;

    const { rows, count } = await TipoPoliza.findAndCountAll({ where, order, limit, offset });
    return { data: rows, total: count, page: +page, pageSize: limit };
}

export async function updateTipoPoliza(id_tipopoliza, payload) {
    const tp = await getTipoPoliza(id_tipopoliza);
    if (payload?.naturaleza && !['ingreso', 'egreso', 'diario'].includes(payload.naturaleza)) {
        throw httpError('naturaleza inválida (ingreso|egreso|diario)');
    }
    await tp.update({ ...payload, updated_at: new Date() });
    return tp;
}

export async function deleteTipoPoliza(id_tipopoliza) {
    const inUse = await Poliza.count({ where: { id_tipopoliza } });
    if (inUse > 0) throw httpError('No se puede eliminar: hay pólizas que usan este tipo', 409);

    const deleted = await TipoPoliza.destroy({ where: { id_tipopoliza } });
    if (!deleted) throw httpError('TipoPoliza no encontrado', 404);
    return { ok: true };
}