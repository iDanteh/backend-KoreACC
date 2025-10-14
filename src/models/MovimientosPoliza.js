import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class MovimientoPoliza extends Model {}

MovimientoPoliza.init({
    id_movimiento: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_poliza: {type: DataTypes.INTEGER,allowNull: false,references: { model: 'poliza', key: 'id_poliza' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    id_cuenta: {type: DataTypes.INTEGER,allowNull: false,references: { model: 'cuentas', key: 'id' },
        onUpdate: 'CASCADE',
    },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    ref_serie_venta: { type: DataTypes.STRING(100), allowNull: true },
    operacion: {type: DataTypes.ENUM('0', '1'),allowNull: false, },
    monto: { type: DataTypes.DECIMAL(14, 4), allowNull: false },
    cliente: { type: DataTypes.STRING(255), allowNull: true },
    cc: { type: DataTypes.INTEGER, allowNull: false },
    uuid: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
        sequelize,
        tableName: 'movimiento_poliza',
        timestamps: false,
        indexes: [
        { fields: ['id_poliza'] },
        { fields: ['id_cuenta'] },
        { fields: ['operacion'] },
        { fields: ['fecha'] },
        { fields: ['cc'] },
        ],
        hooks: {
        beforeUpdate: (inst) => { inst.updated_at = new Date(); },
        },
    }
);