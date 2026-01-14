import { Cuenta, MovimientoPoliza } from "../models/index.js";
import { httpError } from "../utils/helper-poliza.js";

class CuentaService {
  // Crear
  async crear(data) {
    return await Cuenta.create(data);
  }

  // Listar normal (plano) o con un nivel de hijos
  async listar(includeChildren = false) {
    const options = {};
    if (includeChildren) {
      options.include = [
        { 
          model: Cuenta, 
          as: "hijos",
          include: [{ model: Cuenta, as: "hijos" }] // dos niveles
        }
      ];
    }
    return await Cuenta.findAll(options);
  }

  // Obtener por ID
  async obtenerPorId(id) {
    return await Cuenta.findOne({ where: { id } });
  }

  // Actualizar
  async actualizar(id, data) {
    const cuenta = await this.obtenerPorId(id);
    if (!cuenta) throw new Error("Cuenta no encontrada");
    return await cuenta.update(data);
  }

  // Eliminación lógica
  async eliminar(id) {
    const cuenta = await this.obtenerPorId(id);

    const movimientos = await MovimientoPoliza.findOne({ where: { cuentaId: id } });
    if (movimientos) {
      throw httpError('No se puede eliminar la cuenta porque tiene movimientos asociados', 409);
    }

    if (!cuenta) throw new Error("Cuenta no encontrada");
    return await cuenta.update({ deleted: true });
  }

  async obtenerArbol() {
    const rows = await Cuenta.findAll({
      order: [["codigo", "ASC"]],
      raw: true,
    });

    const porId = new Map();
    rows.forEach((row) => {
      porId.set(row.id, { ...row, hijos: [] });
    });

    const raices = [];

    porId.forEach((cuenta) => {
      if (cuenta.parentId) {
        const padre = porId.get(cuenta.parentId);
        if (padre) {
          padre.hijos.push(cuenta);
        } else {
          raices.push(cuenta);
        }
      } else {
        raices.push(cuenta);
      }
    });

    return raices;
  }
}

export default new CuentaService();
