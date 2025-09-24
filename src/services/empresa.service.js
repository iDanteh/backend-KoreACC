import { Empresa } from '../models/index.js';

export const createEmpresa = (data) => Empresa.create(data);

export const getEmpresa = (id) => Empresa.findByPk(id);

export const listEmpresas = () => Empresa.findAll({ order: [['id_empresa','ASC']] });

export const updateEmpresa = async (id, updates) => {
    const item = await Empresa.findByPk(id);
    if (!item) return null;
    await item.update(updates);
    return item;
};

export const deleteEmpresa = async (id) => {
    const item = await Empresa.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
};