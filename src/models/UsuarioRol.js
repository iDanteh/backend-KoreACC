import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class UsuarioRol extends Model {}

UsuarioRol.init({
    id_usuario: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    id_rol: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    fecha_asign: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
}, { sequelize, tableName: 'usuario_has_rol' });
