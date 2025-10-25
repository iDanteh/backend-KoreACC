import { CuentaFlujo } from '../utils/cuentas.config.js';
import { getImpuestosVigentes } from '../utils/impuestos.helper.js';

/**
 * @typedef {Object} Evento
 * @property {'ingreso'|'egreso'} tipo_operacion
 * @property {number} monto_base
 * @property {string} fecha_operacion // 'YYYY-MM-DD'
 * @property {number} id_centro
 * @property {number} id_empresa
 * @property {'bancos'|'caja'|'clientes'|'proveedores'} medio_cobro_pago
 * @property {number} id_cuenta_contrapartida 
 */

export async function expandEventoToMovimientos(evento) {
    const {
        tipo_operacion, monto_base, fecha_operacion, id_centro,
        id_empresa, medio_cobro_pago, id_cuenta_contrapartida
    } = evento;

    if (!['ingreso', 'egreso'].includes(tipo_operacion)) {
        throw new Error('tipo_operacion inválido');
    }
    if (!(monto_base >= 0)) throw new Error('monto_base inválido');

    // 1) Cuenta de flujo
    const cuentaFlujo = CuentaFlujo[medio_cobro_pago];
    if (!cuentaFlujo) throw new Error('medio_cobro_pago inválido');

    // 2) Impuestos vigentes según operación/fecha
    const aplicaEn = (tipo_operacion === 'ingreso') ? 'VENTA' : 'COMPRA';
    const impuestos = await getImpuestosVigentes({
        id_empresa, aplicaEn, fecha: fecha_operacion
    });

    const impuestosTasa  = impuestos.filter(i => i.modo === 'TASA'  && i.tasa  != null);
    const impuestosCuota = impuestos.filter(i => i.modo === 'CUOTA' && i.cuota != null);

    // 3) Cálculos
    const base = Number(monto_base);
    const sumImpuestosTasa = impuestosTasa.reduce((acc, it) => acc + Number(it.tasa || 0), 0);
    const sumImpuestosCuota = impuestosCuota.reduce((acc, it) => acc + Number(it.cuota || 0), 0);

    const impPorTasa  = base * (sumImpuestosTasa / 100);
    const impPorCuota = sumImpuestosCuota;
    const totalImpuestos = round2(impPorTasa + impPorCuota);
    const total = round2(base + totalImpuestos);

    const movimientos = [];

    if (tipo_operacion === 'ingreso') {
        // Debe: Flujo por total
        movimientos.push(mov({ id_cuenta: cuentaFlujo, operacion: '0', monto: total, fecha: fecha_operacion, cc: id_centro }));
        // Haber: Ingreso (contrapartida)
        movimientos.push(mov({ id_cuenta: id_cuenta_contrapartida, operacion: '1', monto: round2(base), fecha: fecha_operacion, cc: id_centro }));
        // Haber: Impuestos trasladados
        for (const imp of impuestos) {
        const montoImp = montoImpuesto(imp, base);
        if (montoImp !== 0 && imp.id_cuenta) {
            movimientos.push(mov({ id_cuenta: imp.id_cuenta, operacion: '1', monto: montoImp, fecha: fecha_operacion, cc: id_centro }));
        }
        }
    } else {
        // Egreso
        // Debe: Gasto/compra (contrapartida)
        movimientos.push(mov({ id_cuenta: id_cuenta_contrapartida, operacion: '0', monto: round2(base), fecha: fecha_operacion, cc: id_centro }));
        // Debe: Impuestos acreditables
        for (const imp of impuestos) {
        const montoImp = montoImpuesto(imp, base);
        if (montoImp !== 0 && imp.id_cuenta) {
            movimientos.push(mov({ id_cuenta: imp.id_cuenta, operacion: '0', monto: montoImp, fecha: fecha_operacion, cc: id_centro }));
        }
        }
        // Haber: Flujo por total a pagar
        movimientos.push(mov({ id_cuenta: cuentaFlujo, operacion: '1', monto: round2(base + totalImpuestos), fecha: fecha_operacion, cc: id_centro }));
    }

    // 4) Balanceo por redondeo
    balancearCentavos(movimientos);

    return movimientos;
}

// — helpers —
function montoImpuesto(imp, base) {
    if (imp.modo === 'TASA'  && imp.tasa)  return round2(base * (Number(imp.tasa) / 100));
    if (imp.modo === 'CUOTA' && imp.cuota) return round2(Number(imp.cuota));
    return 0;
}
function mov({ id_cuenta, operacion, monto, fecha, cc }) {
    return {
        id_cuenta, operacion, monto: round2(monto), fecha, cc,
        ref_serie_venta: null, cliente: null, uuid: null,
    };
}
function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function balancearCentavos(movs) {
    const debe = movs.filter(m => m.operacion === '0').reduce((a, m) => a + m.monto, 0);
    const haber = movs.filter(m => m.operacion === '1').reduce((a, m) => a + m.monto, 0);
    const diff = round2(debe - haber);
    if (diff === 0) return;
    if (diff > 0) {
        const idx = movs.findIndex(m => m.operacion === '1');
        if (idx >= 0) movs[idx].monto = round2(movs[idx].monto + diff);
    } else {
        const idx = movs.findIndex(m => m.operacion === '0');
        if (idx >= 0) movs[idx].monto = round2(movs[idx].monto + Math.abs(diff));
    }
}