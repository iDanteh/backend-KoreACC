import { createPoliza } from '../services/poliza.service';
import { createEjercicio } from '../services/ejercicio.service.js';
import { TipoPoliza } from '../models/TipoPoliza.js';
import { PeriodoContable } from '../models/PeriodoContable.js';
import { Usuario } from '../models/Usuario.js';
import { CentroCosto } from '../models/CentroCosto.js';
import { EjercicioContable } from '../models/Ejercicio.js';
import { validateMovimientosPoliza,httpError } from './helper-poliza.js';

export async function ejerciciosAbiertos(id_empresa) {
    const ejerciciosAbiertos = await EjercicioContable.count({
        where: {id_empresa: id_empresa, esta_abierto: true}
    });
    return (ejerciciosAbiertos > 0);
}

export async function newEjercicioPoliza(payload, { movimientos = [] } = {}) {
    await ensureExists(TipoPoliza, payload.id_tipopoliza, 'Tipo de Póliza');
    await ensureExists(PeriodoContable, payload.id_periodo, 'PeriodoContable');
    await ensureExists(Usuario, payload.id_usuario, 'Usuario');
    await ensureExists(CentroCosto, payload.id_centro, 'Centro de Costo');

    if (!payload.folio) throw httpError('folio requerido');
    if (!payload.concepto) throw httpError('concepto requerido');
    if (!Array.isArray(movimientos) || movimientos.length < 2) throw httpError('No se cumple partida doble');

    validateMovimientosPoliza(movimientos);
}

async function ensureExists(Model, id, name) {
    if (!Model) return;
    const found = await Model.findByPk(id);
    if (!found) throw httpError(`${name} no encontrado`, 404);
}