import { PeriodoContable, EjercicioContable, Poliza, TipoPoliza, Usuario, CentroCosto, MovimientoPoliza } from '../models/index.js';
import { httpError } from '../utils/helper-poliza.js';
import { sequelize } from '../models/index.js';

export async function ensurePeriodoAbierto(id_periodo, t) {
    const periodo = await PeriodoContable.findByPk(id_periodo, {
        transaction: t,
        lock: t?.LOCK?.UPDATE
    });
    if (!periodo) throw httpError('PeriodoContable no encontrado', 404);
    if (!periodo.esta_abierto) {
        throw httpError('El período contable está cerrado: no se pueden registrar pólizas en este período', 409);
    }
    return periodo;
}

export async function ensurePolizaEditable(pol, t) {
    if(!pol) throw httpError('Póliza no encontrada', 404);

    if (pol.estado !== 'Por revisar') throw httpError('La Póliza se encuentra como "Revisada o contabilizada" ', 409);

    const per = await PeriodoContable.findByPk(pol.id_periodo, { transaction: t ?? undefined });
    if (!per) throw httpError('Periodo no encontrado', 404);
    if (!per.esta_abierto) throw httpError('El periodo de la póliza está cerrado.', 409);
}

export async function ensureDeletePoliza(pol, t) {
    if (!pol) throw httpError('Póliza no encontrada', 404);

    if (pol.estado === 'Revisada' || pol.estado === 'Contabilizada') {
        throw httpError('No se puede eliminar una póliza revisada o contabilizada', 409);
    }
}