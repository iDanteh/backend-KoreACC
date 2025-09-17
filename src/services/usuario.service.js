import { Op } from 'sequelize';
import { Usuario, Rol, UsuarioRol } from '../models/index.js';

export async function listUsuariosService({ page = 1, limit = 10, q, estatus }) {
    const where = {};
    if (typeof estatus !== 'undefined') where.estatus = estatus;
    if (q) {
        where[Op.or] = [
        { nombre: { [Op.iLike]: `%${q}%` } },
        { apellido_p: { [Op.iLike]: `%${q}%` } },
        { apellido_m: { [Op.iLike]: `%${q}%` } },
        { correo: { [Op.iLike]: `%${q}%` } },
        { usuario: { [Op.iLike]: `%${q}%` } },
        ];
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { rows, count } = await Usuario.findAndCountAll({
        where,
        include: { model: Rol, attributes: ['nombre'], through: { attributes: [] } },
        attributes: ['id_usuario','nombre','apellido_p','apellido_m','correo','telefono','usuario','estatus','fecha_creacion','fecha_modificacion'],
        order: [['id_usuario','ASC']],
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

export async function getUsuarioByIdService(id_usuario) {
    return Usuario.findByPk(id_usuario, {
        include: { model: Rol, attributes: ['nombre'], through: { attributes: [] } },
        attributes: { exclude: ['contrasena'] },
    });
}

export async function createUsuarioService(payload, rolesNombres = []) {
    // Crea usuario (hooks de Usuario harán hash)
    const user = await Usuario.create(payload);

    // Asignar roles si se envían (por nombre)
    if (rolesNombres?.length) {
        const roles = await Rol.findAll({ where: { nombre: rolesNombres } });
        for (const r of roles) {
        await UsuarioRol.findOrCreate({ where: { id_usuario: user.id_usuario, id_rol: r.id_rol } });
        }
    }

    return getUsuarioByIdService(user.id_usuario);
}

export async function updateUsuarioService(id_usuario, updates, rolesNombres) {
    const user = await Usuario.findByPk(id_usuario);
    if (!user) return null;

    await user.update(updates);

    if (Array.isArray(rolesNombres)) {
        const roles = await Rol.findAll({ where: { nombre: rolesNombres } });
        await UsuarioRol.destroy({ where: { id_usuario } });
        for (const r of roles) {
        await UsuarioRol.findOrCreate({ where: { id_usuario, id_rol: r.id_rol } });
        }
    }

    return getUsuarioByIdService(id_usuario);
}

export async function softDeleteUsuarioService(id_usuario) {
    const user = await Usuario.findByPk(id_usuario);
    if (!user) return null;

    await user.update({ estatus: false, fecha_inactivacion: new Date() });
    return getUsuarioByIdService(id_usuario);
    }

    export async function reactivateUsuarioService(id_usuario) {
    const user = await Usuario.findByPk(id_usuario);
    if (!user) return null;

    await user.update({ estatus: true, fecha_inactivacion: null });
    return getUsuarioByIdService(id_usuario);
}