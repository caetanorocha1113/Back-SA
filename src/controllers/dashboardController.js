import { prisma } from "../lib/prisma.ts";
import { AppError } from "../utils/AppError.js";
import { arredondar, inicioDoMes, somaPorTipo } from "../utils/formatar.js";

const PERIODOS = { "3m": 3, "6m": 6, "12m": 12 };

export async function resumo(req, res) {
  const periodo = req.query.periodo ?? "6m";
  const meses = PERIODOS[periodo];

  if (!meses) {
    throw new AppError("O período deve ser 3m, 6m ou 12m.");
  }

  const usuarioId = req.usuarioLogadoId;
  const inicio = inicioDoMes(meses - 1);
  const fim = inicioDoMes(-1);
  const inicioAnterior = inicioDoMes(meses * 2 - 1);

  const [geral, atual, anterior, antesDoPeriodo, porMes, porCategoria] = await Promise.all([
    prisma.transacao.groupBy({
      by: ["tipo"],
      where: { usuarioId },
      _sum: { valor: true },
    }),
    prisma.transacao.groupBy({
      by: ["tipo"],
      where: { usuarioId, data: { gte: inicio, lt: fim } },
      _sum: { valor: true },
    }),
    prisma.transacao.groupBy({
      by: ["tipo"],
      where: { usuarioId, data: { gte: inicioAnterior, lt: inicio } },
      _sum: { valor: true },
    }),
    prisma.transacao.groupBy({
      by: ["tipo"],
      where: { usuarioId, data: { lt: inicio } },
      _sum: { valor: true },
    }),
    prisma.$queryRaw`
      SELECT to_char("data", 'YYYY-MM') AS mes,
             SUM(CASE WHEN "tipo" = 'receita' THEN "valor" ELSE 0 END) AS receitas,
             SUM(CASE WHEN "tipo" = 'despesa' THEN "valor" ELSE 0 END) AS despesas
      FROM "Transacao"
      WHERE "usuarioId" = ${usuarioId} AND "data" >= ${inicio} AND "data" < ${fim}
      GROUP BY mes
      ORDER BY mes`,
    prisma.transacao.groupBy({
      by: ["categoria"],
      where: { usuarioId, tipo: "despesa", data: { gte: inicio, lt: fim } },
      _sum: { valor: true },
      orderBy: { _sum: { valor: "desc" } },
    }),
  ]);

  const totalGeral = somaPorTipo(geral);
  const totalAtual = somaPorTipo(atual);
  const totalAnterior = somaPorTipo(anterior);
  const totalAntes = somaPorTipo(antesDoPeriodo);

  const linhasPorMes = new Map(porMes.map((linha) => [linha.mes, linha]));
  let saldo = totalAntes.receitas - totalAntes.despesas;

  const mensal = Array.from({ length: meses }, (_, i) => {
    const mes = inicioDoMes(meses - 1 - i).toISOString().slice(0, 7);
    const linha = linhasPorMes.get(mes);
    const receitas = arredondar(linha?.receitas ?? 0);
    const despesas = arredondar(linha?.despesas ?? 0);
    saldo += receitas - despesas;
    return { mes, receitas, despesas, saldo: arredondar(saldo) };
  });

  res.json({
    periodo,
    resumo: {
      saldoAtual: arredondar(totalGeral.receitas - totalGeral.despesas),
      receitas: totalAtual.receitas,
      despesas: totalAtual.despesas,
      receitasAnterior: totalAnterior.receitas,
      despesasAnterior: totalAnterior.despesas,
    },
    mensal,
    categorias: porCategoria.map((c) => ({
      categoria: c.categoria,
      valor: arredondar(c._sum.valor ?? 0),
    })),
  });
}
