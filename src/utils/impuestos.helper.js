// src/services/impuestos.helper.js
import { Op, fn, col, literal } from 'sequelize';
import { Impuesto } from '../models/index.js';

export async function getImpuestosVigentes({ id_empresa, aplicaEn, fecha }) {
    const rows = await Impuesto.findAll({
        where: {
        id_empresa,
        [Op.or]: [{ aplica_en: aplicaEn }, { aplica_en: 'AMBOS' }],
        [Op.and]: [literal(`vigencia_daterange @> '${fecha}'::date`)],
        },
    });

    return Array.isArray(rows) ? rows : [];
}
