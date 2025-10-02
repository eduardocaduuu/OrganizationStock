# Sistema de Controle de Estoque

Sistema web profissional para análise inteligente de planilhas Excel de estoque, com detecção automática de duplicatas, variantes e alertas críticos.

## 🚀 Funcionalidades

- **Upload e Processamento Excel**: Suporte para arquivos .xlsx e .xls
- **Detecção Inteligente**:
  - Duplicatas por código e descrição
  - Variantes automáticas (ex: "PRODUTO V3", "PRODUTO V5")
  - Alertas críticos para estoque zerado ou negativo
- **Dashboard Profissional**:
  - Métricas em tempo real
  - Cards com alertas visuais
  - Indicadores de prioridade
- **Tabela Avançada**:
  - Ordenação por colunas
  - Filtros por status
  - Busca em tempo real
  - Paginação
  - Visualização de variantes
- **Exportação**: Relatórios em Excel e impressão

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn

## 🛠️ Instalação Local

1. Clone o repositório ou extraia os arquivos

2. Instale as dependências:
```bash
npm install
```

3. Execute em modo desenvolvimento:
```bash
npm run dev
```

4. Acesse: `http://localhost:5173`

## 📦 Build para Produção

```bash
npm run build
```

Os arquivos otimizados estarão em `dist/`

## 🌐 Deploy no Render (Plano Gratuito)

### Opção 1: Deploy via GitHub

1. Crie um repositório no GitHub e faça push do código

2. Acesse [Render.com](https://render.com) e faça login

3. Clique em "New +" → "Static Site"

4. Conecte seu repositório GitHub

5. Configure:
   - **Name**: sistema-estoque (ou seu nome preferido)
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

6. Clique em "Create Static Site"

### Opção 2: Deploy via Render CLI

1. Instale o Render CLI:
```bash
npm install -g render-cli
```

2. Faça login:
```bash
render login
```

3. Crie o serviço:
```bash
render deploy
```

### Opção 3: Deploy Manual

1. Faça build local:
```bash
npm run build
```

2. No Render:
   - Vá em "New +" → "Static Site"
   - Selecione "Deploy an existing folder"
   - Faça upload da pasta `dist/`

## 🔧 Configuração para Render

O projeto já está configurado com:

- ✅ `package.json` com script `start` para preview
- ✅ Vite configurado para aceitar variável `PORT` do Render
- ✅ Build otimizado para produção
- ✅ Static assets configurados

## 📊 Formato do Excel

Colunas obrigatórias:
- **CodMaterial**: Código do produto
- **DescMaterial**: Descrição do produto
- **Quantidade**: Quantidade em estoque

> As colunas "Total alocado" e "Total Disponível" são ignoradas automaticamente

## 🎯 Regras de Negócio

- **Variantes**: Itens com descrições idênticas exceto por "V" + número (ex: V3, V5) são agrupados
- **Priorização**: Negativos > Zerados > Variantes > Duplicados > Normais
- **Alertas**:
  - 🔴 Vermelho: Estoque zerado
  - 🟠 Laranja: Estoque negativo
  - 🟣 Roxo: Variantes detectadas
  - 🔵 Azul: Duplicados

## 🛡️ Tecnologias

- React 18 + TypeScript
- Vite
- Tailwind CSS
- SheetJS (xlsx)
- Lucide React Icons

## 📝 Licença

Este projeto é open source e está disponível sob a licença MIT.

---

Desenvolvido com ❤️ para otimizar a gestão de estoque
