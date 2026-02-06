/**
 * Lista de feriados nacionais brasileiros
 * Formato: 'YYYY-MM-DD'
 */

// Feriados fixos (repetem todo ano)
const feriadosFixos = [
  { mes: 1, dia: 1, nome: 'Confraternização Universal' },
  { mes: 4, dia: 21, nome: 'Tiradentes' },
  { mes: 5, dia: 1, nome: 'Dia do Trabalho' },
  { mes: 9, dia: 7, nome: 'Independência do Brasil' },
  { mes: 10, dia: 12, nome: 'Nossa Senhora Aparecida' },
  { mes: 11, dia: 2, nome: 'Finados' },
  { mes: 11, dia: 15, nome: 'Proclamação da República' },
  { mes: 12, dia: 25, nome: 'Natal' },
];

// Feriados móveis (calculados por ano) - Carnaval, Sexta-feira Santa, Corpus Christi
// Baseados na Páscoa
const feriadosMoveis: Record<number, string[]> = {
  2024: [
    '2024-02-12', // Carnaval (segunda)
    '2024-02-13', // Carnaval (terça)
    '2024-03-29', // Sexta-feira Santa
    '2024-05-30', // Corpus Christi
  ],
  2025: [
    '2025-03-03', // Carnaval (segunda)
    '2025-03-04', // Carnaval (terça)
    '2025-04-18', // Sexta-feira Santa
    '2025-06-19', // Corpus Christi
  ],
  2026: [
    '2026-02-16', // Carnaval (segunda)
    '2026-02-17', // Carnaval (terça)
    '2026-04-03', // Sexta-feira Santa
    '2026-06-04', // Corpus Christi
  ],
  2027: [
    '2027-02-08', // Carnaval (segunda)
    '2027-02-09', // Carnaval (terça)
    '2027-03-26', // Sexta-feira Santa
    '2027-05-27', // Corpus Christi
  ],
};

/**
 * Gera lista de feriados para um ano específico
 */
const gerarFeriadosAno = (ano: number): Set<string> => {
  const feriados = new Set<string>();

  // Adicionar feriados fixos
  feriadosFixos.forEach(f => {
    const mes = String(f.mes).padStart(2, '0');
    const dia = String(f.dia).padStart(2, '0');
    feriados.add(`${ano}-${mes}-${dia}`);
  });

  // Adicionar feriados móveis se disponíveis
  if (feriadosMoveis[ano]) {
    feriadosMoveis[ano].forEach(data => feriados.add(data));
  }

  return feriados;
};

// Cache de feriados por ano
const cacheFeriados: Record<number, Set<string>> = {};

/**
 * Obtém o conjunto de feriados para um ano
 */
export const getFeriadosAno = (ano: number): Set<string> => {
  if (!cacheFeriados[ano]) {
    cacheFeriados[ano] = gerarFeriadosAno(ano);
  }
  return cacheFeriados[ano];
};

/**
 * Verifica se uma data é feriado nacional
 */
export const isFeriado = (data: Date): boolean => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const dataStr = `${ano}-${mes}-${dia}`;

  return getFeriadosAno(ano).has(dataStr);
};

/**
 * Verifica se uma data é domingo
 */
export const isDomingo = (data: Date): boolean => {
  return data.getDay() === 0;
};

/**
 * Verifica se uma data é sábado
 */
export const isSabado = (data: Date): boolean => {
  return data.getDay() === 6;
};

/**
 * Verifica se uma data é fim de semana (sábado ou domingo)
 */
export const isFimDeSemana = (data: Date): boolean => {
  const diaSemana = data.getDay();
  return diaSemana === 0 || diaSemana === 6; // 0 = domingo, 6 = sábado
};

/**
 * Verifica se uma data é dia útil para APROVAÇÃO (segunda a sexta)
 * Sábado e domingo NÃO são dias úteis para aprovação
 */
export const isDiaUtilAprovacao = (data: Date): boolean => {
  return !isFimDeSemana(data) && !isFeriado(data);
};

/**
 * Verifica se uma data é dia útil para FATURAMENTO (segunda a sábado)
 * Apenas domingo NÃO é dia útil para faturamento
 */
export const isDiaUtilFaturamento = (data: Date): boolean => {
  return !isDomingo(data) && !isFeriado(data);
};

/**
 * Verifica se uma data é dia útil (padrão: usa regra de aprovação)
 */
export const isDiaUtil = (data: Date): boolean => {
  return isDiaUtilAprovacao(data);
};

/**
 * Retorna o próximo dia útil para aprovação a partir de uma data
 * Se a data já for dia útil, retorna ela mesma
 */
export const getProximoDiaUtil = (data: Date): Date => {
  const resultado = new Date(data);
  while (!isDiaUtilAprovacao(resultado)) {
    resultado.setDate(resultado.getDate() + 1);
  }
  return resultado;
};

/**
 * Calcula a quantidade de dias úteis entre duas datas
 * Considera segunda a sábado como dias úteis para faturamento
 * Não inclui a data inicial, inclui a data final
 */
export const calcularDiasUteis = (dataInicio: Date, dataFim: Date): number => {
  let diasUteis = 0;
  const atual = new Date(dataInicio);
  atual.setDate(atual.getDate() + 1); // Começa do dia seguinte

  while (atual <= dataFim) {
    if (isDiaUtilFaturamento(atual)) {
      diasUteis++;
    }
    atual.setDate(atual.getDate() + 1);
  }

  return diasUteis;
};
