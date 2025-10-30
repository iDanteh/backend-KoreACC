import { Op } from 'sequelize';
import * as Models from '../models/index.js';
import { validateMovimientosPoliza, httpError } from '../utils/helper-poliza.js';
import { assertCuentaPosteable } from '../utils/cuentas.js';
import { importCfdiXml } from './cfdi.service.js';
import { linkUuidToMovimientos } from './movimientos-uuid.service.js';
import { ensurePeriodoAbierto, ensurePolizaEditable, ensureDeletePoliza } from '../utils/periodo.js';
import { expandEventoToMovimientos } from './asientos-motor.js';

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

async function ensureExists(Model, id, name) {
    if (!Model) return;
    const found = await Model.findByPk(id);
    if (!found) throw httpError(`${name} no encontrado`, 404);
}

export async function getPoliza(
    id_poliza,
    { includeMovimientos = false, withFk = true } = {}
    ) {
    const include = [];

    // FKs directas de la póliza
    if (withFk) {
        include.push(
        { model: TipoPoliza,      as: 'tipo',    attributes: ['id_tipopoliza','naturaleza','descripcion'] },
        { model: PeriodoContable, as: 'periodo', attributes: ['id_periodo','tipo_periodo','fecha_inicio','fecha_fin','esta_abierto'] },
        { model: Usuario,         as: 'creador', attributes: ['id_usuario','nombre','apellido_p','apellido_m','correo','usuario','estatus'] },
        { model: CentroCosto,     as: 'centro',  attributes: ['id_centro','serie_venta','nombre_centro','region'] },
        );
    }

    // Movimientos (y su FK a Cuenta)
    if (includeMovimientos) {
        const movInclude = {
        model: MovimientoPoliza,
        as: 'movimientos',
        attributes: [
            'id_movimiento','id_cuenta','operacion','monto','fecha',
            'ref_serie_venta','cliente','cc','uuid','created_at','updated_at'
        ],
        include: []
        };

        if (withFk) {
        movInclude.include.push({
            model: Cuenta,
            as: 'cuenta',
            attributes: ['id','codigo','nombre']
        });
        }

        include.push(movInclude);
    }

    const pol = await Poliza.findByPk(id_poliza, {
        attributes: [
        'id_poliza','id_tipopoliza','id_periodo','id_usuario','id_centro',
        'folio','concepto','estado','fecha_creacion','created_at','updated_at'
        ],
        include
    });

    if (!pol) throw httpError('Póliza no encontrada', 404);
    return pol;
}

