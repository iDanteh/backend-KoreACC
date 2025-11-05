import { Op } from 'sequelize';
import * as Models from '../models/index.js';
import { ensurePolizaEditable } from '../utils/periodo.js';
import { assertCuentaPosteable } from '../utils/cuentas.js';
import { CfdiComprobante } from '../models/cfdi_comprobante.model.js';

const { MovimientoPoliza, Poliza, Cuenta, sequelize } = Models;

function httpError(message, status = 400) {
    return Object.assign(new Error(message), { status });
}

export async function getMovimiento(id_movimiento) {
    const mov = await MovimientoPoliza.findByPk(id_movimiento);
    if (!mov) throw httpError('Movimiento no encontrado', 404);
    return mov;
}

export async function listMovimientos({
    page = 1,
    pageSize = 50,
    id_poliza,
    id_cuenta,
    operacion, // '0' o '1'
    fecha_desde,
    fecha_hasta,
    cc,
    order = [['fecha', 'DESC'], ['id_movimiento', 'DESC']],
    } = {}) {
    const where = {};
    if (id_poliza) where.id_poliza = id_poliza;
    if (id_cuenta) where.id_cuenta = id_cuenta;
    if (operacion) where.operacion = operacion;
    if (typeof cc !== 'undefined') where.cc = cc;

    if (fecha_desde || fecha_hasta) {
        where.fecha = {};
        if (fecha_desde) where.fecha[Op.gte] = fecha_desde;
        if (fecha_hasta) where.fecha[Op.lte] = fecha_hasta;
    }

    const limit = Math.min(+pageSize || 50, 500);
    const offset = Math.max(+page - 1, 0) * limit;

    const { rows, count } = await MovimientoPoliza.findAndCountAll({ where, order, limit, offset });
    return { data: rows, total: count, page: +page, pageSize: limit };
}

async function assertPolizaCuentaExist(data, t) {
    const pol = await Poliza.findByPk(data.id_poliza, { transaction: t });
    if (!pol) throw httpError('Póliza no encontrada', 404);

    if (Cuenta && data.id_cuenta) {
        const cuenta = await Cuenta.findByPk(data.id_cuenta, { transaction: t });
        if (!cuenta) throw httpError('Cuenta no encontrada', 404);
    }
}

async function lockAndGetCfdi(uuid, t) {
    const cfdi = await CfdiComprobante.findOne({
        where: { uuid },
        transaction: t,
        lock: t.LOCK.UPDATE,
    });
    if (!cfdi) throw httpError('CFDI no encontrado', 404);
    return cfdi;
}

/** Crea un movimiento y, si trae uuid, asocia CFDI (esta_asociado=true) */
export async function createMovimiento(data) {
    if (!data?.id_poliza) throw httpError('id_poliza requerido');
    if (data.operacion !== '0' && data.operacion !== '1') {
        throw httpError('operacion inválida (0=Haber, 1=Debe)');
    }
    if (data.monto == null) throw httpError('monto requerido');
    if (!data?.fecha) throw httpError('fecha requerida');

    return sequelize.transaction(async (t) => {
        const pol = await Poliza.findByPk(data.id_poliza, { transaction: t });
        if (!pol) throw httpError('Póliza no encontrada', 404);

        await ensurePolizaEditable(pol, t);
            const { id_cuenta } = await assertCuentaPosteable(
        { id_cuenta: data.id_cuenta, codigo: data.codigo },
        t
        );
        await assertPolizaCuentaExist(data, t);

        // Si viene uuid, validar disponibilidad y marcar asociado
        if (data.uuid) {
        const cfdi = await lockAndGetCfdi(data.uuid, t);
        if (cfdi.esta_asociado) throw httpError('CFDI ya está asociado a otro movimiento', 409);
        await cfdi.update({ esta_asociado: true, updated_at: new Date() }, { transaction: t });
        }

        return MovimientoPoliza.create({ ...data, id_cuenta }, { transaction: t });
    });
}

