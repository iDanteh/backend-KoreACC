import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Permiso extends Model {}

Permiso.init({
    id_permiso: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    descripcion: { type: DataTypes.STRING(150) },
}, { sequelize, tableName: 'permiso' });
