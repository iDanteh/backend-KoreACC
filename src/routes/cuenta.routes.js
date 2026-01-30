import express from "express";
import * as cuentaController from "../controllers/cuenta.controller.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.get("/export.xlsx", cuentaController.exportCuentasXlsx);
router.get("/export.pdf", cuentaController.exportCuentasPDF);
router.post("/import.xlsx", upload.single('file'), cuentaController.importCuentasXlsx);

router.post("/", cuentaController.crearCuenta);
router.get("/", cuentaController.listarCuentas);
router.get("/:id", cuentaController.obtenerCuenta);
router.put("/:id", cuentaController.actualizarCuenta);
router.delete("/:id", cuentaController.eliminarCuenta);
export default router;
