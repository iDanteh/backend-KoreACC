import { getMayorByPeriodRange } from '../../services/reports/balanzaComprobacion.service.js';
import ExcelJS from 'exceljs';
import { getEmpresaInfo } from '../../utils/empresainfo.js';
import { todayISO } from '../../utils/helpers-fecha-utc.js';

export async function mayorPorPeriodo(req, res) {
  try {
    const periodoIni = parseInt(req.query.periodo_ini, 10);
    const periodoFin = parseInt(req.query.periodo_fin, 10);

    if (Number.isNaN(periodoIni) || Number.isNaN(periodoFin)) {
      return res.status(400).json({ error: 'Parámetros inválidos: periodo_ini y periodo_fin deben ser enteros.' });
    }
    if (periodoIni > periodoFin) {
      return res.status(400).json({ error: 'El periodo inicial no puede ser mayor que el final.' });
    }

    const data = await getMayorByPeriodRange({ periodoIni, periodoFin });
    return res.json({ ok: true, count: data.length, data });
  } catch (err) {
    console.error('Error en mayorPorPeriodo:', err);
    return res.status(500).json({ ok: false, error: 'Error interno al generar el reporte.' });
  }
}

export async function exportBalanza(req, res) {
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

    const rows = await getMayorByPeriodRange({ periodoIni, periodoFin });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'KoreACC';
    wb.created = new Date();

    const ws = wb.addWorksheet('Balanza');

    const headerRows = [];

    headerRows.push([EMPRESA.razon_social ?? '']);
    headerRows.push([`RFC: ${EMPRESA.rfc ?? ''}`]);

    if (EMPRESA.domicilio_fiscal) headerRows.push([`Domicilio: ${EMPRESA.domicilio_fiscal}`]);

    const contactoParts = [];
    if (EMPRESA.telefono) contactoParts.push(`Tel: ${EMPRESA.telefono}`);
    if (EMPRESA.correo_contacto) contactoParts.push(`Correo: ${EMPRESA.correo_contacto}`);
    if (contactoParts.length) headerRows.push([contactoParts.join('   ')]);
    headerRows.push(['']);

    headerRows.push(['Balanza de comprobación']);
    headerRows.push([`Periodos: p${periodoIni} a p${periodoFin}`]);
    headerRows.push([`Fecha de generación: ${todayISO()}`]);
    headerRows.push(['']);

    for (const r of headerRows) ws.addRow(r);
    const headerLines = headerRows.length;

    const titleRowNumber = headerRows.findIndex(r => r[0] === 'Balanza de comprobación') + 1;
    if (titleRowNumber > 0) {
      const cell = ws.getCell(titleRowNumber, 1);
      cell.font = { bold: true, size: 16 };
      cell.alignment = { horizontal: 'left' };
    }

    const HEAD = [
      'Código',
      'Nombre',
      'Saldo inicial deudor',
      'Saldo inicial acreedor',
      'Cargos',
      'Abonos',
      'Saldo final deudor',
      'Saldo final acreedor',
    ];

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

    const numFmt = '#,##0.00';

    for (const r of rows) {
      const row = ws.addRow([
        r.codigo ?? '',
        r.nombre ?? '',
        Number(r.saldo_inicial_deudor ?? 0),
        Number(r.saldo_inicial_acreedor ?? 0),
        Number(r.cargos ?? 0),
        Number(r.abonos ?? 0),
        Number(r.saldo_final_deudor ?? 0),
        Number(r.saldo_final_acreedor ?? 0),
      ]);

      for (let c = 3; c <= 8; c++) {
        row.getCell(c).numFmt = numFmt;
        row.getCell(c).alignment = { horizontal: 'right' };
      }
    }
    const sum = (key) => rows.reduce((s, x) => s + Number(x?.[key] ?? 0), 0);

    const totalsRow = ws.addRow([
      'TOTALES',
      '',
      sum('saldo_inicial_deudor'),
      sum('saldo_inicial_acreedor'),
      sum('cargos'),
      sum('abonos'),
      sum('saldo_final_deudor'),
      sum('saldo_final_acreedor'),
    ]);

    totalsRow.font = { bold: true };
    totalsRow.eachCell((cell, col) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.alignment = { horizontal: col >= 3 ? 'right' : 'left' };
    });
    for (let c = 3; c <= 8; c++) totalsRow.getCell(c).numFmt = numFmt;

    const headRowNumber = headerLines + 1;
    ws.autoFilter = {
      from: { row: headRowNumber, column: 1 },
      to: { row: headRowNumber, column: HEAD.length },
    };
    ws.views = [{ state: 'frozen', ySplit: headRowNumber }];

    ws.getColumn(1).width = 16; 
    ws.getColumn(2).width = 45;
    for (let i = 3; i <= 8; i++) ws.getColumn(i).width = 18;

    const empresaSlug = (EMPRESA.razon_social ?? 'empresa').replace(/[^\w\d]+/g, '_');
    const filename = `${empresaSlug}_BalanzaComprobacion_p${periodoIni}-p${periodoFin}_${todayISO()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportando balanza:', error);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, message: 'Error exportando balanza de comprobación' });
    }
    res.end();
  }
}