import { Usuario } from './Usuario.js';
import { Rol } from './Rol.js';
import { Permiso } from './Permiso.js';
import { UsuarioRol } from './UsuarioRol.js';
import { RolPermiso } from './RolPermiso.js';
import { Empresa } from './Empresa.js';
import { PeriodoContable } from './PeriodoContable.js';
import { Impuesto } from './Impuesto.js';

// Usuario <-> Rol (N:M)
Usuario.belongsToMany(Rol, {
    through: UsuarioRol,
    foreignKey: 'id_usuario',
    otherKey: 'id_rol',
});
Usuario.belongsTo(Usuario, { as: 'Modificador', foreignKey: 'modificado_por' });
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

// Empresa <-> PeriodoContable (1:N)
Empresa.hasMany(PeriodoContable, { foreignKey: 'id_empresa' });
PeriodoContable.belongsTo(Empresa, { foreignKey: 'id_empresa' });

// Empresa <-> Impuesto (1:N)
Empresa.hasMany(Impuesto, { foreignKey: 'id_empresa' });
Impuesto.belongsTo(Empresa, { foreignKey: 'id_empresa' });

export { Usuario, Rol, Permiso, UsuarioRol, RolPermiso, Empresa, PeriodoContable, Impuesto };