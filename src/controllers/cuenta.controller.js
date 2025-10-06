import cuentaService from "../services/cuenta.service.js";

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
