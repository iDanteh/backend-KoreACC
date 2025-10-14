import { Op } from 'sequelize';
import { MovimientoPoliza } from '../models/index.js';
import { CfdiComprobante, CfdiConcepto } from '../models/index.js';

export async function linkUuidToMovimientos({ id_poliza, uuid, movimiento_ids = [] }) {
  // Verifica que exista el CFDI
  const cfdi = await CfdiComprobante.findByPk(uuid);
  if (!cfdi) throw new Error('CFDI (UUID) no encontrado');

  if (!Array.isArray(movimiento_ids) || movimiento_ids.length === 0) {
    throw new Error('Proporciona al menos un id_movimiento a vincular');
  }

  const count = await MovimientoPoliza.update(
    { uuid },
    { where: { id_poliza, id_movimiento: { [Op.in]: movimiento_ids } } }
  );

  return { updated: count[0] || 0 };
}