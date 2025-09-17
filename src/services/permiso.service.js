import { Op } from 'sequelize';
import { Permiso } from '../models/index.js';

export async function listPermisosService({ q, page = 1, limit = 20 }) {
    const where = {};
    if (q) where.nombre = { [Op.iLike]: `%${q}%` };

    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await Permiso.findAndCountAll({
        where,
        order: [['id_permiso', 'ASC']],
        limit: Number(limit),
        offset,
    });

    return {
        data: rows,
        pagination: {
        total: count,
        page: Number(page),
        pages: Math.ceil(count / Number(limit)) || 1,
        limit: Number(limit),
        }
    };
}

export async function getPermisoByIdService(id_permiso) {
    return Permiso.findByPk(id_permiso);
}

export async function createPermisoService(payload) {
    const p = await Permiso.create({
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? null,
    });
    return getPermisoByIdService(p.id_permiso);
}

export async function updatePermisoService(id_permiso, updates) {
    const permiso = await Permiso.findByPk(id_permiso);
    if (!permiso) return null;
    await permiso.update({
        nombre: updates.nombre ?? permiso.nombre,
        descripcion: updates.descripcion ?? permiso.descripcion,
    });
    return getPermisoByIdService(id_permiso);
}

export async function deletePermisoService(id_permiso) {
    const permiso = await Permiso.findByPk(id_permiso);
    if (!permiso) return null;
    await permiso.destroy(); // cascada en rol_has_permiso por FK
    return true;
}