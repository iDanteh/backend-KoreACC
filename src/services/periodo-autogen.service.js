import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../config/db.js';
import { PeriodoContable, EjercicioContable, Poliza, MovimientoPoliza, TipoPoliza } from '../models/index.js';
import { acquireFolioLock, buildFolioString, nextConsecutivo, resolvePeriodoYYYYMM, resolveTipoNombre } from '../utils/folio-helper.js'

function parseDateUTC(dateStr) { const [y,m,d]=dateStr.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
function fmtUTC(d) { return d.toISOString().slice(0,10); }
function firstDayOfMonthUTC(d) { return fmtUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))); }
function endOfMonthUTCFromDate(d) { return fmtUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0))); }
function addDaysUTCStr(dateStr, days){ const d=parseDateUTC(dateStr); d.setUTCDate(d.getUTCDate()+days); return fmtUTC(d); }
function minDateStr(a,b){ return (parseDateUTC(a)<=parseDateUTC(b))?a:b; }
function maxDateStr(a,b){ return (parseDateUTC(a)>=parseDateUTC(b))?a:b; }

function dayOfWeekISO(d){ const wd=d.getUTCDay(); return wd===0?7:wd; }
function nextMonday(dateStr){
    const d=parseDateUTC(dateStr);
    const wd=dayOfWeekISO(d);
    const delta = wd===1 ? 0 : (8-wd); 
    d.setUTCDate(d.getUTCDate()+delta);
    return fmtUTC(d);
}

function* generarSemanal(desdeYYYYMMDD, hastaYYYYMMDD) {
    let ini = nextMonday(desdeYYYYMMDD);
    while (parseDateUTC(ini) <= parseDateUTC(hastaYYYYMMDD)) {
        const fin = minDateStr(addDaysUTCStr(ini, 6), hastaYYYYMMDD);
        yield { fecha_inicio: ini, fecha_fin: fin, tipo_periodo: 'SEMANAL' };
        ini = addDaysUTCStr(fin, 1);
    }
}

function* generarQuincenal(desdeYYYYMMDD, hastaYYYYMMDD) {
    let cursor = desdeYYYYMMDD;
    while (parseDateUTC(cursor) <= parseDateUTC(hastaYYYYMMDD)) {
        const d = parseDateUTC(cursor);
        const q1_ini = fmtUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
        const q1_fin = fmtUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 15)));
        const q2_ini = fmtUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 16)));
        const q2_fin = endOfMonthUTCFromDate(d);

        const dia = d.getUTCDate();
        if (dia <= 15) {
        const ini = maxDateStr(cursor, q1_ini);
        const fin = minDateStr(q1_fin, hastaYYYYMMDD);
        if (parseDateUTC(ini) <= parseDateUTC(fin))
            yield { fecha_inicio: ini, fecha_fin: fin, tipo_periodo: 'QUINCENAL' };
        const next = addDaysUTCStr(fin, 1);
        if (parseDateUTC(next) > parseDateUTC(hastaYYYYMMDD)) break;
        cursor = next;
        } else {
        const ini = maxDateStr(cursor, q2_ini);
        const fin = minDateStr(q2_fin, hastaYYYYMMDD);
        if (parseDateUTC(ini) <= parseDateUTC(fin))
            yield { fecha_inicio: ini, fecha_fin: fin, tipo_periodo: 'QUINCENAL' };
        const next = addDaysUTCStr(fin, 1);
        if (parseDateUTC(next) > parseDateUTC(hastaYYYYMMDD)) break;
        cursor = next;
        }
    }
}

function* generarMensual(desdeYYYYMMDD, hastaYYYYMMDD) {
    let cursor = desdeYYYYMMDD;
    while (parseDateUTC(cursor) <= parseDateUTC(hastaYYYYMMDD)) {
        const d = parseDateUTC(cursor);
        const iniMes = fmtUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
        const finMes = endOfMonthUTCFromDate(d);
        const ini = maxDateStr(cursor, iniMes);
        const fin = minDateStr(finMes, hastaYYYYMMDD);
        yield { fecha_inicio: ini, fecha_fin: fin, tipo_periodo: 'MENSUAL' };
        const next = addDaysUTCStr(fin, 1);
        if (parseDateUTC(next) > parseDateUTC(hastaYYYYMMDD)) break;
        cursor = next;
    }
}

function* generarAnual(desdeYYYYMMDD, hastaYYYYMMDD) {
    yield { fecha_inicio: desdeYYYYMMDD, fecha_fin: hastaYYYYMMDD, tipo_periodo: 'ANUAL' };
}

async function existeSolape({ id_ejercicio, desde, hasta }) {
    const ya = await PeriodoContable.findOne({
        where: { id_ejercicio, [Op.and]: [{ fecha_inicio: { [Op.lte]: hasta } }, { fecha_fin: { [Op.gte]: desde } }] },
    });
    return !!ya;
}

