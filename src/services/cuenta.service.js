// services/cuenta.service.js
import { Cuenta } from "../models/index.js";

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
    if (!cuenta) throw new Error("Cuenta no encontrada");
    return await cuenta.update({ deleted: true });
  }

  // ---------------------------------------------------------
  //  NUEVO: Obtener TODAS las cuentas en forma de ÁRBOL real
  // ---------------------------------------------------------
  async obtenerArbol() {
    // 1) Traer todas
    const rows = await Cuenta.findAll({
      order: [["codigo", "ASC"]],
      raw: true,
    });

    // 2) Mapearlas por ID
    const porId = new Map();
    rows.forEach((row) => {
      porId.set(row.id, { ...row, hijos: [] });
    });

    const raices = [];

    // 3) Construir el árbol
    porId.forEach((cuenta) => {
      if (cuenta.parentId) {
        const padre = porId.get(cuenta.parentId);
        if (padre) {
          padre.hijos.push(cuenta);
        } else {
          // Si el padre no existe = raíz huérfana
          raices.push(cuenta);
        }
      } else {
        // Sin parentId → raíz del árbol
        raices.push(cuenta);
      }
    });

    return raices;   // este es el árbol final
  }
}

export default new CuentaService();
