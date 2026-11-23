import { Router } from "express";
import { resumo } from "../controllers/dashboardController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", verificarToken, resumo);

export default router;
