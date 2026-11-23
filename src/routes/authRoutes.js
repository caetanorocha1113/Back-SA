import { Router } from "express";
import { login, refresh, logout, perfil } from "../controllers/authController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", verificarToken, logout);
router.get("/perfil", verificarToken, perfil);

export default router;
