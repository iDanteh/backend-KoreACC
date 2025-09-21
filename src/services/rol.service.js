import { Op } from 'sequelize';
import { Rol, Permiso, RolPermiso } from '../models/index.js';

export async function listRolesService({ q, activo, page = 1, limit = 10 }) {
    const where = {};
    if (typeof activo !== 'undefined') where.activo = activo;
    if (q) where.nombre = { [Op.iLike]: `%${q}%` };

    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await Rol.findAndCountAll({
        where,
        include: { model: Permiso, attributes: ['id_permiso', 'nombre'], through: { attributes: [] } },
        order: [['id_rol', 'ASC']],
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

export async function getRolByIdService(id_rol) {
    return Rol.findByPk(id_rol, {
        include: { model: Permiso, attributes: ['id_permiso', 'nombre'], through: { attributes: [] } },
    });
}

export async function createRolService(payload) {
    const rol = await Rol.create({
        nombre: payload.nombre,
        descripcion: payload.descripcion ?? null,
        activo: payload.activo ?? true,
    });
    return getRolByIdService(rol.id_rol);
}

export async function updateRolService(id_rol, updates) {
    const rol = await Rol.findByPk(id_rol);
    if (!rol) return null;
    await rol.update({
        nombre: updates.nombre ?? rol.nombre,
        descripcion: updates.descripcion ?? rol.descripcion,
        activo: typeof updates.activo === 'boolean' ? updates.activo : rol.activo,
    });
    return getRolByIdService(id_rol);
}

export async function softDeleteRolService(id_rol) {
    const rol = await Rol.findByPk(id_rol);
    if (!rol) return null;
    await rol.update({ activo: false });
    return getRolByIdService(id_rol);
}

export async function replacePermisosOnRolService(id_rol, permisosNombres = []) {
    const rol = await Rol.findByPk(id_rol);
    if (!rol) return null;

    // limpia vínculos
    await RolPermiso.destroy({ where: { id_rol } });

    if (permisosNombres.length) {
        const permisos = await Permiso.findAll({ where: { nombre: permisosNombres } });
        for (const p of permisos) {
        await RolPermiso.findOrCreate({ where: { id_rol, id_permiso: p.id_permiso } });
        }
    }
    return getRolByIdService(id_rol);
}