/** Actualiza un movimiento y maneja el cambio de uuid (libera/ocupa CFDIs) */
export async function updateMovimiento(id_movimiento, payload) {
    if (payload?.operacion && payload.operacion !== "0" && payload.operacion !== "1") {
        throw httpError("operacion inválida (0=Haber, 1=Debe)");
    }

    return sequelize.transaction(async (t) => {
        const mov = await getMovimiento(id_movimiento, { transaction: t, lock: t.LOCK.UPDATE });

        if (payload?.id_poliza) {
        const pol = await Poliza.findByPk(payload.id_poliza, { transaction: t });
        if (!pol) throw httpError("Póliza no encontrada", 404);
        }

        let id_cuenta_final = mov.id_cuenta;
        if (payload?.id_cuenta || payload?.codigo) {
        const { id_cuenta } = await assertCuentaPosteable(
            { id_cuenta: payload.id_cuenta, codigo: payload.codigo },
            t
        );
        id_cuenta_final = id_cuenta;
        }

        // Gestión de CFDI si cambia
        const prevUuid = mov.uuid;
        const nextUuid = Object.prototype.hasOwnProperty.call(payload, "uuid")
        ? payload.uuid
        : prevUuid;

        if (nextUuid !== prevUuid) {
        if (prevUuid) {
            const cfdiPrev = await lockAndGetCfdi(prevUuid, t);
            await cfdiPrev.update({ esta_asociado: false, updated_at: new Date() }, { transaction: t });
        }
        if (nextUuid) {
            const cfdiNext = await lockAndGetCfdi(nextUuid, t);
            if (cfdiNext.esta_asociado) throw httpError("CFDI ya está asociado a otro movimiento", 409);
            await cfdiNext.update({ esta_asociado: true, updated_at: new Date() }, { transaction: t });
        }
        }

        await mov.update({ ...payload, id_cuenta: id_cuenta_final, updated_at: new Date() }, { transaction: t });
        return mov;
    });
}

/** Elimina un movimiento y, si tenía uuid, desasocia el CFDI */
export async function deleteMovimiento(id_movimiento) {
    return sequelize.transaction(async (t) => {
        const mov = await MovimientoPoliza.findOne({
        where: { id_movimiento },
        transaction: t,
        lock: t.LOCK.UPDATE,
        });
        if (!mov) throw httpError('Movimiento no encontrado', 404);

        if (mov.uuid) {
        const cfdi = await lockAndGetCfdi(mov.uuid, t);
        await cfdi.update({ esta_asociado: false, updated_at: new Date() }, { transaction: t });
        }

        await MovimientoPoliza.destroy({ where: { id_movimiento }, transaction: t });
        return { ok: true };
    });
}

/**
 * Utilidad opcional: reemplazar en bloque los movimientos de una póliza
 * (útil para re-captura). Operación atómica con transacción.
 */
export async function replaceAllForPoliza(id_poliza, movimientos = []) {
    const pol = await Poliza.findByPk(id_poliza);
    if (!pol) throw httpError('Póliza no encontrada', 404);

    // Validación básica
    for (const m of movimientos) {
        if (m.operacion !== '0' && m.operacion !== '1') {
        throw httpError('operacion inválida en movimiento (0=Haber, 1=Debe)');
        }
        if (m.monto == null) throw httpError('monto requerido en movimiento');
        if (!m.fecha) throw httpError('fecha requerida en movimiento');
    }

    return sequelize.transaction(async (t) => {
        await MovimientoPoliza.destroy({ where: { id_poliza }, transaction: t });

        // Validar cuentas en bloque si el modelo está disponible
        if (Cuenta) {
        const cuentaIds = [...new Set(movimientos.map(m => m.id_cuenta).filter(Boolean))];
        if (cuentaIds.length) {
            const found = await Cuenta.count({ where: { id: { [Op.in]: cuentaIds } }, transaction: t });
            if (found !== cuentaIds.length) throw httpError('Una o más cuentas no existen', 404);
        }
        }

        await MovimientoPoliza.bulkCreate(
        movimientos.map(m => ({ ...m, id_poliza })),
        { transaction: t }
        );
        return { ok: true, count: movimientos.length };
    });
}