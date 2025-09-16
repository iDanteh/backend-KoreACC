import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Rol extends Model {}

Rol.init({
    id_rol: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    descripcion: { type: DataTypes.STRING(150) },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { sequelize, tableName: 'rol' });
