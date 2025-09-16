import { Usuario } from './Usuario.js';
import { Rol } from './Rol.js';
import { Permiso } from './Permiso.js';
import { UsuarioRol } from './UsuarioRol.js';
import { RolPermiso } from './RolPermiso.js';

// Usuario <-> Rol (N:M)
Usuario.belongsToMany(Rol, {
    through: UsuarioRol,
    foreignKey: 'id_usuario',
    otherKey: 'id_rol',
});
Rol.belongsToMany(Usuario, {
    through: UsuarioRol,
    foreignKey: 'id_rol',
    otherKey: 'id_usuario',
});

// Rol <-> Permiso (N:M)
Rol.belongsToMany(Permiso, {
    through: RolPermiso,
    foreignKey: 'id_rol',
    otherKey: 'id_permiso',
});
Permiso.belongsToMany(Rol, {
    through: RolPermiso,
    foreignKey: 'id_permiso',
    otherKey: 'id_rol',
});

export { Usuario, Rol, Permiso, UsuarioRol, RolPermiso };