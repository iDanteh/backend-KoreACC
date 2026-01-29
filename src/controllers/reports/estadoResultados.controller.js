import { getEstadoResultados } from '../../services/reports/estadoResultados.service.js';
import ExcelJS from 'exceljs';
import { getEmpresaInfo } from '../../utils/empresainfo.js';
import { todayISO } from '../../utils/helpers-fecha-utc.js';

export async function estadoResultados(req, res) {
  try {
    const periodoIni = parseInt(req.query.periodo_ini, 10);
    const periodoFin = parseInt(req.query.periodo_fin, 10);

    if (Number.isNaN(periodoIni) || Number.isNaN(periodoFin)) {
      return res.status(400).json({ error: 'periodo_ini y periodo_fin deben ser enteros.' });
    }
    if (periodoIni > periodoFin) {
      return res.status(400).json({ error: 'El periodo inicial no puede ser mayor que el final.' });
    }

    const data = await getEstadoResultados({ periodoIni, periodoFin });
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('Error en estadoResultados:', err);
    return res.status(500).json({ ok: false, error: 'Error interno al generar el estado de resultados.' });
  }
}

export async function exportEstadoRes(req, res) {
  try {
    const periodoIni = Number.parseInt(req.query.periodoIni, 10);
    const periodoFin = Number.parseInt(req.query.periodoFin, 10);

    if (Number.isNaN(periodoIni) || Number.isNaN(periodoFin)) {
      return res.status(400).json({ ok: false, message: 'periodoIni/periodoFin inválidos' });
    }
    if (periodoFin < periodoIni) {
      return res.status(400).json({ ok: false, message: 'Rango de periodos inválido' });
    }

    const EMPRESA = await getEmpresaInfo();
    if (!EMPRESA) {
      return res.status(500).json({ ok: false, message: 'Empresa no encontrada (id=1)' });
    }

    const payload = await getEstadoResultados({ periodoIni, periodoFin });
    const resumen = payload?.resumen ?? {};
    const detalle = Array.isArray(payload?.detalle) ? payload.detalle : [];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'KoreACC';
    wb.created = new Date();

    const ws = wb.addWorksheet('EstadoResultados');

    const headerRows = [];
    headerRows.push([EMPRESA.razon_social ?? '']);
    headerRows.push([`RFC: ${EMPRESA.rfc ?? ''}`]);

    if (EMPRESA.domicilio_fiscal) headerRows.push([`Domicilio: ${EMPRESA.domicilio_fiscal}`]);

    const contactoParts = [];
    if (EMPRESA.telefono) contactoParts.push(`Tel: ${EMPRESA.telefono}`);
    if (EMPRESA.correo_contacto) contactoParts.push(`Correo: ${EMPRESA.correo_contacto}`);
    if (contactoParts.length) headerRows.push([contactoParts.join('   ')]);
    headerRows.push(['']);

    headerRows.push(['Estado de resultados']);
    headerRows.push([`Periodos: p${periodoIni} a p${periodoFin}`]);
    headerRows.push([`Fecha de generación: ${todayISO()}`]);
    headerRows.push(['']);

    for (const r of headerRows) ws.addRow(r);
    const headerLines = headerRows.length;

    const titleRowNumber = headerRows.findIndex(r => r[0] === 'Estado de resultados') + 1;
    if (titleRowNumber > 0) {
      const cell = ws.getCell(titleRowNumber, 1);
      cell.font = { bold: true, size: 16 };
      cell.alignment = { horizontal: 'left' };
    }

    const numFmt = '#,##0.00';

    ws.addRow(['RESUMEN']);
    const resumenTitleRow = ws.lastRow;
    resumenTitleRow.font = { bold: true };

    const resumenStartRow = ws.lastRow.number + 1;

    const resumenRows = [
      ['Ingresos', Number(resumen.ingresos ?? 0)],
      ['Costos', Number(resumen.costos ?? 0)],
      ['Utilidad bruta', Number(resumen.utilidad_bruta ?? 0)],
      ['Gastos de operación', Number(resumen.gastos_operacion ?? 0)],
      ['Utilidad neta', Number(resumen.utilidad_neta ?? 0)],
    ];

    for (const [k, v] of resumenRows) {
      const r = ws.addRow([k, v]);
      r.getCell(2).numFmt = numFmt;
      r.getCell(2).alignment = { horizontal: 'right' };
    }

    const utilNetaRow = ws.getRow(resumenStartRow + 4);
    utilNetaRow.font = { bold: true };
    utilNetaRow.getCell(2).font = { bold: true };
    utilNetaRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

    ws.addRow(['']);

    ws.addRow(['DETALLE']);
    ws.lastRow.font = { bold: true };

    const HEAD = ['Tipo', 'Código', 'Nombre', 'Cargos', 'Abonos', 'Importe'];
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

    const detalleStartHeadRowNumber = headRow.number;

    for (const d of detalle) {
      const row = ws.addRow([
        d.tipo_er ?? '',
        d.codigo ?? '',
        d.nombre ?? '',
        Number(d.cargos_per ?? 0),
        Number(d.abonos_per ?? 0),
        Number(d.importe ?? 0),
      ]);

      for (let c = 4; c <= 6; c++) {
        row.getCell(c).numFmt = numFmt;
        row.getCell(c).alignment = { horizontal: 'right' };
      }
    }

    const sumByTipo = (tipo) =>
      detalle
        .filter(x => x.tipo_er === tipo)
        .reduce((s, x) => s + Number(x.importe ?? 0), 0);

    const subIngresos = sumByTipo('INGRESO');
    const subCostos   = sumByTipo('COSTO');
    const subGastos   = sumByTipo('GASTO');

    ws.addRow(['']);
    const subRow1 = ws.addRow(['Subtotal INGRESO', '', '', '', '', subIngresos]);
    const subRow2 = ws.addRow(['Subtotal COSTO',   '', '', '', '', subCostos]);
    const subRow3 = ws.addRow(['Subtotal GASTO',   '', '', '', '', subGastos]);

    for (const r of [subRow1, subRow2, subRow3]) {
      r.font = { bold: true };
      r.getCell(6).numFmt = numFmt;
      r.getCell(6).alignment = { horizontal: 'right' };
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      });
    }

    ws.autoFilter = {
      from: { row: detalleStartHeadRowNumber, column: 1 },
      to: { row: detalleStartHeadRowNumber, column: HEAD.length },
    };
    ws.views = [{ state: 'frozen', ySplit: detalleStartHeadRowNumber }];

    ws.getColumn(1).width = 14; 
    ws.getColumn(2).width = 16; 
    ws.getColumn(3).width = 50; 
    ws.getColumn(4).width = 16; 
    ws.getColumn(5).width = 16; 
    ws.getColumn(6).width = 16; 

    const empresaSlug = (EMPRESA.razon_social ?? 'empresa').replace(/[^\w\d]+/g, '_');
    const filename = `${empresaSlug}_EstadoResultados_p${periodoIni}-p${periodoFin}_${todayISO()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportando estado de resultados:', error);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, message: 'Error exportando estado de resultados' });
    }
    res.end();
  }
}