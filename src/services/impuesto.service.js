import { Impuesto, Empresa } from '../models/index.js';

export async function createImpuesto(data) {
    if (data.modo === 'TASA' && (data.tasa === null || data.tasa === undefined))
        throw Object.assign(new Error('tasa requerida cuando modo=TASA'), { status: 400 });
    if (data.modo === 'CUOTA' && (data.cuota === null || data.cuota === undefined))
        throw Object.assign(new Error('cuota requerida cuando modo=CUOTA'), { status: 400 });
    if (data.vigencia_fin && new Date(data.vigencia_fin) < new Date(data.vigencia_inicio))
        throw Object.assign(new Error('vigencia_fin no puede ser menor a vigencia_inicio'), { status: 400 });

    const emp = await Empresa.findByPk(data.id_empresa);
    if (!emp) throw Object.assign(new Error('Empresa no encontrada'), { status: 404 });

    return Impuesto.create(data);
}

export const getImpuesto = (id) => Impuesto.findByPk(id, { include: [{ model: Empresa }] });

export const listImpuestos = (filters = {}) => {
    const where = {};
    if (filters.id_empresa) where.id_empresa = filters.id_empresa;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.aplica_en) where.aplica_en = filters.aplica_en;
    return Impuesto.findAll({ where, order: [['id_impuesto','ASC']] });
};

export async function updateImpuesto(id, updates) {
    const item = await Impuesto.findByPk(id);
    if (!item) return null;
    if (updates.modo === 'TASA' && (updates.tasa === null || updates.tasa === undefined))
        throw Object.assign(new Error('tasa requerida cuando modo=TASA'), { status: 400 });
    if (updates.modo === 'CUOTA' && (updates.cuota === null || updates.cuota === undefined))
        throw Object.assign(new Error('cuota requerida cuando modo=CUOTA'), { status: 400 });
    if (updates.vigencia_inicio && updates.vigencia_fin) {
        if (new Date(updates.vigencia_fin) < new Date(updates.vigencia_inicio))
        throw Object.assign(new Error('vigencia_fin no puede ser menor a vigencia_inicio'), { status: 400 });
    }
    await item.update(updates);
    return item;
}

export async function deleteImpuesto(id) {
    const item = await Impuesto.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
}