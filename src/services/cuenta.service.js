// services/cuenta.service.js
 import { Cuenta } from "../models/index.js";

 class CuentaService {
   async crear(data) {
     return await Cuenta.create(data);
   }

   async listar(includeChildren = false) {
    const options = {};
    if (includeChildren) {
      options.include = [{ model: Cuenta, as: "hijos", include: [{ model: Cuenta, as: "hijos" }] }];
    }
    return await Cuenta.findAll(options);
  }

   async obtenerPorId(id) {
    return await Cuenta.findOne({ where: { id } });
   }

   async actualizar(id, data) {
     const cuenta = await this.obtenerPorId(id);
     if (!cuenta) throw new Error("Cuenta no encontrada");
     return await cuenta.update(data);
   }

   async eliminar(id) {
     const cuenta = await this.obtenerPorId(id);
     if (!cuenta) throw new Error("Cuenta no encontrada");
     return await cuenta.update({ deleted: true });
   }
 }

 export default new CuentaService();
