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
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});
Usuario.belongsTo(Usuario, { 
    as: 'Modificador', 
    foreignKey: { name: 'modificado_por', allowNull: true },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});
Rol.belongsToMany(Usuario, {
    through: UsuarioRol,
    foreignKey: 'id_rol',
    otherKey: 'id_usuario',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// Rol <-> Permiso (N:M)
Rol.belongsToMany(Permiso, {
    through: RolPermiso,
    foreignKey: 'id_rol',
    otherKey: 'id_permiso',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});
Permiso.belongsToMany(Rol, {
    through: RolPermiso,
    foreignKey: 'id_permiso',
    otherKey: 'id_rol',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});

// Empresa <-> PeriodoContable (1:N)
Empresa.hasMany(PeriodoContable, { 
    foreignKey: { name: 'id_empresa', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});
PeriodoContable.belongsTo(Empresa, { 
    foreignKey: { name: 'id_empresa', allowNull: false }, 
});

// Empresa <-> Impuesto (1:N)
Empresa.hasMany(Impuesto, { 
    foreignKey: { name: 'id_empresa', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});
Impuesto.belongsTo(Empresa, { 
    foreignKey: {name: 'id_empresa', allowNull: false },
});

// Empresa <-> Ejercicio (1:N)
Empresa.hasMany(EjercicioContable, { 
    foreignKey: { name: 'id_empresa', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE', 
});
EjercicioContable.belongsTo(Empresa, { 
    foreignKey: { name: 'id_empresa', allowNull: false }, 
});

// PeriodoContable <-> Ejercicio (1:N)
EjercicioContable.hasMany(PeriodoContable, { 
    foreignKey: {name: 'id_ejercicio', allowNull: false },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE', 
});
PeriodoContable.belongsTo(EjercicioContable, { 
    foreignKey: {name: 'id_ejercicio', allowNull: false }, 
});

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
TipoPoliza.hasMany(Poliza, { 
    foreignKey: {name: 'id_tipopoliza', allowNull: false }, 
    as: 'polizas',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});
Poliza.belongsTo(TipoPoliza, { 
    foreignKey: {name: 'id_tipopoliza', allowNull: false }, 
    as: 'tipo' 
});

// PeriodoContable <-> Poliza (1:N)
PeriodoContable.hasMany(Poliza, { 
    foreignKey: {name: 'id_periodo', allowNull: false }, 
    as: 'polizas',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});
Poliza.belongsTo(PeriodoContable, { 
    foreignKey: {name: 'id_periodo', allowNull: false }, 
    as: 'periodo' 
});

// Usuario <-> Poliza (1:N)
Usuario.hasMany(Poliza, { 
    foreignKey: {name: 'id_usuario', allowNull: false }, 
    as: 'polizasCreadas',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});
Poliza.belongsTo(Usuario, { 
    foreignKey: {name: 'id_usuario', allowNull: false }, 
    as: 'creador' 
});

// CentroCosto <-> Poliza (1:N)
CentroCosto.hasMany(Poliza, { 
    foreignKey: {name: 'id_centro', field: 'id_centro', allowNull: false }, 
    as: 'polizas',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});
Poliza.belongsTo(CentroCosto, { 
    foreignKey: {name: 'id_centro', field: 'id_centro', allowNull: false }, 
    as: 'centro',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});

// Poliza <-> MovimientoPoliza (1:N)
Poliza.hasMany(MovimientoPoliza, {
    foreignKey: {name: 'id_poliza', allowNull: false },
    as: 'movimientos',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});
MovimientoPoliza.belongsTo(Poliza, { 
    foreignKey: {name: 'id_poliza', allowNull: false }, 
    as: 'poliza' 
});

// Cuenta <-> MovimientoPoliza (1:N)
Cuenta.hasMany(MovimientoPoliza, { 
    foreignKey: {name: 'id_cuenta', allowNull: false }, 
    as: 'movimientos',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
});
MovimientoPoliza.belongsTo(Cuenta, { 
    foreignKey: {name: 'id_cuenta', allowNull: false }, 
    as: 'cuenta' 
});

// CFDI
CfdiComprobante.hasOne(MovimientoPoliza, {
    foreignKey: { name: 'uuid', allowNull: true },
    sourceKey: 'uuid',
    as: 'movimiento',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
});
MovimientoPoliza.belongsTo(CfdiComprobante, {
    foreignKey: { name: 'uuid', allowNull: true },
    targetKey: 'uuid',
    as: 'cfdi',
});

CfdiComprobante.hasMany(CfdiConcepto, {
    foreignKey: { name: 'uuid', allowNull: false },
    sourceKey: 'uuid',
    as: 'conceptos',
    onDelete: 'CASCADE', 
    onUpdate: 'CASCADE',
});
CfdiConcepto.belongsTo(CfdiComprobante, {
    foreignKey: { name: 'uuid', allowNull: false },
    targetKey: 'uuid',
    as: 'comprobante',
});

CfdiConcepto.hasMany(CfdiTraslado, {
    foreignKey: { name: 'id_concepto', allowNull: false },
    as: 'traslados',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
});
CfdiTraslado.belongsTo(CfdiConcepto, {
    foreignKey: { name: 'id_concepto', allowNull: false },
    as: 'concepto',
});
export { sequelize, Usuario, Rol, Permiso, UsuarioRol, 
    RolPermiso, Empresa, PeriodoContable, 
    Impuesto, EjercicioContable, CentroCosto, 
    Cuenta, TipoPoliza, Poliza, MovimientoPoliza, CfdiComprobante,
    CfdiConcepto, CfdiTraslado };