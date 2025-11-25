import { Op } from 'sequelize';
import * as Models from '../../models/index.js';
import { listPolizas } from '../poliza.service.js';

const {
    sequelize,
    CfdiComprobante,
    CfdiConcepto,
    CfdiTraslado,
    Poliza,
    MovimientoPoliza,
    Cuenta,
    PeriodoContable,
    TipoPoliza,
    CentroCosto,
    Usuario,
} = Models;

export async function listPolizaByEjercicio(id_ejercicio, options = {}) {
    if (!id_ejercicio) throw new Error ('El id del ejercicio es requerido');

    const periodos = await PeriodoContable.findAll({
        where: { id_ejercicio }, 
        attributes: ['id_periodo'],
        order: [['fecha_inicio', 'ASC']],
    });

    if (!periodos.length) {
        return { data: [], total: 0, page: 1, pageSize: 0 };
    }

    const idsPeriodo = periodos.map(p => p.id_periodo);

    return listPolizas({
        ...options,
        id_periodo: { [Op.in]: idsPeriodo },
    })
}