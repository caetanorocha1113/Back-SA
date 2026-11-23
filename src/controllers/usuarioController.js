import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.ts";
import { AppError } from "../utils/AppError.js";
import { validarUsuario } from "../utils/validacao.js";
import { formatarUsuario } from "../utils/formatar.js";

const PERFIS = ["usuario", "admin"];

function podeAcessar(req, id) {
  return req.usuarioLogadoPerfil === "admin" || req.usuarioLogadoId === id;
}

export async function criar(req, res) {
  const { nome, email, senha } = req.body ?? {};
  validarUsuario({ nome, email, senha });

  const emailNormalizado = email.trim().toLowerCase();
  const jaExiste = await prisma.usuario.findUnique({ where: { email: emailNormalizado } });
  if (jaExiste) {
    throw new AppError("E-mail já cadastrado.", 409);
  }

  const novoUsuario = await prisma.usuario.create({
    data: {
      nome: nome.trim(),
      email: emailNormalizado,
      senha: await bcrypt.hash(String(senha), 10),
    },
  });

  res.status(201).json(formatarUsuario(novoUsuario));
}

export async function listar(req, res) {
  const busca = String(req.query.busca ?? "").trim();
  const where = busca
    ? {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { email: { contains: busca, mode: "insensitive" } },
        ],
      }
    : {};

  const usuarios = await prisma.usuario.findMany({ where, orderBy: { nome: "asc" } });
  res.json(usuarios.map(formatarUsuario));
}

export async function buscarPorId(req, res) {
  const { id } = req.params;

  if (!podeAcessar(req, id)) {
    throw new AppError("Você não tem permissão para acessar este usuário.", 403);
  }

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  res.json(formatarUsuario(usuario));
}

export async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, email, senha, perfil } = req.body ?? {};

  if (!podeAcessar(req, id)) {
    throw new AppError("Você não tem permissão para alterar este usuário.", 403);
  }

  validarUsuario({ nome, email, senha }, { parcial: true });

  const dados = {};
  if (nome !== undefined) dados.nome = nome.trim();
  if (email !== undefined) dados.email = email.trim().toLowerCase();
  if (senha !== undefined) dados.senha = await bcrypt.hash(String(senha), 10);
  if (perfil !== undefined) {
    if (req.usuarioLogadoPerfil !== "admin") {
      throw new AppError("Só o administrador pode alterar o perfil.", 403);
    }
    if (!PERFIS.includes(perfil)) {
      throw new AppError("O perfil deve ser usuario ou admin.");
    }
    dados.perfil = perfil;
  }

  if (Object.keys(dados).length === 0) {
    throw new AppError("Informe ao menos um campo.");
  }

  const usuario = await prisma.usuario.update({ where: { id }, data: dados });
  res.json(formatarUsuario(usuario));
}

export async function excluir(req, res) {
  const { id } = req.params;

  if (id === req.usuarioLogadoId) {
    throw new AppError("Você não pode excluir o próprio usuário.", 409);
  }

  await prisma.usuario.delete({ where: { id } });
  res.status(204).end();
}
