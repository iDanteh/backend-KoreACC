import { Impuesto, Empresa, Cuenta } from '../models/index.js';
import { Op } from 'sequelize';

// --- helpers ---
function normCuentaRel(v) {
    if (v === undefined || v === null) return null;
    const t = String(v).trim();
    return t.length ? t : null;
}
function enforceBusinessRules(data) {
    // Modo / tasa / cuota coherentes
    if (data.modo === 'TASA') {
        if (data.tasa === null || data.tasa === undefined)
        throw Object.assign(new Error('tasa requerida cuando modo=TASA'), { status: 400 });
        // limpiar cuota si vino
        if ('cuota' in data) data.cuota = null;
    } else if (data.modo === 'CUOTA') {
        if (data.cuota === null || data.cuota === undefined)
        throw Object.assign(new Error('cuota requerida cuando modo=CUOTA'), { status: 400 });
        if ('tasa' in data) data.tasa = null;
    } else if (data.modo === 'EXENTO') {
        // nada de tasa/cuota
        if ('tasa' in data) data.tasa = null;
        if ('cuota' in data) data.cuota = null;
    }
    // Fechas coherentes
    if (data.vigencia_fin && new Date(data.vigencia_fin) < new Date(data.vigencia_inicio))
        throw Object.assign(new Error('vigencia_fin no puede ser menor a vigencia_inicio'), { status: 400 });
}

async function assertEmpresa(id_empresa) {
    const emp = await Empresa.findByPk(id_empresa);
    if (!emp) throw Object.assign(new Error('Empresa no encontrada'), { status: 404 });
}

async function assertCuentaCodigoExists(codigo) {
    if (!codigo) return;
    const existe = await Cuenta.findOne({ where: { codigo } });
    if (!existe) {
        const e = new Error(`No existe la Cuenta con codigo='${codigo}'`);
        e.status = 400;
        throw e;
    }
}

// --- create ---
export async function createImpuesto(data) {
    data.cuenta_relacionada = normCuentaRel(data.cuenta_relacionada);
    enforceBusinessRules(data);
    await assertEmpresa(data.id_empresa);
    await assertCuentaCodigoExists(data.cuenta_relacionada);
    const imp = await Impuesto.create(data);
    return Impuesto.findByPk(imp.id_impuesto, {
        include: [{ model: Cuenta, as: 'cuenta' }],
    });
}

// --- read one ---
export const getImpuesto = (id) =>
    Impuesto.findByPk(id, { include: [{ model: Empresa }, { model: Cuenta, as: 'cuenta' }] });

// --- list ---
export const listImpuestos = (filters = {}) => {
    const where = {};
    if (filters.id_empresa) where.id_empresa = filters.id_empresa;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.aplica_en) where.aplica_en = filters.aplica_en;

    const includeCuenta = String(filters.includeCuenta) === 'true';
    const include = includeCuenta ? [{ model: Cuenta, as: 'cuenta', required: false }] : [];

    if (filters.q) {
        const like = Op.iLike;
        where[Op.or] = [
        { nombre: { [like]: `%${filters.q}%` } },
        { cuenta_relacionada: { [like]: `%${filters.q}%` } },
        ];
        if (includeCuenta) {
        where[Op.or].push({ '$cuenta.codigo$': { [like]: `%${filters.q}%` } });
        }
    }

    return Impuesto.findAll({
        where,
        include,
        order: [['id_impuesto', 'ASC']],
    });
};

// --- update ---
export async function updateImpuesto(id, updates) {
    const item = await Impuesto.findByPk(id);
    if (!item) return null;

    if ('cuenta_relacionada' in updates) {
        updates.cuenta_relacionada = normCuentaRel(updates.cuenta_relacionada);
        await assertCuentaCodigoExists(updates.cuenta_relacionada);
    }

    const merged = { ...item.toJSON(), ...updates };
    enforceBusinessRules(merged);
    if (updates.vigencia_inicio && merged.vigencia_fin) {
        if (new Date(merged.vigencia_fin) < new Date(updates.vigencia_inicio))
        throw Object.assign(new Error('vigencia_fin no puede ser menor a vigencia_inicio'), { status: 400 });
    }
    if (updates.vigencia_fin && merged.vigencia_inicio) {
        if (new Date(updates.vigencia_fin) < new Date(merged.vigencia_inicio))
        throw Object.assign(new Error('vigencia_fin no puede ser menor a vigencia_inicio'), { status: 400 });
    }

    await item.update(updates);
    return Impuesto.findByPk(id, { include: [{ model: Cuenta, as: 'cuenta' }] });
}

// --- delete ---
export async function deleteImpuesto(id) {
    const item = await Impuesto.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
}