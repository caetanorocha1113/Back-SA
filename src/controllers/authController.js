import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.ts";
import { AppError } from "../utils/AppError.js";
import { formatarUsuario } from "../utils/formatar.js";

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!REFRESH_SECRET) {
  throw new Error("REFRESH_TOKEN_SECRET não encontrado no .env");
}

async function gerarTokens(usuario) {
  const payload = { id: usuario.id, perfil: usuario.perfil };
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ ...payload, jti: crypto.randomUUID() }, REFRESH_SECRET, { expiresIn: "30d" });

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { refreshToken },
  });

  return { accessToken, refreshToken };
}

export async function login(req, res) {
  const { email, senha } = req.body ?? {};

  if (!email || !senha) {
    throw new AppError("Informe email e senha.");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: String(email).trim().toLowerCase() },
  });

  if (!usuario || !usuario.senha || !(await bcrypt.compare(String(senha), usuario.senha))) {
    throw new AppError("E-mail ou senha inválidos.", 401);
  }

  const tokens = await gerarTokens(usuario);
  res.json({ ...tokens, usuario: formatarUsuario(usuario) });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body ?? {};

  if (!refreshToken) {
    throw new AppError("Informe o refreshToken.");
  }

  let dados;
  try {
    dados = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch {
    throw new AppError("Refresh token inválido ou expirado.", 401);
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: dados.id } });

  if (!usuario || usuario.refreshToken !== refreshToken) {
    throw new AppError("Refresh token inválido.", 401);
  }

  res.json(await gerarTokens(usuario));
}

export async function logout(req, res) {
  await prisma.usuario.update({
    where: { id: req.usuarioLogadoId },
    data: { refreshToken: null },
  });
  res.status(204).end();
}

export async function perfil(req, res) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioLogadoId },
  });

  if (!usuario) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  res.json(formatarUsuario(usuario));
}
