import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Empresa extends Model {}

Empresa.init({
    id_empresa: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    razon_comercial: { type: DataTypes.STRING(255), allowNull: true },
    razon_social: { type: DataTypes.STRING(255), allowNull: false },
    rfc: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    domicilio_fiscal: { type: DataTypes.TEXT, allowNull: false },
    telefono: { type: DataTypes.STRING(20) },
    correo_contacto: { type: DataTypes.STRING(100) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, {
    sequelize,
    tableName: 'empresa',
    timestamps: false,
});
