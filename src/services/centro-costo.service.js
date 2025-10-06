import { CentroCosto } from '../models/index.js';

export const createCentroCosto = (data) => CentroCosto.create(data);

export const getCentroCosto = (id) => CentroCosto.findByPk(id);

export const listCentrosCosto = () =>
    CentroCosto.findAll({ order: [['id_centro', 'ASC']] });

export const updateCentroCosto = async (id, updates) => {
    const item = await CentroCosto.findByPk(id);
    if (!item) return null;
    await item.update({ ...updates, updated_at: new Date() });
    return item;
};

export const deleteCentroCosto = async (id) => {
    const item = await CentroCosto.findByPk(id);
    if (!item) return null;
    await item.update({ activo: false });
    return true;
};