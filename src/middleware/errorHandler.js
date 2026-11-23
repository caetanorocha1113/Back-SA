import { AppError } from "../utils/AppError.js";

export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

export function tratarErros(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ erro: error.message });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido no corpo da requisição." });
  }

  if (error.code === "P2002") {
    return res.status(409).json({ erro: "Este registro já existe." });
  }

  if (error.code === "P2025") {
    return res.status(404).json({ erro: "Registro não encontrado." });
  }

  console.error(error);
  return res.status(500).json({ erro: "Erro interno no servidor." });
}
