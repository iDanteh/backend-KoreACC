import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class PeriodoContable extends Model {}

PeriodoContable.init({
    id_periodo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa: { type: DataTypes.INTEGER, allowNull: false },
    id_ejercicio: { type: DataTypes.INTEGER, allowNull: false},
    tipo_periodo: {
        type: DataTypes.ENUM('SEMANAL','QUINCENAL','MENSUAL','ANUAL','PERSONALIZADO'),
        allowNull: false,
    },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
    periodo_daterange: { type: DataTypes.RANGE(DataTypes.DATEONLY), allowNull: true },
    esta_abierto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, {
    sequelize,
    tableName: 'periodo_contable',
    timestamps: false,
});