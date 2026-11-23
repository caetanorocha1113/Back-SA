import { prisma } from "../lib/prisma.ts";
import { AppError } from "../utils/AppError.js";
import { TIPOS, STATUS, dataValida, validarTransacao } from "../utils/validacao.js";
import { formatarTransacao } from "../utils/formatar.js";

const CAMPOS_ORDENACAO = ["data", "valor", "descricao", "categoria", "criadoEm"];

function lerInteiro(valor, nome, { minimo = 1, maximo = Infinity } = {}) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw new AppError(`O parâmetro ${nome} deve ser um número inteiro entre ${minimo} e ${maximo}.`);
  }
  return numero;
}

function lerId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError("Transação não encontrada.", 404);
  }
  return id;
}

async function buscarDoUsuario(req) {
  const transacao = await prisma.transacao.findFirst({
    where: { id: lerId(req), usuarioId: req.usuarioLogadoId },
  });
  if (!transacao) {
    throw new AppError("Transação não encontrada.", 404);
  }
  return transacao;
}

export async function listar(req, res) {
  const { busca, tipo, categoria, status, dataInicio, dataFim, ordenarPor = "data", ordem = "desc" } = req.query;
  const where = { usuarioId: req.usuarioLogadoId };

  if (busca && String(busca).trim()) {
    const termo = String(busca).trim();
    where.OR = [
      { descricao: { contains: termo, mode: "insensitive" } },
      { categoria: { contains: termo, mode: "insensitive" } },
    ];
  }

  if (tipo) {
    if (!TIPOS.includes(tipo)) throw new AppError("O tipo deve ser receita ou despesa.");
    where.tipo = tipo;
  }

  if (categoria) where.categoria = String(categoria);

  if (status) {
    if (!STATUS.includes(status)) throw new AppError("O status deve ser concluida ou pendente.");
    where.status = status;
  }

  if (dataInicio || dataFim) {
    where.data = {};
    if (dataInicio) {
      if (!dataValida(dataInicio)) throw new AppError("dataInicio deve estar no formato AAAA-MM-DD.");
      where.data.gte = new Date(`${dataInicio}T00:00:00Z`);
    }
    if (dataFim) {
      if (!dataValida(dataFim)) throw new AppError("dataFim deve estar no formato AAAA-MM-DD.");
      where.data.lte = new Date(`${dataFim}T00:00:00Z`);
    }
  }

  if (!CAMPOS_ORDENACAO.includes(ordenarPor)) {
    throw new AppError(`ordenarPor deve ser: ${CAMPOS_ORDENACAO.join(", ")}.`);
  }
  if (!["asc", "desc"].includes(ordem)) {
    throw new AppError("ordem deve ser asc ou desc.");
  }

  const limite = req.query.limite ? lerInteiro(req.query.limite, "limite", { maximo: 100 }) : undefined;
  const pagina = req.query.pagina ? lerInteiro(req.query.pagina, "pagina") : 1;

  const [total, transacoes] = await prisma.$transaction([
    prisma.transacao.count({ where }),
    prisma.transacao.findMany({
      where,
      orderBy: [{ [ordenarPor]: ordem }, { id: "desc" }],
      skip: limite ? (pagina - 1) * limite : undefined,
      take: limite,
    }),
  ]);

  res.json({
    dados: transacoes.map(formatarTransacao),
    total,
    pagina,
    limite: limite ?? total,
    totalPaginas: limite ? Math.ceil(total / limite) : 1,
  });
}

export async function buscarPorId(req, res) {
  res.json(formatarTransacao(await buscarDoUsuario(req)));
}

export async function criar(req, res) {
  const dados = validarTransacao(req.body ?? {});
  const transacao = await prisma.transacao.create({
    data: { ...dados, usuarioId: req.usuarioLogadoId },
  });
  res.status(201).json(formatarTransacao(transacao));
}

export async function atualizar(req, res) {
  const atual = await buscarDoUsuario(req);
  const dados = validarTransacao(req.body ?? {});
  const transacao = await prisma.transacao.update({
    where: { id: atual.id },
    data: dados,
  });
  res.json(formatarTransacao(transacao));
}

export async function excluir(req, res) {
  const atual = await buscarDoUsuario(req);
  await prisma.transacao.delete({ where: { id: atual.id } });
  res.status(204).end();
}