export async function listPolizas({
    page = 1,
    pageSize = 20,
    id_tipopoliza,
    id_periodo,
    id_usuario,
    id_centro,
    estado,
    fecha_desde,
    fecha_hasta,
    q, // busca en folio / concepto
    order = [['fecha_creacion', 'DESC'], ['id_poliza', 'DESC']],
    includeMovimientos = false,
    withFk = true,
    flatten = true,
    } = {}) {
    const where = {};
    if (id_tipopoliza) where.id_tipopoliza = id_tipopoliza;
    if (id_periodo) where.id_periodo = id_periodo;
    if (id_usuario) where.id_usuario = id_usuario;
    if (id_centro) where.id_centro = id_centro;
    if (estado) where.estado = estado;

    if (fecha_desde || fecha_hasta) {
        where.fecha_creacion = {};
        if (fecha_desde) where.fecha_creacion[Op.gte] = fecha_desde;
        if (fecha_hasta) where.fecha_creacion[Op.lte] = fecha_hasta;
    }

    if (q) {
        where[Op.or] = [
        { folio: { [Op.iLike]: `%${q}%` } },
        { concepto: { [Op.iLike]: `%${q}%` } },
        ];
    }

    const limit = Math.min(+pageSize || 20, 200);
    const offset = Math.max(+page - 1, 0) * limit;

    // ---- includes de FKs (anidados) ----
    const include = [];
    if (withFk) {
        include.push(
        { model: TipoPoliza,      as: 'tipo',    attributes: [] },
        { model: PeriodoContable, as: 'periodo', attributes: [] },
        { model: Usuario,         as: 'creador', attributes: [] },
        { model: CentroCosto,     as: 'centro',  attributes: [] },
        );
    }
    if (includeMovimientos) {
        include.push({
        model: MovimientoPoliza,
        as: 'movimientos',
        attributes: ['id_movimiento','id_cuenta','operacion','monto','fecha','uuid','created_at','updated_at'],
        include: withFk ? [{ model: Cuenta, as: 'cuenta', attributes: ['id','codigo','nombre'] }] : [],
        });
    }

    //atributos base de la póliza
    const baseAttributes = [
        'id_poliza','id_tipopoliza','id_periodo','id_usuario','id_centro',
        'folio','concepto','estado','fecha_creacion','created_at','updated_at'
    ];

    //proyección “plana” de columnas de las FKs
    const flatAttributes = withFk && flatten ? [
        [sequelize.col('tipo.naturaleza'),        'tipo_naturaleza'],
        [sequelize.col('tipo.descripcion'),       'tipo_descripcion'],
        [sequelize.col('periodo.id_periodo'),     'periodo_id'],
        [sequelize.col('periodo.tipo_periodo'),   'periodo_tipo'],
        [sequelize.col('periodo.fecha_inicio'),   'periodo_inicio'],
        [sequelize.col('periodo.fecha_fin'),      'periodo_fin'],
        [sequelize.col('periodo.esta_abierto'),   'periodo_abierto'],
        [sequelize.col('creador.id_usuario'),     'creador_id'],
        [sequelize.col('creador.nombre'),         'creador_nombre'],
        [sequelize.col('creador.apellido_p'),     'creador_apellido_p'],
        [sequelize.col('creador.apellido_m'),     'creador_apellido_m'],
        [sequelize.col('creador.correo'),         'creador_correo'],
        [sequelize.col('centro.id_centro'),       'centro_id'],
        [sequelize.col('centro.serie_venta'),     'centro_serie_venta'],
        [sequelize.col('centro.nombre_centro'),   'centro_nombre'],
        [sequelize.col('centro.region'),          'centro_region'],
    ] : [];

    const { rows, count } = await Poliza.findAndCountAll({
        where,
        order,
        limit,
        offset,
        include,
        attributes: {
        include: flatAttributes
        },
        subQuery: false,
        distinct: true,
    });

    return { data: rows, total: count, page: +page, pageSize: limit };
}

