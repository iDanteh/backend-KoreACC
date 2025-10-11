import { sequelize } from '../config/db.js';
import { Impuesto, Empresa, Cuenta } from '../models/index.js';
import { Op, col } from 'sequelize';

// --- helpers ---
function enforceBusinessRules(data) {
    // Modo / tasa / cuota coherentes
    if (data.modo === 'TASA') {
        if (data.tasa === null || data.tasa === undefined) {
        throw Object.assign(new Error('tasa requerida cuando modo=TASA'), { status: 400 });
        }
        if ('cuota' in data) data.cuota = null;
    } else if (data.modo === 'CUOTA') {
        if (data.cuota === null || data.cuota === undefined) {
        throw Object.assign(new Error('cuota requerida cuando modo=CUOTA'), { status: 400 });
        }
        if ('tasa' in data) data.tasa = null;
    } else if (data.modo === 'EXENTO') {
        if ('tasa' in data) data.tasa = null;
        if ('cuota' in data) data.cuota = null;
    }

    // Fechas coherentes
    if (data.vigencia_fin && new Date(data.vigencia_fin) < new Date(data.vigencia_inicio)) {
        throw Object.assign(new Error('vigencia_fin no puede ser menor a vigencia_inicio'), { status: 400 });
    }
}

async function assertEmpresa(id_empresa) {
    const emp = await Empresa.findByPk(id_empresa);
    if (!emp) throw Object.assign(new Error('Empresa no encontrada'), { status: 404 });
}

async function assertCuentaIdExists(id_cuenta) {
    if (id_cuenta == null) return;
    const cta = await Cuenta.findByPk(id_cuenta);
    if (!cta) {
        const e = new Error(`No existe la Cuenta con id=${id_cuenta}`);
        e.status = 400;
        throw e;
    }
}

// --- create ---
export async function createImpuesto(data) {
    enforceBusinessRules(data);
    await assertEmpresa(data.id_empresa);
    await assertCuentaIdExists(data.id_cuenta);

    const imp = await Impuesto.create(data);
    return Impuesto.findByPk(imp.id_impuesto, {
        include: [{ model: Cuenta, as: 'cuenta' }],
    });
}

// --- read one ---
export const getImpuesto = (id) =>
    Impuesto.findByPk(id, {
        include: [{ model: Empresa }, { model: Cuenta, as: 'cuenta' }],
    });

// --- list ---
export const listImpuestos = async (filters = {}) => {
    const where = {};
    if (filters.id_empresa) where.id_empresa = filters.id_empresa;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.aplica_en) where.aplica_en = filters.aplica_en;

    const like = Op.iLike;
    if (filters.q) {
        where[Op.or] = [
        { nombre: { [like]: `%${filters.q}%` } },
        { '$cuenta.codigo$': { [like]: `%${filters.q}%` } },
        { '$cuenta.nombre$': { [like]: `%${filters.q}%` } },
        { '$Empresa.nombre$': { [like]: `%${filters.q}%` } },
        ];
    }

    return Impuesto.findAll({
        where,
        attributes: {
        include: [
            [col('Empresa.rfc'), 'empresa_rfc'],
            [col('cuenta.codigo'), 'cuenta_codigo'],
            [col('cuenta.nombre'), 'cuenta_nombre'],
        ],
        },
        include: [
        { model: Empresa, attributes: [] },
        { model: Cuenta, as: 'cuenta', attributes: [] },
        ],
        order: [['id_impuesto', 'ASC']],
        subQuery: false,
    });
};

// --- update ---
export async function updateImpuesto(id, updates) {
    const item = await Impuesto.findByPk(id);
    if (!item) return null;

    if ('id_cuenta' in updates) {
        if (updates.id_cuenta !== null) {
        await assertCuentaIdExists(updates.id_cuenta);
        }
    }

    const merged = { ...item.toJSON(), ...updates };
    enforceBusinessRules(merged);

    if (updates.vigencia_inicio && merged.vigencia_fin) {
        if (new Date(merged.vigencia_fin) < new Date(updates.vigencia_inicio)) {
        throw Object.assign(new Error('vigencia_fin no puede ser menor a vigencia_inicio'), { status: 400 });
        }
    }
    if (updates.vigencia_fin && merged.vigencia_inicio) {
        if (new Date(updates.vigencia_fin) < new Date(merged.vigencia_inicio)) {
        throw Object.assign(new Error('vigencia_fin no puede ser menor a vigencia_inicio'), { status: 400 });
        }
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