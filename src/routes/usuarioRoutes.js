import { Router } from "express";
import { criar, listar, buscarPorId, atualizar, excluir } from "../controllers/usuarioController.js";
import { verificarToken, permitirPerfis } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", criar);
router.get("/", verificarToken, permitirPerfis("admin"), listar);
router.get("/:id", verificarToken, buscarPorId);
router.put("/:id", verificarToken, atualizar);
router.delete("/:id", verificarToken, permitirPerfis("admin"), excluir);

export default router;
