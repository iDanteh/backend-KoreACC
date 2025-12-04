import {
    Empresa,
    PeriodoContable,
    Impuesto,
    EjercicioContable,
    Cuenta,
    CentroCosto,
    Poliza,
} from '../models/index.js';

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

    const [
        periodos,
        ejercicios,
    ] = await Promise.all([
        PeriodoContable.count({ where: { id_empresa: id } }),
        EjercicioContable.count({ where: { id_empresa: id } }),
    ]);

    const totalRelacionados =
        periodos + ejercicios;

    if (totalRelacionados > 0) {
        const error = new Error(
        'No se puede eliminar la empresa porque tiene información registrada.'
        );
        error.code = 'EMPRESA_CON_DATOS';
        error.detalle = {
        periodos,
        ejercicios,
        };
        throw error;
    }

    await item.destroy();
    return true;
};