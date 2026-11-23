import { prisma } from "../lib/prisma.ts";
import { AppError } from "../utils/AppError.js";
import { dataValida } from "../utils/validacao.js";
import { arredondar, formatarTransacao, somaPorTipo } from "../utils/formatar.js";

function lerPeriodo(query) {
  const ano = new Date().getFullYear();
  const dataInicio = query.dataInicio ?? `${ano}-01-01`;
  const dataFim = query.dataFim ?? `${ano}-12-31`;

  if (!dataValida(dataInicio) || !dataValida(dataFim)) {
    throw new AppError("Informe dataInicio e dataFim no formato AAAA-MM-DD.");
  }
  if (dataInicio > dataFim) {
    throw new AppError("dataInicio deve ser anterior a dataFim.");
  }

  return {
    dataInicio,
    dataFim,
    gte: new Date(`${dataInicio}T00:00:00Z`),
    lte: new Date(`${dataFim}T00:00:00Z`),
  };
}

function gerarCsv(transacoes) {
  const cabecalho = "Data;Descrição;Categoria;Tipo;Status;Valor";
  const linhas = transacoes.map((t) =>
    [t.data, `"${t.descricao.replaceAll('"', '""')}"`, t.categoria, t.tipo, t.status, t.valor.toFixed(2).replace(".", ",")].join(";"),
  );
  return "﻿" + [cabecalho, ...linhas].join("\r\n");
}

export async function gerar(req, res) {
  const { dataInicio, dataFim, gte, lte } = lerPeriodo(req.query);
  const usuarioId = req.usuarioLogadoId;
  const where = { usuarioId, data: { gte, lte } };

  if (req.query.formato === "csv") {
    const transacoes = await prisma.transacao.findMany({ where, orderBy: [{ data: "asc" }, { id: "asc" }] });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio_${dataInicio}_${dataFim}.csv"`);
    return res.send(gerarCsv(transacoes.map(formatarTransacao)));
  }

  const [porTipo, quantidade, pendentes, porCategoria, porMes, maioresDespesas] = await Promise.all([
    prisma.transacao.groupBy({ by: ["tipo"], where, _sum: { valor: true } }),
    prisma.transacao.count({ where }),
    prisma.transacao.count({ where: { ...where, status: "pendente" } }),
    prisma.transacao.groupBy({
      by: ["tipo", "categoria"],
      where,
      _sum: { valor: true },
      _count: { _all: true },
      orderBy: { _sum: { valor: "desc" } },
    }),
    prisma.$queryRaw`
      SELECT to_char("data", 'YYYY-MM') AS mes,
             SUM(CASE WHEN "tipo" = 'receita' THEN "valor" ELSE 0 END) AS receitas,
             SUM(CASE WHEN "tipo" = 'despesa' THEN "valor" ELSE 0 END) AS despesas
      FROM "Transacao"
      WHERE "usuarioId" = ${usuarioId} AND "data" >= ${gte} AND "data" <= ${lte}
      GROUP BY mes
      ORDER BY mes`,
    prisma.transacao.findMany({
      where: { ...where, tipo: "despesa" },
      orderBy: { valor: "desc" },
      take: 5,
    }),
  ]);

  const totais = somaPorTipo(porTipo);

  res.json({
    periodo: { dataInicio, dataFim },
    totais: {
      receitas: totais.receitas,
      despesas: totais.despesas,
      saldo: arredondar(totais.receitas - totais.despesas),
      quantidade,
      pendentes,
    },
    porCategoria: porCategoria.map((c) => ({
      tipo: c.tipo,
      categoria: c.categoria,
      total: arredondar(c._sum.valor ?? 0),
      quantidade: c._count._all,
    })),
    porMes: porMes.map((m) => ({
      mes: m.mes,
      receitas: arredondar(m.receitas),
      despesas: arredondar(m.despesas),
      saldo: arredondar(Number(m.receitas) - Number(m.despesas)),
    })),
    maioresDespesas: maioresDespesas.map(formatarTransacao),
  });
}
