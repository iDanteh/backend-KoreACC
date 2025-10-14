export function httpError(message, status = 400) {
    return Object.assign(new Error(message), { status });
}

// Fuerza a que sea número con 2 decimales
function toNumber2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// 0 = cargo (Debe), 1 = abono (Haber)
export function validateMovimientosPoliza(movimientos = []) {
    if (!Array.isArray(movimientos) || movimientos.length < 2) {
        throw httpError('La póliza debe tener al menos 2 movimientos');
    }

    let totalCargo = 0;
    let totalAbono = 0;
    let tieneCargo = false;
    let tieneAbono = false;

    for (const m of movimientos) {
        if (m.operacion !== '0' && m.operacion !== '1') {
        throw httpError('operacion inválida en movimiento (0=cargo/Debe, 1=abono/Haber)');
        }
        if (m.monto == null) throw httpError('monto requerido en movimiento');
        const monto = toNumber2(m.monto);
        if (monto <= 0) throw httpError('monto debe ser mayor a 0');

        if (m.operacion === '0') {
        totalCargo += monto; // Debe
        tieneCargo = true;
        } else {
        totalAbono += monto; // Haber
        tieneAbono = true;
        }
    }

    totalCargo = toNumber2(totalCargo);
    totalAbono = toNumber2(totalAbono);

    if (!tieneCargo || !tieneAbono) {
        throw httpError('Debe existir al menos un cargo (0) y un abono (1)');
    }
    if (totalCargo !== totalAbono) {
        throw httpError(`La póliza no cuadra: Debe=${totalCargo} vs Haber=${totalAbono}`);
    }

    return { totalCargo, totalAbono };
}
