import { DataTypes, DATE, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Poliza extends Model {}

Poliza.init({
    id_poliza: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_tipopoliza: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tipo_poliza', key: 'id_tipopoliza'} },
    id_periodo: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'periodo_contable', key: 'id_periodo' } },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuario', key: 'id_usuario' } },
    id_centro: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'centro_costo', key: 'id_centro' } },
    folio: { type: DataTypes.STRING, allowNull: false },
    concepto: { type: DataTypes.STRING, allowNull: false, },
    estado: { type: DataTypes.ENUM('Por revisar', 'Revisada', 'Contabilizada'), allowNull: false, defaultValue: 'Por revisar' },
    fecha_creacion: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
    sequelize,
    tableName: 'poliza',
    timestamps: false,
    indexes: [
        { fields: ['id_tipopoliza'] },
        { fields: ['id_periodo'] },
        { fields: ['id_usuario'] },
        { fields: ['id_centro'] },
        { fields: ['estado'] },
    ],
    hooks: { beforeCreate: (inst) => { inst.updated_at = new Date(); },},
});