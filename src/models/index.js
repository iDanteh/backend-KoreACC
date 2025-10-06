import { Usuario } from './Usuario.js';
import { Rol } from './Rol.js';
import { Permiso } from './Permiso.js';
import { UsuarioRol } from './UsuarioRol.js';
import { RolPermiso } from './RolPermiso.js';
import { Empresa } from './Empresa.js';
import { PeriodoContable } from './PeriodoContable.js';
import { Impuesto } from './Impuesto.js';
import { EjercicioContable } from './Ejercicio.js'
import Cuenta from './Cuenta.js';
import { CentroCosto } from './CentroCosto.js';

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

// Empresa <-> Ejercicio (1:N)
Empresa.hasMany(EjercicioContable, { foreignKey: 'id_empresa' });
EjercicioContable.belongsTo(Empresa, { foreignKey: 'id_empresa' });

// PeriodoContable <-> Ejercicio (1:N)
EjercicioContable.hasMany(PeriodoContable, { foreignKey: 'id_ejercicio' });
PeriodoContable.belongsTo(EjercicioContable, { foreignKey: 'id_ejercicio' });


export { Usuario, Rol, Permiso, UsuarioRol, RolPermiso, Empresa, PeriodoContable, Impuesto, EjercicioContable, CentroCosto, Cuenta };