import { sequelize } from '../config/db.js';
import { Rol, Permiso, Usuario, UsuarioRol, RolPermiso } from '../models/index.js';
import { env } from '../config/env.js';

const ROLES_BASE = [
    { nombre: 'Administrador', descripcion: 'Acceso total al sistema', activo: true },
    { nombre: 'Contador', descripcion: 'Gestión de operaciones contables', activo: true },
    { nombre: 'Auditor', descripcion: 'Acceso de solo lectura para revisión', activo: true },
];

const PERMISOS_BASE = [
  // Usuarios
    { nombre: 'crear_usuario', descripcion: 'Permite crear nuevos usuarios' },
    { nombre: 'editar_usuario', descripcion: 'Permite editar información de usuarios' },
    { nombre: 'eliminar_usuario', descripcion: 'Permite eliminar usuarios' },
    { nombre: 'consultar_usuario', descripcion: 'Permite consultar usuarios' },

    // Pólizas
    { nombre: 'crear_poliza', descripcion: 'Permite crear pólizas contables' },
    { nombre: 'editar_poliza', descripcion: 'Permite editar pólizas contables' },
    { nombre: 'eliminar_poliza', descripcion: 'Permite eliminar pólizas contables' },
    { nombre: 'consultar_poliza', descripcion: 'Permite consultar pólizas contables' },

    // Reportes
    { nombre: 'generar_reporte', descripcion: 'Permite generar reportes financieros' },
    { nombre: 'consultar_reporte', descripcion: 'Permite consultar reportes financieros' },
];

async function run() {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    // Roles
    for (const r of ROLES_BASE) {
        await Rol.findOrCreate({ where: { nombre: r.nombre }, defaults: r });
    }

    // Permisos
    for (const p of PERMISOS_BASE) {
        await Permiso.findOrCreate({ where: { nombre: p.nombre }, defaults: p });
    }

    // Asignar todos los permisos al rol Administrador
    const adminRole = await Rol.findOne({ where: { nombre: 'Administrador' } });
    const permisos = await Permiso.findAll();
    for (const p of permisos) {
        await RolPermiso.findOrCreate({ where: { id_rol: adminRole.id_rol, id_permiso: p.id_permiso } });
    }

    // Crear usuario admin
    const [admin] = await Usuario.findOrCreate({
        where: { usuario: env.seedAdmin.usuario },
        defaults: {
        nombre: env.seedAdmin.nombre,
        apellido_p: env.seedAdmin.apellidoP,
        apellido_m: env.seedAdmin.apellidoM,
        correo: env.seedAdmin.correo,
        telefono: env.seedAdmin.telefono,
        usuario: env.seedAdmin.usuario,
        contrasena: env.seedAdmin.contrasena,
        estatus: true,
        },
    });

    // Asociar rol Administrador al admin
    await UsuarioRol.findOrCreate({ where: { id_usuario: admin.id_usuario, id_rol: adminRole.id_rol } });

    console.log('Seed completado ✅');
    process.exit(0);
}

run().catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
});