async function getTipoPolizaIdApertura() {
    const tp = await TipoPoliza.findOne({ where: { naturaleza: 'apertura' } });
    if (!tp) throw new Error('Tipo de póliza "apertura" no configurado');
    return tp.id_tipopoliza;
}

async function getEjercicioAnterior(id_empresa, anioActual) {
    return EjercicioContable.findOne({
        where: { id_empresa, anio: { [Op.lt]: anioActual } },
        order: [['anio', 'DESC']],
    });
}

export async function getPrimerPeriodoDelEjercicio(id_ejercicio) {
    return PeriodoContable.findOne({
        where: { id_ejercicio },
        order: [['fecha_inicio', 'ASC']],
    })
}

export async function obtenerSaldosFinalesBalancePorCuenta(id_ejercicio_anterior) {
    const rows = await sequelize.query(`
        SELECT m.id_cuenta,
            SUM(CASE WHEN m.operacion = '0' THEN m.monto ELSE 0 END) AS cargos,
            SUM(CASE WHEN m.operacion = '1' THEN m.monto ELSE 0 END) AS abonos
        FROM movimiento_poliza m
        JOIN poliza p           ON p.id_poliza = m.id_poliza
        JOIN periodo_contable per ON per.id_periodo = p.id_periodo
        JOIN ejercicio_contable e  ON e.id_ejercicio = per.id_ejercicio
        JOIN cuentas c          ON c.id = m.id_cuenta
        WHERE e.id_ejercicio = :ej
        AND c.tipo IN ('ACTIVO','PASIVO','CAPITAL')
        GROUP BY m.id_cuenta
    `, { replacements: { ej: id_ejercicio_anterior }, type: Sequelize.QueryTypes.SELECT });

    return rows
        .map(r => ({ id_cuenta: r.id_cuenta, neto: Number(r.cargos) - Number(r.abonos) }))
        .filter(x => Math.abs(x.neto) > 0.00005);
}

export async function upsertPolizaApertura({
    id_empresa, ejercicioDestino, primerPeriodo, saldos, id_usuario, id_centro, provisional, t,
    }) {
    const id_tipopoliza = await getTipoPolizaIdApertura();

    const { anio, mes } = await resolvePeriodoYYYYMM(primerPeriodo.id_periodo, t);

    const tipoNombre = await resolveTipoNombre(id_tipopoliza, t);

    await acquireFolioLock({ id_tipopoliza, anio, mes, id_centro }, t);
    const consecutivo = await nextConsecutivo({ id_tipopoliza, anio, mes, id_centro }, t);
    const folio = buildFolioString({ tipoNombre, anio, id_centro, mes, consecutivo });
    const conceptoBase = `APERTURA EJERCICIO ${ejercicioDestino.anio}${provisional ? ' (provisional)' : ''}`;

    let poliza = await Poliza.findOne({
        where: {id_periodo: primerPeriodo.id_periodo, id_tipopoliza, folio },
        transaction: t,
        lock: t ? t.LOCK.UPDATE : undefined,
    });

    if (!poliza) {
        poliza = await Poliza.findOne({
        where: { id_periodo: primerPeriodo.id_periodo, id_tipopoliza },
        transaction: t,
        lock: t ? t.LOCK.UPDATE : undefined,
        order: [['created_at', 'ASC']],
        });
    }

    if (!poliza) {
        poliza = await Poliza.create({
        id_tipopoliza,
        id_periodo: primerPeriodo.id_periodo,
        id_usuario,
        id_centro,
        folio,
        concepto: conceptoBase,
        estado: 'Por revisar',
        consecutivo,
        anio,
        mes,
        fecha_creacion: primerPeriodo.fecha_inicio,
        }, { transaction: t });
    } else {
        let changed = false;
        if (poliza.concepto !== conceptoBase) { poliza.concepto = conceptoBase; changed = true; }
        if (poliza.folio !== folio) { poliza.folio = folio;           changed = true; }
        if (poliza.anio !== anio) { poliza.anio = anio;             changed = true; }
        if (poliza.mes !== mes) { poliza.mes = mes;               changed = true; }
        if (poliza.consecutivo !== consecutivo){ poliza.consecutivo = consecutivo; changed = true; }
        if (changed) await poliza.save({ transaction: t });

        await MovimientoPoliza.destroy({ where: { id_poliza: poliza.id_poliza }, transaction: t });
    }

    const fechaMov = primerPeriodo.fecha_inicio;
    const movimientos = saldos.map(s => ({
        id_poliza: poliza.id_poliza,
        id_cuenta: s.id_cuenta,
        fecha: fechaMov,
        operacion: s.neto >= 0 ? '0' : '1',
        monto: Math.abs(s.neto),
        cc: id_centro,
    }));

    if (movimientos.length > 0) {
        await MovimientoPoliza.bulkCreate(movimientos, { transaction: t });
    }

    return poliza;
    }

    async function generarOAjustarAperturaSiCorresponde({
    ejercicioActual, creados, id_usuario, id_centro,
    }) {
    const primerPeriodo = creados.length
        ? creados.slice().sort((a,b)=>a.fecha_inicio.localeCompare(b.fecha_inicio))[0]
        : await getPrimerPeriodoDelEjercicio(ejercicioActual.id_ejercicio);

    if (!primerPeriodo) {
        return { aviso: 'No hay periodos para asociar la póliza de apertura.' };
    }

    const ejercicioAnterior = await getEjercicioAnterior(ejercicioActual.id_empresa, ejercicioActual.anio);
    if (!ejercicioAnterior) {
        return {
        aviso: 'No existen ejercicios previos. Sugerencia: cree la póliza de apertura desde la sección de pólizas (saldo inicial manual).',
        };
    }
    if (!id_usuario || !id_centro) {
        return {
        aviso: 'Se detectó ejercicio previo, pero falta id_usuario o id_centro. Sugerencia: genere la póliza de apertura desde la sección de pólizas.',
        };
    }

    const pendienteCierre = !!ejercicioAnterior.esta_abierto;

    const saldos = await obtenerSaldosFinalesBalancePorCuenta(ejercicioAnterior.id_ejercicio);

    const t = await sequelize.transaction();
    try {
        const poliza = await upsertPolizaApertura({
        id_empresa: ejercicioActual.id_empresa,
        ejercicioDestino: ejercicioActual,
        primerPeriodo,
        saldos,
        id_usuario,
        id_centro,
        provisional: pendienteCierre,
        t,
        });
        await t.commit();

        return {
        poliza_apertura: { id_poliza: poliza.id_poliza, provisional: pendienteCierre },
        mensaje: pendienteCierre
            ? 'Póliza de apertura creada como PROVISIONAL. Al cerrar el ejercicio anterior se recalculará.'
            : 'Póliza de apertura creada con saldos definitivos del ejercicio anterior.',
        };
    } catch (e) {
        await t.rollback();
        throw e;
    }
}

