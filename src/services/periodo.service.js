import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../config/db.js';
import { PeriodoContable, Empresa, Poliza } from '../models/index.js';
import { httpError } from '../utils/helper-poliza.js';

async function existeSolapePeriodo({
    id_empresa,
    id_ejercicio,
    fecha_inicio,
    fecha_fin,
    excludeId,
    transaction,
    }) {
    const where = {
        id_empresa,
        id_ejercicio,
        esta_abierto: true, // <<< clave: sólo activos
        ...(excludeId ? { id_periodo: { [Op.ne]: excludeId } } : {}),
        [Op.and]: [
        { fecha_inicio: { [Op.lte]: fecha_fin } },
        { fecha_fin: { [Op.gte]: fecha_inicio } },
        ],
    };
    const choque = await PeriodoContable.findOne({ where, transaction });
    return !!choque;
}

export async function createPeriodo(data) {
    if (new Date(data.fecha_fin) < new Date(data.fecha_inicio)) {
        const err = new Error('fecha_fin no puede ser menor a fecha_inicio');
        err.status = 400;
        throw err;
    }

    const emp = await Empresa.findByPk(data.id_empresa);
    if (!emp) {
        const err = new Error('Empresa no encontrada');
        err.status = 404;
        throw err;
    }

    const t = await sequelize.transaction();
    try {
        const haySolape = await existeSolapePeriodo({
        id_empresa: data.id_empresa,
        id_ejercicio: data.id_ejercicio,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        transaction: t,
        });
        if (haySolape) {
        const err = new Error('El periodo se solapa con otro existente activo en el mismo ejercicio');
        err.status = 409;
        throw err;
        }

        const payload = {
        ...data,
        periodo_daterange:
            data.periodo_daterange ??
            Sequelize.literal(`daterange('${data.fecha_inicio}'::date,'${data.fecha_fin}'::date,'[]')`),
        ...(typeof data.esta_abierto === 'undefined' ? { esta_abierto: true } : {}),
        };

        const creado = await PeriodoContable.create(payload, { transaction: t });
        await t.commit();
        return creado;
    } catch (e) {
        await t.rollback();
        throw e;
    }
}

export const getPeriodo = (id) =>
    PeriodoContable.findOne({
        where: {
        id_periodo: id,
        esta_abierto: true,
        },
        include: [{ model: Empresa }],
});

export const listPeriodos = (filters = {}) => {
    const where = { esta_abierto: true };
    if (filters.id_empresa) where.id_empresa = filters.id_empresa;
    if (filters.id_ejercicio) where.id_ejercicio = filters.id_ejercicio;
    if (filters.tipo_periodo) where.tipo_periodo = filters.tipo_periodo;
    if (typeof filters.esta_abierto !== 'undefined') where.esta_abierto = filters.esta_abierto;

    if (filters.desde || filters.hasta) {
        const desde = filters.desde ? new Date(filters.desde) : null;
        const hasta = filters.hasta ? new Date(filters.hasta) : null;
        if (desde && hasta) {
        where[Op.and] = [
            { fecha_inicio: { [Op.lte]: hasta } },
            { fecha_fin: { [Op.gte]: desde } },
        ];
        } else if (desde) {
        where.fecha_fin = { [Op.gte]: desde };
        } else if (hasta) {
        where.fecha_inicio = { [Op.lte]: hasta };
        }
    }

    return PeriodoContable.findAll({
        where,
        order: [['fecha_inicio', 'DESC'], ['id_periodo', 'DESC']],
    });
};

export async function updatePeriodo(id, updates) {
    const item = await PeriodoContable.findByPk(id);
    if (!item) return null;

    const nueva_fecha_inicio = updates.fecha_inicio ?? item.fecha_inicio;
    const nueva_fecha_fin = updates.fecha_fin ?? item.fecha_fin;
    const nuevo_id_empresa = updates.id_empresa ?? item.id_empresa;
    const nuevo_id_ejercicio = updates.id_ejercicio ?? item.id_ejercicio;

    if (new Date(nueva_fecha_fin) < new Date(nueva_fecha_inicio)) {
        const err = new Error('fecha_fin no puede ser menor a fecha_inicio');
        err.status = 400;
        throw err;
    }

    const t = await sequelize.transaction();
    try {
        const cambiaFechas =
        typeof updates.fecha_inicio !== 'undefined' ||
        typeof updates.fecha_fin !== 'undefined';
        const cambiaAmbito =
        typeof updates.id_empresa !== 'undefined' ||
        typeof updates.id_ejercicio !== 'undefined';

        if (cambiaFechas || cambiaAmbito) {
        const haySolape = await existeSolapePeriodo({
            id_empresa: nuevo_id_empresa,
            id_ejercicio: nuevo_id_ejercicio,
            fecha_inicio: nueva_fecha_inicio,
            fecha_fin: nueva_fecha_fin,
            excludeId: id,
            transaction: t,
        });
        if (haySolape) {
            const err = new Error('El periodo actualizado se solapa con otro existente activo en el mismo ejercicio');
            err.status = 409;
            throw err;
        }
        }

        const payload = {
        ...updates,
        ...(cambiaFechas
            ? {
                periodo_daterange: Sequelize.literal(
                `daterange('${nueva_fecha_inicio}'::date,'${nueva_fecha_fin}'::date,'[]')`
                ),
            }
            : {}),
        };

        await item.update(payload, { transaction: t });
        await t.commit();
        return item;
    } catch (e) {
        await t.rollback();
        throw e;
    }
}

/** Cierra el periodo */
export async function cerrarPeriodo(id_periodo) {
    return sequelize.transaction(async (t) => {
        const periodo = await PeriodoContable.findByPk(id_periodo, {
        transaction: t,
        lock: t.LOCK.UPDATE,
        });
        if (!periodo) return null;
        if (!periodo.esta_abierto) return true;

        // Verifica que no haya pólizas "Por revisar"
        const pendientes = await Poliza.count({
        where: { id_periodo, estado: 'Por revisar' },
        transaction: t,
        });
        if (pendientes > 0) {
        throw httpError(`No se puede cerrar: hay ${pendientes} póliza(s) "Por revisar".`, 409);
        }

        // Cierra
        await periodo.update(
        { esta_abierto: false, updated_at: new Date() },
        { transaction: t }
        );
        return true;
    });
}

/** Hard delete: elimina físicamente el registro */
export async function destroyPeriodo(id) {
    const item = await PeriodoContable.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
}