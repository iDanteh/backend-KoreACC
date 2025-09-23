import { validationResult } from 'express-validator';
import { listUsuariosService, getUsuarioByIdService, createUsuarioService,
    updateUsuarioService, softDeleteUsuarioService, reactivateUsuarioService } from '../services/usuario.service.js';
import { generateSecurePassword } from '../utils/password.js';
import { sendMail } from '../config/mailer.js';
import { Usuario } from '../models/Usuario.js';
import { Rol } from '../models/Rol.js';
import { Permiso } from '../models/Permiso.js';

export async function me(req, res) {
    try {
        const userFromDb = await Usuario.findByPk(req.user.sub, {
        attributes: ['id_usuario', 'nombre', 'apellido_p', 'apellido_m', 'correo', 'debe_cambiar_contrasena']
        });

        return res.json({
        id: userFromDb.id,
        nombre: userFromDb.nombre,
        apellidos: `${userFromDb.apellido_p} ${userFromDb.apellido_m}`,
        correo: userFromDb.correo,
        roles: req.user.roles,
        debe_cambiar_contrasena: userFromDb.debe_cambiar_contrasena,
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error obteniendo usuario' });
    }
}
export async function updateMe(req, res) {
    try {
        const updates = {
        nombre: req.body.nombre,
        apellido_p: req.body.apellido_p,
        apellido_m: req.body.apellido_m,
        correo: req.body.correo,
        telefono: req.body.telefono,
        };

        Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

        const updated = await updateUsuarioService(req.user.sub, updates);
        if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });

        res.json(updated);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error actualizando perfil' });
    }
}
export const getMyPermisos = async (req, res) => {
  try {
    const usuarioId = req.user.sub;

    const usuario = await Usuario.findByPk(usuarioId, {
      include: [
        {
          model: Rol,
          as: 'roles',
          attributes: ['id_rol', 'nombre'], // solo lo necesario
          include: [
            {
              model: Permiso,
              as: 'permisos',
              attributes: ['id_permiso', 'nombre'], // solo nombre e id
              through: { attributes: [] }, // evita traer datos de tabla intermedia
            },
          ],
        },
      ],
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // 🔥 Junta todos los permisos de todos los roles, sin duplicados
    const permisos = [
      ...new Set(
        usuario.roles.flatMap((rol) =>
          rol.permisos.map((p) => p.nombre)
        )
      ),
    ];

    return res.json({ permisos });
  } catch (error) {
    console.error('❌ Error en getMyPermisos:', error);
    return res.status(500).json({ message: 'Error al obtener permisos' });
  }
};
export const getAllPermisos = async (req, res) => {
  try {
    const permisos = await Permiso.findAll({
      attributes: ['id_permiso', 'nombre'], 
      order: [['nombre', 'ASC']], 
    });

    return res.json({ permisos });
  } catch (error) {
    console.error('❌ Error en getAllPermisos:', error);
    return res.status(500).json({ message: 'Error al obtener todos los permisos' });
  }
};


export async function listUsuarios(req, res, next) {
    try {
        const { page = 1, limit = 10, q, estatus } = req.query;
        const parsedStatus = typeof estatus === 'undefined' ? undefined : estatus === 'true';
        const result = await listUsuariosService({ page, limit, q, estatus: parsedStatus });
        res.json(result);
    } catch (e) { next(e); }
}

export async function getUsuarioById(req, res, next) {
    try {
        const user = await getUsuarioByIdService(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json(user);
    } catch (e) { next(e); }
}

export async function createUsuario(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        // Generar contraseña segura y colocarla en payload
        const tempPassword = generateSecurePassword(12);

        const payload = {
        nombre: req.body.nombre,
        apellido_p: req.body.apellido_p,
        apellido_m: req.body.apellido_m ?? null,
        correo: req.body.correo,
        telefono: req.body.telefono ?? null,
        usuario: req.body.usuario,
        contrasena: tempPassword,
        estatus: req.body.estatus ?? true,
        debe_cambiar_contrasena: true,
        };

        const roles = Array.isArray(req.body.roles) ? req.body.roles : [];

        const created = await createUsuarioService(payload, roles);

        // 📧 Enviar correo con credenciales
        await sendMail({
        to: created.correo,
        subject: 'Tus credenciales de acceso a Koreacc',
        text: ` Hola ${created.nombre}, Se ha creado tu cuenta en el sistema Koreacc.
        Usuario: ${created.usuario}
        Contraseña: ${tempPassword}
        Por favor inicia sesión y cambia tu contraseña lo antes posible.`,
        html: `
            <p>Hola <strong>${created.nombre}</strong>,</p>
            <p>Se ha creado tu cuenta en el sistema <b>Koreacc</b>.</p>
            <ul>
            <li><b>Usuario:</b> ${created.usuario}</li>
            <li><b>Contraseña:</b> ${tempPassword}</li>
            </ul>
            <p>Por favor inicia sesión y cambia tu contraseña lo antes posible.</p>
        `,
        });

        res.status(201).json({
        message: 'Usuario creado y credenciales enviadas por correo',
        usuario: created,
        });
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Correo o usuario ya existe' });
        }
        next(e);
    }
}

export async function updateUsuario(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        // Se especifican los campos permitidos para actualizar
        const updates = {
        nombre: req.body.nombre,
        apellido_p: req.body.apellido_p,
        apellido_m: req.body.apellido_m,
        correo: req.body.correo,
        telefono: req.body.telefono,
        usuario: req.body.usuario,
        estatus: req.body.estatus,
        };

        Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

        const roles = Array.isArray(req.body.roles) ? req.body.roles : undefined;

        const actorMeta = {
            actorId: req.user?.sub ?? null,
        };

        const updated = await updateUsuarioService(req.params.id, updates, roles, actorMeta);

        if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Usuario actualizado', usuario: updated });
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Correo o usuario ya existe', detail: e.errors?.map(x => x.message) });
        }
        next(e);
    }
}

export async function deleteUsuario(req, res, next) {
    try {
        const deleted = await softDeleteUsuarioService(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Usuario desactivado', usuario: deleted });
    } catch (e) { next(e); }
}

export async function reactivateUsuario(req, res, next) {
    try {
        const reactivated = await reactivateUsuarioService(req.params.id);
        if (!reactivated) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Usuario reactivado', usuario: reactivated });
    } catch (e) { next(e); }
}

export async function replaceRoles(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const roles = req.body.roles ?? [];
        const updated = await updateUsuarioService(req.params.id, {}, roles);
        if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Roles actualizados', usuario: updated });
    } catch (e) { next(e); }
}

