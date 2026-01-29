import cuentaService from "../services/cuenta.service.js";
import { Cuenta } from '../models/index.js';
import ExcelJS from 'exceljs';
import XLSX from 'xlsx';
import { sequelize } from "../config/db.js";
import { todayISO } from '../utils/helpers-fecha-utc.js';

const mapSequelizeError = (error, res) => {
  // Unique constraint -> 409
  if (error?.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      error: "El valor de un campo único ya existe (p.ej. 'codigo').",
      details: error.errors?.map(e => ({ path: e.path, message: e.message })),
    });
  }
  // Validaciones -> 400
  if (error?.name === "SequelizeValidationError") {
    return res.status(400).json({
      error: "Datos inválidos.",
      details: error.errors?.map(e => ({ path: e.path, message: e.message })),
    });
  }
  // Por defecto -> 500
  return res.status(500).json({ error: error.message });
};

export const crearCuenta = async (req, res) => {
  try {
    const cuenta = await cuentaService.crear(req.body);
    // Mantengo 200 para no romper clientes (si quieres, cambiamos a 201 Created)
    res.json(cuenta);
  } catch (error) {
    mapSequelizeError(error, res);
  }
};

export const listarCuentas = async (_req, res) => {
  try {
    const cuentas = await cuentaService.listar();
    res.json(cuentas);
  } catch (error) {
    mapSequelizeError(error, res);
  }
};

export const obtenerCuenta = async (req, res) => {
  try {
    const cuenta = await cuentaService.obtenerPorId(req.params.id);
    if (!cuenta) return res.status(404).json({ message: "Cuenta no encontrada" });
    res.json(cuenta);
  } catch (error) {
    mapSequelizeError(error, res);
  }
};

export const actualizarCuenta = async (req, res) => {
  try {
    const cuenta = await cuentaService.actualizar(req.params.id, req.body);
    res.json(cuenta);
  } catch (error) {
    if (error.message === "Cuenta no encontrada") {
      return res.status(404).json({ message: "Cuenta no encontrada" });
    }
    mapSequelizeError(error, res);
  }
};

export const eliminarCuenta = async (req, res) => {
  try {
    await cuentaService.eliminar(req.params.id);
    res.json({ message: "Cuenta eliminada (lógicamente)" });
  } catch (error) {
    if (error.message === "Cuenta no encontrada") {
      return res.status(404).json({ message: "Cuenta no encontrada" });
    }
    mapSequelizeError(error, res);
  }
};

function yn(v) { return v ? 'Sí' : 'No'; }

