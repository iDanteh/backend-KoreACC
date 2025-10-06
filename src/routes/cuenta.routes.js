import express from "express";
import * as cuentaController from "../controllers/cuenta.controller.js"; // si tu controller también es ESM

const router = express.Router();

router.post("/", cuentaController.crearCuenta);
router.get("/", cuentaController.listarCuentas);
router.get("/:id", cuentaController.obtenerCuenta);
router.put("/:id", cuentaController.actualizarCuenta);
router.delete("/:id", cuentaController.eliminarCuenta);

export default router;
