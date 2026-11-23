import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import transacaoRoutes from "./routes/transacaoRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import relatorioRoutes from "./routes/relatorioRoutes.js";
import { rotaNaoEncontrada, tratarErros } from "./middleware/errorHandler.js";

const app = express();

const origens = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim());
app.use(cors({ origin: origens?.length ? origens : true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", api: "Back SA - Gestão Financeira" });
});

app.use(authRoutes);
app.use("/usuarios", usuarioRoutes);
app.use("/transacoes", transacaoRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/relatorios", relatorioRoutes);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

export default app;