export async function exportCuentasXlsx(req, res) {
  try {
    const cuentas = await Cuenta.findAll({
      where: { deleted: false },
      order: [['codigo', 'ASC']],
      raw: true,
    });

    const porId = new Map(cuentas.map(c => [c.id, c]));

    const rows = cuentas.map(c => {
      const p = c.parentId ? porId.get(c.parentId) : null;
      return {
        codigo: c.codigo ?? '',
        nombre: c.nombre ?? '',
        ctaMayor: yn(!!c.ctaMayor),
        posteable: yn(!!c.posteable),
        tipo: c.tipo ?? '',
        naturaleza: c.naturaleza ?? '',
        padreCodigo: p?.codigo ?? '',
        padreNombre: p?.nombre ?? '',
      };
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'KoreACC';
    wb.created = new Date();
    const ws = wb.addWorksheet('Cuentas');

    ws.addRow(['Catálogo de cuentas']);
    ws.addRow([`Fecha de generación: ${todayISO()}`]);
    ws.addRow(['']);
    const headerLines = ws.rowCount;

    const HEAD = ['Código', 'Nombre', '¿Mayor?', 'Posteable', 'Tipo', 'Naturaleza', 'Padre (Código)', 'Padre (Nombre)'];
    const headRow = ws.addRow(HEAD);

    headRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        left: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        right: { style: 'thin', color: { argb: 'FFAAAAAA' } },
      };
    });

    for (const r of rows) {
      ws.addRow([
        r.codigo, r.nombre, r.ctaMayor, r.posteable, r.tipo, r.naturaleza, r.padreCodigo, r.padreNombre
      ]);
    }

    const headRowNumber = headerLines + 1;
    ws.autoFilter = { from: { row: headRowNumber, column: 1 }, to: { row: headRowNumber, column: HEAD.length } };
    ws.views = [{ state: 'frozen', ySplit: headRowNumber }];

    ws.getColumn(1).width = 16;
    ws.getColumn(2).width = 45;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 12;
    ws.getColumn(5).width = 14;
    ws.getColumn(6).width = 14;
    ws.getColumn(7).width = 16;
    ws.getColumn(8).width = 45;

    const filename = `catalogo_cuentas_${todayISO()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('exportCuentasXlsx ERROR:', err);

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        message: err?.message ?? 'Error exportando cuentas',
        parent: err?.parent?.message ?? null,
      });
    }
    res.end();
  }
}

const TIPO_OPTS = ['ACTIVO','PASIVO','CAPITAL','INGRESO','GASTO'];
const NAT_OPTS  = ['DEUDORA','ACREEDORA']; 

const norm = (v) => (v ?? '').toString().trim();
const toBool = (s) => {
  const v = norm(s).toLowerCase();
  return v === 'sí' || v === 'si' || v === 'true' || v === '1';
};

function getCellByHeader(rowObj, header) {
  return rowObj[header];
}

export async function importCuentasXlsx(req, res) {
  const file = req.file;
  if (!file) return res.status(400).json({ ok: false, message: 'Archivo requerido (.xlsx)' });

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file.buffer);

    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ ok: false, message: 'El archivo no tiene hojas' });

    let headerRowNumber = null;
    for (let r = 1; r <= Math.min(ws.rowCount, 30); r++) {
      const values = ws.getRow(r).values?.map?.(x => norm(x)) ?? [];
      if (values.includes('Código') && values.includes('Nombre')) {
        headerRowNumber = r;
        break;
      }
    }
    if (!headerRowNumber) {
      return res.status(400).json({ ok: false, message: 'No se encontró encabezado (Código/Nombre)' });
    }

    const headerRow = ws.getRow(headerRowNumber);
    const headerMap = new Map();
    headerRow.eachCell((cell, col) => headerMap.set(norm(cell.value), col));

    const requiredHeaders = ['Código','Nombre','¿Mayor?','Posteable','Tipo','Naturaleza','Padre (Código)'];
    for (const h of requiredHeaders) {
      if (!headerMap.has(h)) {
        return res.status(400).json({ ok:false, message:`Falta columna requerida: ${h}` });
      }
    }

    const excelRows = [];
    for (let r = headerRowNumber + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const codigo = norm(row.getCell(headerMap.get('Código')).value);
      const nombre = norm(row.getCell(headerMap.get('Nombre')).value);

      if (!codigo && !nombre) continue;

      const mayorStr = norm(row.getCell(headerMap.get('¿Mayor?')).value);
      const posteableStr = norm(row.getCell(headerMap.get('Posteable')).value);
      const tipo = norm(row.getCell(headerMap.get('Tipo')).value);
      const naturaleza = norm(row.getCell(headerMap.get('Naturaleza')).value);
      const parentCodigo = norm(row.getCell(headerMap.get('Padre (Código)')).value) || null;

      excelRows.push({
        rowNumber: r,
        codigo,
        nombre,
        ctaMayor: toBool(mayorStr),
        posteable: toBool(posteableStr),
        tipo,
        naturaleza,
        parentCodigo,
      });
    }

    if (!excelRows.length) {
      return res.status(400).json({ ok:false, message:'El archivo no contiene filas para importar.' });
    }

    const invalid = excelRows.filter(c =>
      !c.codigo || !c.nombre || !TIPO_OPTS.includes(c.tipo) || !NAT_OPTS.includes(c.naturaleza)
    );
    if (invalid.length) {
      return res.status(400).json({
        ok: false,
        message: `Hay ${invalid.length} filas inválidas (código, nombre, tipo o naturaleza).`,
        invalid: invalid.slice(0, 20).map(x => ({ row: x.rowNumber, codigo: x.codigo, tipo: x.tipo, naturaleza: x.naturaleza })),
      });
    }

    const result = await sequelize.transaction(async (t) => {
      const existentes = await Cuenta.findAll({
        attributes: ['id','codigo'],
        where: { deleted: false },
        raw: true,
        transaction: t,
      });

      const codigoToId = new Map(existentes.map(x => [x.codigo, x.id]));

      const created = [];
      const skipped = [];
      const errors = [];

      for (const c of excelRows.filter(x => !x.parentCodigo)) {
        if (codigoToId.has(c.codigo)) {
          skipped.push({ codigo: c.codigo, reason: 'Ya existe' });
          continue;
        }
        const newCuenta = await Cuenta.create({
          codigo: c.codigo,
          nombre: c.nombre,
          ctaMayor: c.ctaMayor,
          posteable: c.posteable,
          tipo: c.tipo,
          naturaleza: c.naturaleza,
          parentId: null,
        }, { transaction: t });

        codigoToId.set(c.codigo, newCuenta.id);
        created.push({ codigo: c.codigo, id: newCuenta.id });
      }

      const pendientes = excelRows.filter(x => !!x.parentCodigo);
      let safety = 0;

      while (pendientes.length && safety < 10) {
        safety++;
        let progressed = false;

        for (let i = pendientes.length - 1; i >= 0; i--) {
          const c = pendientes[i];

          if (codigoToId.has(c.codigo)) {
            skipped.push({ codigo: c.codigo, reason: 'Ya existe' });
            pendientes.splice(i, 1);
            progressed = true;
            continue;
          }

          const parentId = codigoToId.get(c.parentCodigo);
          if (!parentId) continue;

          const newCuenta = await Cuenta.create({
            codigo: c.codigo,
            nombre: c.nombre,
            ctaMayor: c.ctaMayor,
            posteable: c.posteable,
            tipo: c.tipo,
            naturaleza: c.naturaleza,
            parentId,
          }, { transaction: t });

          codigoToId.set(c.codigo, newCuenta.id);
          created.push({ codigo: c.codigo, id: newCuenta.id });
          pendientes.splice(i, 1);
          progressed = true;
        }

        if (!progressed) break;
      }

      for (const c of pendientes) {
        errors.push({ codigo: c.codigo, parentCodigo: c.parentCodigo, reason: 'Padre no encontrado en archivo/BD' });
      }

      return { created, skipped, errors };
    });

    return res.json({
      ok: true,
      created: result.created.length,
      skipped: result.skipped.length,
      errors: result.errors.length,
      detail: result,
    });
  } catch (err) {
    console.error('importCuentasXlsx:', err);
    return res.status(500).json({ ok: false, message: 'Error importando cuentas' });
  }
}