export async function createPolizaWithXml(payload, { movimientos = [], xml, linkMovimientoIds = [] } = {}) {
    const pol = await createPoliza(payload, { movimientos });

    if (xml) {
        const { uuid } = await importCfdiXml(xml);

        if (linkMovimientoIds?.length) {
        await linkUuidToMovimientos({ id_poliza: pol.id_poliza, uuid, movimiento_ids: linkMovimientoIds });
        }

        return { ...pol.get({ plain: true }), uuid };
    }

    return pol;
}
//jjj
export async function createPoliza(payload, { movimientos = [] } = {}) {
    // Validaciones FK mínimas
    await ensureExists(TipoPoliza, payload.id_tipopoliza, 'TipoPoliza');
    await ensureExists(PeriodoContable, payload.id_periodo, 'PeriodoContable');
    await ensureExists(Usuario, payload.id_usuario, 'Usuario');
    await ensureExists(CentroCosto, payload.id_centro, 'Centro de Costo');

    if (!payload.folio) throw httpError('folio requerido');
    if (!payload.concepto) throw httpError('concepto requerido');
    if (!Array.isArray(movimientos) || movimientos.length < 2) throw httpError('No se cumple partida doble');
    

    // Validación para que cuadren las sumas iguales
// Validación de cuadre: estricta salvo que permitir_descuadre = true
if (!permitir_descuadre) {
  validateMovimientosPoliza(movimientos);
} else {
  // Solo calcula el descuadre para dejar rastro (log); no truena
  const sumDebe  = movimientos.filter(m => m.operacion === '0')
                    .reduce((s, m) => s + (Number(m.monto) || 0), 0);
  const sumHaber = movimientos.filter(m => m.operacion === '1')
                    .reduce((s, m) => s + (Number(m.monto) || 0), 0);
  const diff = +(sumDebe - sumHaber).toFixed(2);
  if (diff !== 0) {
    console.warn(`[POLIZA DESCUADRADA] Debe=${sumDebe} Haber=${sumHaber} Dif=${diff}`);
  }
}

    return sequelize.transaction(async (t) => {
        await ensurePeriodoAbierto(payload.id_periodo, t);

        const pol = await Poliza.create(payload, { transaction: t });

  if (movimientos?.length) {
  // 1) Junta y normaliza UUIDs (trim + uppercase)
  const norm = (u) => String(u).normalize('NFKC').trim().toUpperCase();
  const uuids = [...new Set(
    movimientos
      .map(m => (typeof m?.uuid === 'string' ? m.uuid : ''))
      .filter(Boolean)
      .map(norm)
  )];

  // 2) Busca CFDI y aplica lock
  let cfdis = [];
  if (uuids.length) {
    cfdis = await CfdiComprobante.findAll({
      where: { uuid: { [Op.in]: uuids } },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    // 2.1 Identifica faltantes (no truena; solo avisa)
    const encontrados = new Set(cfdis.map(c => norm(c.uuid)));
    const noHallados = uuids.filter(u => !encontrados.has(u));
    if (noHallados.length) {
      console.warn('CFDI no encontrados (se continúa sin asociar):', noHallados);
    }

    // 2.2 Revisa ya asociados (sí truena para evitar duplicidad)
    const yaAsociados = cfdis.filter(c => c.esta_asociado);
    if (yaAsociados.length) {
      throw httpError(`CFDI ya asociado: ${yaAsociados.map(c => c.uuid).join(', ')}`, 409);
    }

    // 2.3 Marca como asociados solo los hallados
    if (cfdis.length) {
      await CfdiComprobante.update(
        { esta_asociado: true, updated_at: new Date() },
        { where: { uuid: { [Op.in]: cfdis.map(c => c.uuid) } }, transaction: t }
      );
    }

    // 2.4 Normaliza el uuid en cada movimiento (para persistir homogéneo)
    for (const m of movimientos) {
      if (m.uuid) m.uuid = norm(m.uuid);
    }
  }

  // 3) Normaliza/valida cada movimiento y crea en bloque
  const normalizados = [];
  for (const m of movimientos) {
    if (m.id_poliza && m.id_poliza !== pol.id_poliza) {
      throw httpError('id_poliza de movimiento no coincide con la póliza creada');
    }
    // Ajusta el mensaje a tu convención real:
    if (m.operacion !== '0' && m.operacion !== '1') {
      throw httpError('operacion inválida en movimiento (0=Cargo, 1=Abono)');
    }
    if (m.monto == null) throw httpError('monto requerido en movimiento');

    const { id_cuenta } = await assertCuentaPosteable(
      { id_cuenta: m.id_cuenta, codigo: m.codigo },
      t
    );

    if (Cuenta && m.id_cuenta) {
      const cuenta = await Cuenta.findByPk(m.id_cuenta, { transaction: t });
      if (!cuenta) throw httpError('Cuenta no encontrada', 404);
    }

    normalizados.push({ ...m, id_cuenta, id_poliza: pol.id_poliza });
  }

  await MovimientoPoliza.bulkCreate(normalizados, { transaction: t });
}



        return pol;
    });
}
// ➕ agrega esto junto a las demás exports del servicio:
export async function createPolizaPermisiva(payload, { movimientos = [] } = {}) {
  await ensureExists(TipoPoliza, payload.id_tipopoliza, 'TipoPoliza');
  await ensureExists(PeriodoContable, payload.id_periodo, 'PeriodoContable');
  await ensureExists(Usuario, payload.id_usuario, 'Usuario');
  await ensureExists(CentroCosto, payload.id_centro, 'Centro de Costo');

  if (!payload.folio)    throw httpError('folio requerido');
  if (!payload.concepto) throw httpError('concepto requerido');
  if (!Array.isArray(movimientos) || movimientos.length < 1) {
    throw httpError('Se requiere al menos un movimiento');
  }

  // 👇 No llamamos validateMovimientosPoliza aquí (permite no cuadrada)

  return sequelize.transaction(async (t) => {
    await ensurePeriodoAbierto(payload.id_periodo, t);

    const pol = await Poliza.create(
      { ...payload, estado: payload.estado ?? 'No cuadrada' },
      { transaction: t }
    );

    if (movimientos?.length) {
      // Normalización/validación por movimiento (igual que en createPoliza)
      const normUuid = (u) => String(u).normalize('NFKC').trim().toUpperCase();
      const uuids = [...new Set(movimientos.map(m => (m.uuid ? normUuid(m.uuid) : '')).filter(Boolean))];

      if (uuids.length) {
        const cfdis = await CfdiComprobante.findAll({
          where: { uuid: { [Op.in]: uuids } },
          transaction: t, lock: t.LOCK.UPDATE,
        });

        // no truena si faltan (solo avisa):
        const encontrados = new Set(cfdis.map(c => normUuid(c.uuid)));
        const noHallados = uuids.filter(u => !encontrados.has(u));
        if (noHallados.length) console.warn('CFDI no encontrados (perm):', noHallados);

        const yaAsociados = cfdis.filter(c => c.esta_asociado);
        if (yaAsociados.length) {
          throw httpError(`CFDI ya asociado: ${yaAsociados.map(c => c.uuid).join(', ')}`, 409);
        }

        if (cfdis.length) {
          await CfdiComprobante.update(
            { esta_asociado: true, updated_at: new Date() },
            { where: { uuid: { [Op.in]: cfdis.map(c => c.uuid) } }, transaction: t }
          );
        }

        for (const m of movimientos) if (m.uuid) m.uuid = normUuid(m.uuid);
      }

      const rows = [];
      for (const m of movimientos) {
        if (m.operacion !== '0' && m.operacion !== '1') {
          throw httpError('operacion inválida en movimiento (0=Cargo, 1=Abono)');
        }
        if (m.monto == null) throw httpError('monto requerido en movimiento');

        const { id_cuenta } = await assertCuentaPosteable({ id_cuenta: m.id_cuenta, codigo: m.codigo }, t);

        if (Cuenta && m.id_cuenta) {
          const cuenta = await Cuenta.findByPk(m.id_cuenta, { transaction: t });
          if (!cuenta) throw httpError('Cuenta no encontrada', 404);
        }

        rows.push({ ...m, id_cuenta, id_poliza: pol.id_poliza });
      }

      await MovimientoPoliza.bulkCreate(rows, { transaction: t });
    }

    return pol;
  });
}

export async function updatePoliza(id_poliza, payload) {
    const pol = await getPoliza(id_poliza);

    if (payload?.estado && !['Por revisar', 'Aprobada', 'Contabilizada'].includes(payload.estado)) {
        throw httpError('estado inválido (Por revisar|Aprobada|Contabilizada)');
    }

    // FKs si cambian
    if (payload?.id_tipopoliza) await ensureExists(TipoPoliza, payload.id_tipopoliza, 'TipoPoliza');
    if (payload?.id_usuario) await ensureExists(Usuario, payload.id_usuario, 'Usuario');
    if (payload?.id_centro) await ensureExists(CentroCosto, payload.id_centro, 'Centro de Costo');

    return sequelize.transaction(async (t) => {
        if (payload?.id_periodo && payload.id_periodo !== pol.id_periodo) {
        await ensurePeriodoAbierto(payload.id_periodo, t);
        }

        await ensurePolizaEditable(pol, t);

        await pol.update({ ...payload, updated_at: new Date() }, { transaction: t });
        return pol;
    });
}

export function buildPolizaPayloadFromFlatBody(body) {
    const {
        id_tipopoliza, id_periodo, id_usuario, id_centro,
        folio, concepto
    } = body;

    return { id_tipopoliza, id_periodo, id_usuario, id_centro, folio, concepto };
}

export function buildEventoFromFlatBody(body) {
    const {
        tipo_operacion, monto_base, fecha_operacion, id_empresa,
        medio_cobro_pago, id_cuenta_contrapartida,
        cc
    } = body;

    return {
        tipo_operacion,
        monto_base,
        fecha_operacion,
        id_centro: cc ?? body.id_centro,
        id_empresa,
        medio_cobro_pago,
        id_cuenta_contrapartida,
    };
}

// --- NUEVO: crear póliza desde evento (genera movimientos automáticamente)


// --- NUEVO: agregar movimientos generados desde evento a una póliza existente
export async function expandEventoAndAddMovimientos(id_poliza, evento) {
    const pol = await Poliza.findByPk(id_poliza);
    if (!pol) throw httpError('Póliza no encontrada', 404);

    const movimientos = await expandEventoToMovimientos(evento);
    if (!Array.isArray(movimientos) || movimientos.length < 2) {
        throw httpError('No se cumple partida doble generada');
    }

    return sequelize.transaction(async (t) => {
        await ensurePolizaEditable(pol, t);

        const normalizados = [];
        for (const m of movimientos) {
        const { id_cuenta } = await assertCuentaPosteable(
            { id_cuenta: m.id_cuenta, codigo: m.codigo },
            t
        );
        normalizados.push({ ...m, id_cuenta, id_poliza });
        }

        await MovimientoPoliza.bulkCreate(normalizados, { transaction: t });
        return { ok: true, count: normalizados.length };
    });
}

export async function changeEstadoPoliza(id_poliza, nuevoEstado) {
    if (!['Por revisar', 'Aprobada', 'Contabilizada'].includes(nuevoEstado)) {
        throw httpError('estado inválido (Por revisar|Aprobada|Contabilizada)');
    }
    const pol = await getPoliza(id_poliza);
    await pol.update({ estado: nuevoEstado, updated_at: new Date() });
    return pol;
}

export async function changePolizaRevisada(id_poliza) {
    const pol =  await getPoliza(id_poliza);
    await pol.update({ estado: 'Aprobada', updated_at: new Date() });
    return pol;
}

export async function deletePoliza(id_poliza) {
    if (!id_poliza) throw httpError('id_poliza requerido');
    const pol = await getPoliza(id_poliza);

    return sequelize.transaction(async (t) => {
        await ensureDeletePoliza(pol, t);
        await MovimientoPoliza.destroy({ where: { id_poliza }, transaction: t });
        await pol.destroy({ transaction: t });
        return true;
    });
}

export async function addMovimientoToPoliza(id_poliza, movimientoData) {
    await getPoliza(id_poliza); // asegura que la póliza exista
    if (movimientoData.operacion !== '0' && movimientoData.operacion !== '1') {
        throw httpError('operacion inválida en movimiento (0=Haber, 1=Debe)');
    }
    if (movimientoData.monto == null) throw httpError('monto requerido en movimiento');

    if (Cuenta && movimientoData.id_cuenta) {
        const cuenta = await Cuenta.findByPk(movimientoData.id_cuenta);
        if (!cuenta) throw httpError('Cuenta no encontrada', 404);
    }

    return MovimientoPoliza.create({ ...movimientoData, id_poliza });
}

export async function addMovimientosToPoliza(id_poliza, movimientos = []) {
    await getPoliza(id_poliza);
    if (!Array.isArray(movimientos) || movimientos.length === 0) {
        throw httpError('movimientos debe ser un arreglo no vacío');
    }

    for (const m of movimientos) {
        if (m.operacion !== '0' && m.operacion !== '1') {
        throw httpError('operacion inválida en movimiento (0=Haber, 1=Debe)');
        }
        if (m.monto == null) throw httpError('monto requerido en movimiento');
    }

    return sequelize.transaction(async (t) => {
        // Validar cuenta si corresponde
        if (Cuenta) {
        const cuentaIds = [...new Set(movimientos.map(m => m.id_cuenta).filter(Boolean))];
        if (cuentaIds.length) {
            const found = await Cuenta.count({ where: { id: { [Op.in]: cuentaIds } }, transaction: t });
            if (found !== cuentaIds.length) throw httpError('Una o más cuenta no existen', 404);
        }
        }

        const rows = movimientos.map(m => ({ ...m, id_poliza }));
        await MovimientoPoliza.bulkCreate(rows, { transaction: t });
        return { ok: true, count: rows.length };
    });
}

export async function getPolizaWithMovimientos(id_poliza) {
    return getPoliza(id_poliza, { includeMovimientos: true });
}