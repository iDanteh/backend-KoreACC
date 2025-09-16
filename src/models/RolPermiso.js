import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class RolPermiso extends Model {}

RolPermiso.init({
    id_rol: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    id_permiso: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
}, { sequelize, tableName: 'rol_has_permiso' });
