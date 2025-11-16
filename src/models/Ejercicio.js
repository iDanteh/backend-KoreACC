import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class EjercicioContable extends Model {}

EjercicioContable.init({
    id_ejercicio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa: { type: DataTypes.INTEGER, allowNull: false },
    anio: { type: DataTypes.INTEGER, allowNull: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
    esta_abierto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_selected: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    sequelize,
    tableName: 'ejercicio_contable',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['id_empresa'], where: { is_selected: true } }
    ]
});
