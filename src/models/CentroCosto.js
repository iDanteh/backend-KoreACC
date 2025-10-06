import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

export class CentroCosto extends Model {}

CentroCosto.init({
    id_centro: { type: DataTypes.INTEGER, primaryKey: true },
    serie_venta: { type: DataTypes.STRING(15), allowNull: false },
    nombre_centro: { type: DataTypes.STRING(255), allowNull: false },
    calle: { type: DataTypes.STRING(100), allowNull: false },
    num_ext: { type: DataTypes.INTEGER, allowNull: false },
    num_int: { type: DataTypes.INTEGER, allowNull: true },
    cp: { type: DataTypes.INTEGER, allowNull: false },
    region: {  type: DataTypes.STRING(100), allowNull: false },
    telefono: { type: DataTypes.STRING(10), allowNull: true },
    correo: { type: DataTypes.STRING(255), allowNull: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    sequelize,
    tableName: 'centro_costo',
    timestamps: false,
});