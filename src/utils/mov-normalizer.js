const str = v => (typeof v === 'string' ? v.trim().toLowerCase() : v);

function mapOperacion(op) {
  if (op === '0' || op === 0) return '0';
  if (op === '1' || op === 1) return '1';

  const sop = str(op);
  if (sop === 'cargo' || sop === 'debe')  return '0';
  if (sop === 'abono' || sop === 'haber') return '1';

  return null;
}

export function normalizeMovimientosInput(
  movs = [],
  {
    defaultFecha = null,
    defaultCc = null,
  } = {}
) {
  if (!Array.isArray(movs)) return [];

  return movs.map((m, idx) => {
    const out = { ...m };

    // 1) Determinar operacion según regla fija 0=Cargo, 1=Abono
    let op = mapOperacion(out.operacion);

    // 2) Si no viene operacion, intenta por monto_debe/monto_haber
    const md = Number(out.monto_debe ?? 0);
    const mh = Number(out.monto_haber ?? 0);
    if (!op && (md > 0 || mh > 0)) {
      if (md > 0 && mh > 0) {
        throw Object.assign(
          new Error(`Fila ${idx + 1}: no puedes enviar monto_debe y monto_haber > 0 a la vez`),
          { status: 400 }
        );
      }
      op = md > 0 ? '0' : '1';
      out.monto = md > 0 ? md : mh;
    }

    // 3) Si sigue sin operación, intenta por signo de monto
    if (!op && out.monto != null) {
      const monto = Number(out.monto);
      if (Number.isFinite(monto)) {
        if (monto > 0) { op = '0'; out.monto = monto; } 
        else if (monto < 0) { op = '1'; out.monto = Math.abs(monto); } 
      }
    }

    if (!op) {
      throw Object.assign(new Error(`Fila ${idx + 1}: no se pudo determinar 'operacion'`), { status: 400 });
    }

    out.operacion = op;

    // 4) Defaults de fecha/cc si faltan
    if (!out.fecha && defaultFecha) out.fecha = defaultFecha;
    if (out.cc == null && defaultCc != null) out.cc = defaultCc;

    // 5) Limpieza
    delete out.monto_debe;
    delete out.monto_haber;

    return out;
  });
}