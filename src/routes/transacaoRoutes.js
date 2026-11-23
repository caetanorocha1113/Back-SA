import { Router } from "express";
import { listar, buscarPorId, criar, atualizar, excluir } from "../controllers/transacaoController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = Router();

router.use(verificarToken);

router.get("/", listar);
router.get("/:id", buscarPorId);
router.post("/", criar);
router.put("/:id", atualizar);
router.delete("/:id", excluir);

export default router;
