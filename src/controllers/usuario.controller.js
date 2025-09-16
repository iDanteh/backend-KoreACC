import { Usuario, Rol } from '../models/index.js';

export async function me(req, res) {
    return res.json({ user: req.user });
}

export async function listUsuarios(req, res) {
    const data = await Usuario.findAll({
        attributes: ['id_usuario', 'nombre', 'apellido_p', 'apellido_m', 'correo', 'usuario', 'estatus'],
        include: { model: Rol, attributes: ['nombre'], through: { attributes: [] } },
        order: [['id_usuario', 'ASC']],
    });
    res.json(data);
}
