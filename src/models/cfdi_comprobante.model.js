import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class CfdiComprobante extends Model {}
CfdiComprobante.init({
    uuid: { type: DataTypes.UUID, primaryKey: true },
    version: DataTypes.STRING,
    fecha: DataTypes.DATE,
    serie: DataTypes.STRING,
    folio: DataTypes.STRING,
    moneda: DataTypes.STRING,
    subtotal: DataTypes.DECIMAL(18,6),
    total: DataTypes.DECIMAL(18,6),
    rfc_emisor: DataTypes.STRING,
    nombre_emisor: DataTypes.STRING,
    rfc_receptor: DataTypes.STRING,
    nombre_receptor: DataTypes.STRING,
    xml_doc: DataTypes.TEXT,
    esta_asociado: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
    sequelize,
    tableName: 'cfdi_comprobante',
    timestamps: false,
    hooks: {
        beforeUpdate: inst => { inst.updated_at = new Date(); }
    }
});