// services/periodo-autogen.service.js
import { Op, Sequelize } from 'sequelize';
import { sequelize } from '../config/db.js';
import { PeriodoContable, EjercicioContable } from '../models/index.js';

// Utilidades de fecha (UTC)
function parseDateUTC(dateStr) { const [y,m,d]=dateStr.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
function fmtUTC(d) { return d.toISOString().slice(0,10); }
function firstDayOfMonthUTC(d) { return fmtUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))); }
function endOfMonthUTCFromDate(d) { return fmtUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0))); }
function addDaysUTCStr(dateStr, days){ const d=parseDateUTC(dateStr); d.setUTCDate(d.getUTCDate()+days); return fmtUTC(d); }
function minDateStr(a,b){ return (parseDateUTC(a)<=parseDateUTC(b))?a:b; }
function maxDateStr(a,b){ return (parseDateUTC(a)>=parseDateUTC(b))?a:b; }

// Lunes = 1 ... Domingo = 7
function dayOfWeekISO(d){ const wd=d.getUTCDay(); return wd===0?7:wd; }
function nextMonday(dateStr){
    const d=parseDateUTC(dateStr);
    const wd=dayOfWeekISO(d);
    const delta = wd===1 ? 0 : (8-wd); // si ya es lunes, queda igual
    d.setUTCDate(d.getUTCDate()+delta);
    return fmtUTC(d);
}

// Generadores
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

        // Determinar a qué quincena pertenece cursor
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

// Mensual: bloques por mes calendario
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

// Anual: bloque único del tramo vigente
function* generarAnual(desdeYYYYMMDD, hastaYYYYMMDD) {
    yield { fecha_inicio: desdeYYYYMMDD, fecha_fin: hastaYYYYMMDD, tipo_periodo: 'ANUAL' };
}

// Verificación de solapes en DB 
async function existeSolape({ id_ejercicio, desde, hasta }) {
    const ya = await PeriodoContable.findOne({
        where: {
        id_ejercicio,
        [Op.and]: [
            { fecha_inicio: { [Op.lte]: hasta } },
            { fecha_fin:     { [Op.gte]: desde } },
        ],
        },
    });
    return !!ya;
}

// Servicio principal
// opciones: { id_ejercicio, frecuencia: 'SEMANAL'|'QUINCENAL'|'MENSUAL'|'ANUAL' }
export async function generarPeriodosDesdeMesActual(opciones) {
    const { id_ejercicio, frecuencia } = opciones;

    const ejercicio = await EjercicioContable.findByPk(id_ejercicio);
    if (!ejercicio) { const err = new Error('Ejercicio no encontrado'); err.status = 404; throw err; }

    const hoy = new Date();
    const primerDiaMesActual = firstDayOfMonthUTC(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1)));
    const desde = maxDateStr(ejercicio.fecha_inicio, primerDiaMesActual);
    const hasta = ejercicio.fecha_fin;

    if (parseDateUTC(desde) > parseDateUTC(hasta)) {
        // Si el ejercicio terminó antes del mes actual, no hay nada que generar
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
        return { total: creados.length + omitidos.length, creados, omitidos, desde, hasta };
    } catch (e) {
        await t.rollback();
        throw e;
    }
}