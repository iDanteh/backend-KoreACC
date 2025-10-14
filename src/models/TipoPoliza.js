import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class TipoPoliza extends Model {}

TipoPoliza.init({
    id_tipopoliza: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    naturaleza: { type: DataTypes.ENUM('ingreso', 'egreso', 'diario'), allowNull: false },
    descripcion: { type: DataTypes.STRING(255), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    sequelize,
    tableName: 'tipo_poliza',
    timestamps: false,
    indexes: [
        { fields: ['naturaleza'] },
    ],
    hooks: {
        beforeUpdate: (inst) => { inst.updated_at = new Date(); },
    },
});