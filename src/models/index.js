import { sequelize } from '../config/db.js';
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
import { TipoPoliza } from './TipoPoliza.js';
import { Poliza } from './Poliza.js';
import { MovimientoPoliza } from './MovimientosPoliza.js';
import { CfdiComprobante } from './cfdi_comprobante.model.js';
import { CfdiConcepto } from './cfdi_concepto.model.js';
import { CfdiTraslado } from './cfdi_traslado.model.js';

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

// Cuenta <-> Impuesto (1:N) usando id_cuenta como FK
Cuenta.hasMany(Impuesto, {
        as: 'impuestos',
        foreignKey: { name: 'id_cuenta', allowNull: true },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    });
Impuesto.belongsTo(Cuenta, {
        as: 'cuenta',
        foreignKey: { name: 'id_cuenta', allowNull: true },
    });

// TipoPoliza <-> Poliza (1:N)
TipoPoliza.hasMany(Poliza, { foreignKey: 'id_tipopoliza', as: 'polizas' });
Poliza.belongsTo(TipoPoliza, { foreignKey: 'id_tipopoliza', as: 'tipo' });

// PeriodoContable <-> Poliza (1:N)
PeriodoContable.hasMany(Poliza, { foreignKey: 'id_periodo', as: 'polizas' });
Poliza.belongsTo(PeriodoContable, { foreignKey: 'id_periodo', as: 'periodo' });

// Usuario <-> Poliza (1:N)
Usuario.hasMany(Poliza, { foreignKey: 'id_usuario', as: 'polizasCreadas' });
Poliza.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'creador' });

// CentroCosto <-> Poliza (1:N)
CentroCosto.hasMany(Poliza, { foreignKey: 'id_centro', as: 'polizas' });
Poliza.belongsTo(CentroCosto, { foreignKey: 'id_centro', as: 'centro' });

// Poliza <-> MovimientoPoliza (1:N)
Poliza.hasMany(MovimientoPoliza, {
    foreignKey: 'id_poliza',
    as: 'movimientos',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});
MovimientoPoliza.belongsTo(Poliza, { foreignKey: 'id_poliza', as: 'poliza' });

// Cuenta <-> MovimientoPoliza (1:N)
Cuenta.hasMany(MovimientoPoliza, { foreignKey: 'id_cuenta', as: 'movimientos' });
MovimientoPoliza.belongsTo(Cuenta, { foreignKey: 'id_cuenta', as: 'cuenta' });

CfdiComprobante.hasOne(MovimientoPoliza, { foreignKey: 'uuid', sourceKey: 'uuid', as: 'movimiento' });
MovimientoPoliza.belongsTo(CfdiComprobante, { foreignKey: 'uuid', targetKey: 'uuid', as: 'cfdi' });

// Información del XML
CfdiComprobante.hasMany(CfdiConcepto, { foreignKey: 'uuid', sourceKey: 'uuid', as: 'conceptos' });
CfdiConcepto.belongsTo(CfdiComprobante, { foreignKey: 'uuid', targetKey: 'uuid', as: 'comprobante' });

CfdiConcepto.hasMany(CfdiTraslado, { foreignKey: 'id_concepto', as: 'traslados' });
CfdiTraslado.belongsTo(CfdiConcepto, { foreignKey: 'id_concepto', as: 'concepto' });

export { sequelize, Usuario, Rol, Permiso, UsuarioRol, 
    RolPermiso, Empresa, PeriodoContable, 
    Impuesto, EjercicioContable, CentroCosto, 
    Cuenta, TipoPoliza, Poliza, MovimientoPoliza, CfdiComprobante,
    CfdiConcepto, CfdiTraslado };