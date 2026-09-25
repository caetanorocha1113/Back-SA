import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.ts";
import { verificarToken } from "./middleware/authMiddleware.js";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET não encontrado no .env");
}

if (!REFRESH_SECRET) {
  throw new Error("REFRESH_TOKEN_SECRET não encontrado no .env");
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.post("/usuarios", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "Informe nome, email e senha." });
  }

  try {
    const jaExiste = await prisma.usuario.findUnique({ where: { email } });
    if (jaExiste) {
      return res.status(409).json({ erro: "E-mail já cadastrado." });
    }

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha,
      },
    });

    res.status(201).json(novoUsuario);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao criar usuário." });
  }
});


app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "Informe email e senha." });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario || senha !== usuario.senha) {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }

    const payload = { id: usuario.id };
    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "30d" });

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { refreshToken },
    });

    res.json({
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao fazer login." });
  }
});


app.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ erro: "Informe o refreshToken." });
  }

  try {
    const dados = jwt.verify(refreshToken, REFRESH_SECRET);
    const usuario = await prisma.usuario.findUnique({ where: { id: dados.id } });

    if (!usuario || usuario.refreshToken !== refreshToken) {
      return res.status(401).json({ erro: "Refresh token inválido." });
    }

    const payload = { id: usuario.id };
    const novoAccessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
    const novoRefreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "30d" });

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { refreshToken: novoRefreshToken },
    });

    res.json({
      accessToken: novoAccessToken,
      refreshToken: novoRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ erro: "Refresh token inválido ou expirado." });
  }
});

// Perfil de quem esta logado: o id vem do token, nao da URL
app.get("/perfil", verificarToken, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioLogadoId },
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar perfil." });
  }
});




app.get("/usuarios", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar usuários." });
  }
});


app.get("/usuarios/:id", verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar usuário." });
  }
});


app.put("/usuarios/:id", verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha } = req.body;

  try {
    const dados = {};
    if (nome !== undefined) dados.nome = nome;
    if (email !== undefined) dados.email = email;
    if (senha !== undefined) dados.senha = senha;

    if (Object.keys(dados).length === 0) {
      return res.status(400).json({ erro: "Informe ao menos um campo." });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: dados,
    });

    res.json(usuario);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }
    res.status(500).json({ erro: "Erro ao atualizar usuário." });
  }
});


app.delete("/usuarios/:id", verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await prisma.usuario.delete({
      where: { id },
    });
    res.json(usuario);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }
    res.status(500).json({ erro: "Erro ao excluir usuário." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando http://localhost:${PORT}`);
});

