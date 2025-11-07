import { Op, QueryTypes } from 'sequelize';
import * as Models from '../models/index.js';

const { sequelize, Poliza, PeriodoContable, TipoPoliza } = Models;

const FOLIO_NS = 'KoreACC:folio';

export async function resolvePeriodoYYYYMM(id_periodo, t) {
    const per = await PeriodoContable.findByPk(id_periodo, {
        attributes: ['fecha_inicio'],
        transaction: t
    });
    if (!per) throw new Error('Periodo no encontrado');
    const d = new Date(per.fecha_inicio);
    const anio = d.getUTCFullYear();
    const mes = d.getUTCMonth() + 1;
    return { anio, mes };
}

export async function resolveTipoNombre(id_tipopoliza, t) {
    const tipo = await TipoPoliza.findByPk(id_tipopoliza, {
        attributes: ['naturaleza'],
        transaction: t
    });
    if (!tipo) throw new Error('Tipo de póliza no encontrado');
    return String(tipo.naturaleza || '').toUpperCase();
}

export async function acquireFolioLock({ id_tipopoliza, anio, mes, id_centro = null }, t) {
    const key = `${FOLIO_NS}|${id_tipopoliza}|${anio}|${mes}|${id_centro ?? 'NULL'}`;
    await sequelize.query(
        'SELECT pg_advisory_xact_lock(hashtext($1));',
        { bind: [key], type: QueryTypes.SELECT, transaction: t }
    );
}

export async function nextConsecutivo({ id_tipopoliza, anio, mes, id_centro = null }, t) {
    const where = { id_tipopoliza, anio, mes };
    if (id_centro == null) {
        where.id_centro = { [Op.is]: null };
    } else {
        where.id_centro = id_centro;
    }

    const last = await Poliza.findOne({
        where,
        attributes: ['consecutivo'],
        order: [['consecutivo', 'DESC']],
        transaction: t,
        lock: t.LOCK.UPDATE, 
        skipLocked: false
    });

    return (last?.consecutivo ?? 0) + 1;
}

export function buildFolioString({ tipoNombre, anio, id_centro, mes, consecutivo }) {
    const m = String(mes).padStart(2, '0');
    const c = String(consecutivo).padStart(4, '0');
    return `${tipoNombre}-${m}-${id_centro}-${anio}-${c}`;
}
