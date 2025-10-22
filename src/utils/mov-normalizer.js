const str = v => (typeof v === 'string' ? v.trim().toLowerCase() : v);

function mapOperacion(op, uiCargoEs0 = true) {
  // Si vienen desde tu UI actual (que muestra "Cargo=0 / Abono=1"), invierte para backend:
  // backend: 1=Debe, 0=Haber
  if (op === '0' || op === 0) return uiCargoEs0 ? '1' : '0';
  if (op === '1' || op === 1) return uiCargoEs0 ? '0' : '1';

  const sop = str(op);
  if (sop === 'cargo' || sop === 'debe')  return '1';
  if (sop === 'abono' || sop === 'haber') return '0';

  return null; // no determinable
}

export function normalizeMovimientosInput(movs = [], {
  defaultFecha = null,
  defaultCc = null,
  uiCargoEs0 = true, // tu UI actual muestra "Cargo" como '0'
} = {}) {
  if (!Array.isArray(movs)) return [];

  return movs.map((m, idx) => {
    const out = { ...m };

    // 1) Determinar operacion
    let op = mapOperacion(out.operacion, uiCargoEs0);

    // 2) Si no viene operacion, intenta por monto_debe/monto_haber
    const md = Number(out.monto_debe ?? 0);
    const mh = Number(out.monto_haber ?? 0);
    if (!op && (md > 0 || mh > 0)) {
      if (md > 0 && mh > 0) {
        throw Object.assign(new Error(`Fila ${idx+1}: no puedes enviar monto_debe y monto_haber > 0 a la vez`), { status: 400 });
      }
      op = md > 0 ? '1' : '0';
      out.monto = md > 0 ? md : mh;
    }

    // 3) Si sigue sin operacion, intenta por signo de monto
    if (!op && out.monto != null) {
      const monto = Number(out.monto);
      if (Number.isFinite(monto)) {
        if (monto > 0) { op = '1'; out.monto = monto; }
        else if (monto < 0) { op = '0'; out.monto = Math.abs(monto); }
      }
    }

    if (!op) {
      throw Object.assign(new Error(`Fila ${idx+1}: no se pudo determinar 'operacion'`), { status: 400 });
    }
    out.operacion = op; // '1' Debe, '0' Haber

    // 4) Defaults de fecha/cc si faltan
    if (!out.fecha && defaultFecha) out.fecha = defaultFecha;
    if (out.cc == null && defaultCc != null) out.cc = defaultCc;

    // 5) Limpiar campos alternativos para no confundir validaciones
    delete out.monto_debe;
    delete out.monto_haber;

    return out;
  });
}