export async function generarPeriodosDesdeMesActual(opciones) {
    const { id_ejercicio, frecuencia, id_usuario, id_centro } = opciones;

    const ejercicio = await EjercicioContable.findByPk(id_ejercicio);
    if (!ejercicio) { const err = new Error('Ejercicio no encontrado'); err.status = 404; throw err; }

    const hoy = new Date();
    const primerDiaMesActual = firstDayOfMonthUTC(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)));
    const desde = maxDateStr(ejercicio.fecha_inicio, primerDiaMesActual);
    const hasta = ejercicio.fecha_fin;

    if (parseDateUTC(desde) > parseDateUTC(hasta)) {
        return { total: 0, creados: [], omitidos: [], aviso: 'Nada por generar: el ejercicio termina antes del mes actual.' };
    }

    let gen;
    switch (frecuencia) {
        case 'SEMANAL':    gen = generarSemanal(desde, hasta); break;
        case 'QUINCENAL':  gen = generarQuincenal(desde, hasta); break;
        case 'MENSUAL':    gen = generarMensual(desde, hasta); break;
        case 'ANUAL':      gen = generarAnual(desde, hasta); break;
        default: { const err = new Error('Frecuencia no soportada'); err.status = 400; throw err; }
    }

    const creados = [];
    const omitidos = [];
    const t = await sequelize.transaction();

    try {
        for (const { fecha_inicio, fecha_fin, tipo_periodo } of gen) {
        const hayChoque = await existeSolape({ id_ejercicio: ejercicio.id_ejercicio, desde: fecha_inicio, hasta: fecha_fin });
        if (hayChoque) {
            omitidos.push({ fecha_inicio, fecha_fin, motivo: 'solape' });
            continue;
        }

        const nuevo = await PeriodoContable.create({
            id_empresa: ejercicio.id_empresa,
            id_ejercicio: ejercicio.id_ejercicio,
            tipo_periodo,
            fecha_inicio,
            fecha_fin,
            periodo_daterange: Sequelize.literal(`daterange('${fecha_inicio}'::date,'${fecha_fin}'::date,'[]')`),
            esta_abierto: true,
        }, { transaction: t });

        creados.push(nuevo);
        }

        await t.commit();
    } catch (e) {
        await t.rollback();
        throw e;
    }
    const resultadoApertura = await generarOAjustarAperturaSiCorresponde({
        ejercicioActual: ejercicio,
        creados,
        id_usuario,
        id_centro, 
    });

    return {
        total: creados.length + omitidos.length,
        creados,
        omitidos,
        desde,
        hasta,
        ...(resultadoApertura || {}),
    };
}