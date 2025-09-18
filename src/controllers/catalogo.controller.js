import { Rol, Permiso } from '../models/index.js';

export async function getRolesYPermisos(req, res, next) {
    try {
        const [roles, permisos] = await Promise.all([
        Rol.findAll({
            where: { activo: true },
            attributes: ['id_rol', 'nombre', 'descripcion', 'activo'],
            order: [['nombre', 'ASC']],
        }),
        Permiso.findAll({
            attributes: ['id_permiso', 'nombre', 'descripcion'],
            order: [['nombre', 'ASC']],
        }),
        ]);

        // Cache ligero (60s)
        res.set('Cache-Control', 'private, max-age=60');

        res.json({ roles, permisos });
    } catch (e) {
        next(e);
    }
}