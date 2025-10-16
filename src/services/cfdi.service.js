import { XMLParser } from 'fast-xml-parser';
import { sequelize } from '../config/db.js';
import { CfdiComprobante, CfdiConcepto, CfdiTraslado } from '../models/index.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  allowBooleanAttributes: true,
  parseTagValue: false,
  processEntities: true,
});

const ensureArray = x => Array.isArray(x) ? x : (x ? [x] : []);

function extract(xml) {
  const j = parser.parse(xml);
  const comp = j['cfdi:Comprobante'] || j.Comprobante || j.cfdiComprobante || j.comprobante;
  if (!comp) throw new Error('Nodo Comprobante no encontrado');

  const complemento = comp['cfdi:Complemento'] || comp.Complemento || {};
  const tfd = complemento['tfd:TimbreFiscalDigital'] || complemento.TimbreFiscalDigital || complemento.tfdTimbreFiscalDigital;
  const UUID = tfd?.UUID;
  if (!UUID) throw new Error('UUID no encontrado en TimbreFiscalDigital');

  const conceptosNode = comp['cfdi:Conceptos'] || comp.Conceptos || {};
  const conceptos = ensureArray(conceptosNode['cfdi:Concepto'] || conceptosNode.Concepto);

  return { UUID, comp, conceptos };
}

export async function importCfdiXml(xml, { replaceConcepts = true, storeXml = true } = {}) {
  const { UUID, comp, conceptos } = extract(xml);

  const header = {
    uuid: UUID,
    version: comp.Version ?? null,
    fecha: comp.Fecha ?? null,
    serie: comp.Serie ?? null,
    folio: comp.Folio ?? null,
    moneda: comp.Moneda ?? null,
    subtotal: comp.SubTotal ?? null,
    total: comp.Total ?? null,
    rfc_emisor: comp?.Emisor?.Rfc ?? comp?.['cfdi:Emisor']?.Rfc ?? null,
    nombre_emisor: comp?.Emisor?.Nombre ?? comp?.['cfdi:Emisor']?.Nombre ?? null,
    rfc_receptor: comp?.Receptor?.Rfc ?? comp?.['cfdi:Receptor']?.Rfc ?? null,
    nombre_receptor: comp?.Receptor?.Nombre ?? comp?.['cfdi:Receptor']?.Nombre ?? null,
    ...(storeXml ? { xml_doc: xml } : {}),
  };

  return await sequelize.transaction(async (t) => {
    await CfdiComprobante.upsert(header, { transaction: t });

    if (replaceConcepts) {
      await CfdiConcepto.destroy({ where: { uuid: UUID }, transaction: t });
    }

    let pos = 0;
    for (const c of conceptos) {
      pos += 1;
      const conc = await CfdiConcepto.create({
        uuid: UUID,
        posicion: pos,
        clave_prod_serv: c.ClaveProdServ ?? null,
        no_identificacion: c.NoIdentificacion ?? null,
        cantidad: c.Cantidad ?? null,
        descripcion: c.Descripcion ?? null,
        valor_unitario: c.ValorUnitario ?? null,
        importe: c.Importe ?? null,
        objeto_imp: c.ObjetoImp ?? null,
      }, { transaction: t });

      const tras = c?.Impuestos?.Traslados?.Traslado ?? c?.['cfdi:Impuestos']?.['cfdi:Traslados']?.['cfdi:Traslado'];
      for (const tr of ensureArray(tras)) {
        await CfdiTraslado.create({
          id_concepto: conc.id,
          base: tr.Base ?? null,
          impuesto: tr.Impuesto ?? null,
          tipo_factor: tr.TipoFactor ?? null,
          tasa_o_cuota: tr.TasaOCuota ?? null,
          importe: tr.Importe ?? null,
        }, { transaction: t });
      }
    }

    return { uuid: UUID, conceptos: conceptos.length };
  });
}

export async function getCfids({ estatus } = {}) {
  const where = {};
  if (typeof estatus === 'boolean') where.esta_asociado = estatus;
  else where.esta_asociado = false;

  const { rows, count } = await CfdiComprobante.findAndCountAll({
    where,
    attributes: ['uuid','folio','fecha','subtotal','total','esta_asociado'],
    order: [['fecha','DESC']]
  });
  return { data: rows, total: count };
}