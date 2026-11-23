import { Router } from "express";
import { gerar } from "../controllers/relatorioController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", verificarToken, gerar);

export default router;
