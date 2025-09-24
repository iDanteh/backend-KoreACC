import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';

export class Impuesto extends Model {}

function toDateOnlyString(d) {
    if (d === null || d === undefined) return null;
    const date = (d instanceof Date) ? d : new Date(d);
    return isNaN(date) ? null : date.toISOString().slice(0, 10);
}

function setVigenciaRange(instance) {
    const iniStr = toDateOnlyString(instance.vigencia_inicio);
    const finStr = toDateOnlyString(instance.vigencia_fin); 

    if (!iniStr) return; 

    if (finStr && new Date(finStr) < new Date(iniStr)) {
        const e = new Error('vigencia_fin no puede ser menor a vigencia_inicio');
        e.status = 400;
        throw e;
    }

    let upper = null;
    let upperInclusive = false;

    if (finStr) {
        const finMasUno = new Date(finStr);
        finMasUno.setDate(finMasUno.getDate() + 1);
        upper = finMasUno.toISOString().slice(0, 10);
        upperInclusive = true; 
    }

    const range = [iniStr, upper];
    range.inclusive = [true, upperInclusive]; 
    instance.vigencia_daterange = range;
}

Impuesto.init({
    id_impuesto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_empresa: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(50), allowNull: false },
    tipo: { type: DataTypes.ENUM('IVA','ISR','IEPS','RETENCION','OTRO'), allowNull: false },
    modo: { type: DataTypes.ENUM('TASA','CUOTA','EXENTO'), allowNull: false },
    tasa: { type: DataTypes.DECIMAL(9,6) },
    cuota: { type: DataTypes.DECIMAL(14,6) },
    aplica_en: { type: DataTypes.ENUM('VENTA','COMPRA','AMBOS'), allowNull: false },
    es_estandar: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    vigencia_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    vigencia_fin: { type: DataTypes.DATEONLY, allowNull: true },
    vigencia_daterange: { type: DataTypes.RANGE(DataTypes.DATEONLY), allowNull: false },
    cuenta_relacionada: { type: DataTypes.STRING(255), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    }, {
    sequelize,
    tableName: 'impuesto',
    timestamps: false,
    hooks: {
        beforeValidate: (inst) => setVigenciaRange(inst),
        beforeUpdate: (inst) => {
        if (inst.changed('vigencia_inicio') || inst.changed('vigencia_fin')) {
            setVigenciaRange(inst);
        }
        },
    },
});