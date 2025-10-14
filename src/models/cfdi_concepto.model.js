import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class CfdiConcepto extends Model {}
CfdiConcepto.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.UUID, allowNull: false },
    posicion: { type: DataTypes.INTEGER, allowNull: false },
    clave_prod_serv: DataTypes.STRING,
    no_identificacion: DataTypes.STRING,
    cantidad: DataTypes.DECIMAL(18,6),
    descripcion: DataTypes.TEXT,
    valor_unitario: DataTypes.DECIMAL(18,6),
    importe: DataTypes.DECIMAL(18,6),
    objeto_imp: DataTypes.STRING
    }, {
    sequelize,
    tableName: 'cfdi_concepto',
    timestamps: false,
});