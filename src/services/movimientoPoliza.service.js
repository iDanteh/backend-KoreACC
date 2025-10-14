// services/movimientoPoliza.service.js
import { Op } from 'sequelize';
import * as Models from '../models/index.js';

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

export async function createMovimiento(data) {
    if (!data?.id_poliza) throw httpError('id_poliza requerido');
    if (data.operacion !== '0' && data.operacion !== '1') {
        throw httpError('operacion inválida (0=Haber, 1=Debe)');
    }
    if (data.monto == null) throw httpError('monto requerido');
    if (!data?.fecha) throw httpError('fecha requerida');

    // Validaciones FK mínimas
    const pol = await Poliza.findByPk(data.id_poliza);
    if (!pol) throw httpError('Póliza no encontrada', 404);

    if (Cuenta && data.id_cuenta) {
        const cuenta = await Cuenta.findByPk(data.id_cuenta);
        if (!cuenta) throw httpError('Cuenta no encontrada', 404);
    }

    return MovimientoPoliza.create(data);
}

export async function updateMovimiento(id_movimiento, payload) {
    const mov = await getMovimiento(id_movimiento);
    if (payload?.operacion && payload.operacion !== '0' && payload.operacion !== '1') {
        throw httpError('operacion inválida (0=Haber, 1=Debe)');
    }
    if (payload?.id_poliza) {
        const pol = await Poliza.findByPk(payload.id_poliza);
        if (!pol) throw httpError('Póliza no encontrada', 404);
    }
    if (Cuenta && payload?.id_cuenta) {
        const cuenta = await Cuenta.findByPk(payload.id_cuenta);
        if (!cuenta) throw httpError('Cuenta no encontrada', 404);
    }

    await mov.update({ ...payload, updated_at: new Date() });
    return mov;
}

export async function deleteMovimiento(id_movimiento) {
    const deleted = await MovimientoPoliza.destroy({ where: { id_movimiento } });
    if (!deleted) throw httpError('Movimiento no encontrado', 404);
    return { ok: true };
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