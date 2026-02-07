import { sequelize } from "../../config/db.js";
import { Rol, Permiso, Usuario, RolPermiso, TipoPoliza, UsuarioRol } from "../../models/index.js";
import { env } from "../../config/env.js";

    const ROLES_BASE = [
    { nombre: 'Administrador', descripcion: 'Acceso total al sistema', activo: true },
    { nombre: 'Contador', descripcion: 'Gestión de operaciones contables', activo: true },
    { nombre: 'Auditor', descripcion: 'Acceso de solo lectura para revisión', activo: true },
    ];

    const PERMISOS_BASE = [
    { nombre: 'crear_usuario', descripcion: 'Permite crear nuevos usuarios' },
    { nombre: 'editar_usuario', descripcion: 'Permite editar información de usuarios' },
    { nombre: 'eliminar_usuario', descripcion: 'Permite eliminar usuarios' },
    { nombre: 'consultar_usuario', descripcion: 'Permite consultar usuarios' },

    { nombre: 'crear_poliza', descripcion: 'Permite crear pólizas contables' },
    { nombre: 'editar_poliza', descripcion: 'Permite editar pólizas contables' },
    { nombre: 'eliminar_poliza', descripcion: 'Permite eliminar pólizas contables' },
    { nombre: 'consultar_poliza', descripcion: 'Permite consultar pólizas contables' },

    { nombre: 'generar_reporte', descripcion: 'Permite generar reportes financieros' },
    { nombre: 'consultar_reporte', descripcion: 'Permite consultar reportes financieros' },

    { nombre: 'crear_rol', descripcion: 'Permite crear nuevos roles' },
    { nombre: 'editar_rol', descripcion: 'Permite editar roles existentes' },
    { nombre: 'eliminar_rol', descripcion: 'Permite eliminar roles' },
    { nombre: 'consultar_rol', descripcion: 'Permite consultar roles' },

    { nombre: 'crear_empresa', descripcion: 'Permite crear la información fiscal y general de la empresa, así como periodos e impuestos' },
    { nombre: 'editar_empresa', descripcion: 'Permite editar la información fiscal y general de la empresa, así como periodos e impuestos' },
    { nombre: 'eliminar_empresa', descripcion: 'Permite eliminar la información fiscal y general de la empresa, así como periodos e impuestos' },
    { nombre: 'consultar_empresa', descripcion: 'Permite consultar la información fiscal y general de la empresa, así como periodos e impuestos' },

    { nombre: 'crear_impuestos', descripcion: 'Permite crear nuevos impuestos' },
    { nombre: 'editar_impuestos', descripcion: 'Permite editar impuestos existentes' },
    { nombre: 'eliminar_impuestos', descripcion: 'Permite eliminar impuestos' },
    { nombre: 'consultar_impuestos', descripcion: 'Permite consultar impuestos' },

    { nombre: 'consultar_cat_Contable', descripcion: 'Permite consultar el catálogo contable' },
    { nombre: 'editar_cat_Contable', descripcion: 'Permite editar el catálogo contable' },
    { nombre: 'eliminar_cat_Contable', descripcion: 'Permite eliminar cuentas del catálogo contable' },
    { nombre: 'crear_cat_Contable', descripcion: 'Permite crear cuentas en el catálogo contable' },

    { nombre: 'consultar_cat_Centros', descripcion: 'Permite consultar el catálogo de centros' },
    { nombre: 'editar_cat_Centros', descripcion: 'Permite editar el catálogo de centros' },
    { nombre: 'eliminar_cat_Centros', descripcion: 'Permite eliminar centros del catálogo' },
    { nombre: 'crear_cat_Centros', descripcion: 'Permite crear centros en el catálogo' },
    ];

    const TIPOS_POLIZA_BASE = [
        { naturaleza: 'ingreso',  descripcion: 'Póliza de ingreso' },
        { naturaleza: 'egreso',   descripcion: 'Póliza de egreso' },
        { naturaleza: 'apertura', descripcion: 'Póliza de apertura' },
        { naturaleza: 'cierre',   descripcion: 'Póliza de cierre' },
    ];

export async function seedIfNeeded({ force = false } = {}) {
    const [usersCount, rolesCount] = await Promise.all([
        Usuario.count(),
        Rol.count(),
    ]);

    if (!force && usersCount > 0 && rolesCount > 0) {
        console.log('Seed omitido (ya existen usuarios y roles).');
        return { seeded: false, reason: 'already_initialized' };
    }

    return await sequelize.transaction(async (t) => {
        for (const r of ROLES_BASE) {
        await Rol.findOrCreate({
            where: { nombre: r.nombre },
            defaults: r,
            transaction: t,
        });
        }

        for (const p of PERMISOS_BASE) {
        await Permiso.findOrCreate({
            where: { nombre: p.nombre },
            defaults: p,
            transaction: t,
        });
        }

        for (const tp of TIPOS_POLIZA_BASE) {
        await TipoPoliza.findOrCreate({
            where: { naturaleza: tp.naturaleza },
            defaults: tp,
            transaction: t,
        });
        }

        const adminRole = await Rol.findOne({
        where: { nombre: 'Administrador' },
        transaction: t,
        lock: t.LOCK.UPDATE,
        });

        if (!adminRole) throw new Error('Rol Administrador no encontrado (seed)');

        const permisos = await Permiso.findAll({ transaction: t });
        for (const p of permisos) {
        await RolPermiso.findOrCreate({
            where: { id_rol: adminRole.id_rol, id_permiso: p.id_permiso },
            defaults: { id_rol: adminRole.id_rol, id_permiso: p.id_permiso },
            transaction: t,
        });
        }

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
        transaction: t,
        });

        await UsuarioRol.findOrCreate({
        where: { id_usuario: admin.id_usuario, id_rol: adminRole.id_rol },
        defaults: { id_usuario: admin.id_usuario, id_rol: adminRole.id_rol },
        transaction: t,
        });

        console.log('Seed completado (roles/permisos/tipos póliza/admin).');
        return { seeded: true };
    });
}