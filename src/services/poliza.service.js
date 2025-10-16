import { Op } from 'sequelize';
import * as Models from '../models/index.js';
import { validateMovimientosPoliza, httpError } from '../utils/helper-poliza.js';
import { importCfdiXml } from './cfdi.service.js';
import { linkUuidToMovimientos } from './movimientos-uuid.service.js';

const {
    sequelize,
    Poliza,
    TipoPoliza,
    MovimientoPoliza,
    PeriodoContable,
    Usuario,
    CentroCosto,
    Cuenta,
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
        // Evita subquery cuando pagina con includes; mejora compatibilidad con col()
        subQuery: false,
        // Necesario si hay hasMany para que el count no explote por duplicados
        distinct: true,
    });

    return { data: rows, total: count, page: +page, pageSize: limit };
}

// Nuevo wrapper (opcional) que acepta { xml, linkMovimientoIds }
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
    validateMovimientosPoliza(movimientos);

    return sequelize.transaction(async (t) => {
        const pol = await Poliza.create(payload, { transaction: t });

        if (movimientos?.length) {
        // Validación ligera por cada movimiento
        for (const m of movimientos) {
            if (m.id_poliza && m.id_poliza !== pol.id_poliza) {
            throw httpError('id_poliza de movimiento no coincide con la póliza creada');
            }
            if (m.operacion !== '0' && m.operacion !== '1') {
            throw httpError('operacion inválida en movimiento (0=Haber, 1=Debe)');
            }
            if (m.monto == null) throw httpError('monto requerido en movimiento');
            // Validar cuenta si el modelo está disponible
            if (Cuenta && m.id_cuenta) {
            const cuenta = await Cuenta.findByPk(m.id_cuenta, { transaction: t });
            if (!cuenta) throw httpError('Cuenta no encontrada', 404);
            }
            if (m.uuid) {
                const cfdi = await CfdiComprobante.findOne({ where: { uuid: m.uuid }, transaction: t, lock: t.LOCK.UPDATE });
                if (!cfdi) throw httpError('CFDI no encontrado', 404);
                if (cfdi.esta_asociado) throw httpError('CFDI ya está asociado a otro movimiento', 409);
                await cfdi.update({ esta_asociado: true, updated_at: new Date() }, { transaction: t });
            }
        }

        await MovimientoPoliza.bulkCreate(
            movimientos.map(m => ({ ...m, id_poliza: pol.id_poliza })),
            { transaction: t }
        );
        }

        return pol;
    });
}

export async function updatePoliza(id_poliza, payload) {
    const pol = await getPoliza(id_poliza);
    if (payload?.estado && !['Por revisar', 'Revisada', 'Contabilizada'].includes(payload.estado)) {
        throw httpError('estado inválido (Por revisar|Revisada|Contabilizada)');
    }
    // Validaciones FK si cambian
    if (payload?.id_tipopoliza) await ensureExists(TipoPoliza, payload.id_tipopoliza, 'TipoPoliza');
    if (payload?.id_periodo) await ensureExists(PeriodoContable, payload.id_periodo, 'PeriodoContable');
    if (payload?.id_usuario) await ensureExists(Usuario, payload.id_usuario, 'Usuario');
    if (payload?.id_centro) await ensureExists(CentroCosto, payload.id_centro, 'Centro de Costo');

    await pol.update({ ...payload, updated_at: new Date() });
    return pol;
    }

    export async function changeEstadoPoliza(id_poliza, nuevoEstado) {
    if (!['Por revisar', 'Revisada', 'Contabilizada'].includes(nuevoEstado)) {
        throw httpError('estado inválido (Por revisar|Revisada|Contabilizada)');
    }
    const pol = await getPoliza(id_poliza);
    await pol.update({ estado: nuevoEstado, updated_at: new Date() });
    return pol;
}

export async function deletePoliza(id_poliza) {
    // ON DELETE CASCADE en movimientos; esto elimina hijos automáticamente
    const deleted = await Poliza.destroy({ where: { id_poliza } });
    if (!deleted) throw httpError('Póliza no encontrada', 404);
    return { ok: true };
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