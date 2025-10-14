import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class CfdiTraslado extends Model {}
CfdiTraslado.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_concepto: { type: DataTypes.BIGINT, allowNull: false },
    base: DataTypes.DECIMAL(18,6),
    impuesto: DataTypes.STRING,
    tipo_factor: DataTypes.STRING,
    tasa_o_cuota: DataTypes.DECIMAL(18,6),
    importe: DataTypes.DECIMAL(18,6)
    }, {
    sequelize,
    tableName: 'cfdi_traslado',
    timestamps: false,
});