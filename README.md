# Meu Financeiro

Aplicação web mobile-first de um painel financeiro pessoal construída com React e Vite.

O aplicativo permite cadastrar despesas fixas e variáveis, cartões, compras parceladas,
assinaturas e receitas. O consolidado mensal é calculado automaticamente e os
dados permanecem salvos localmente no dispositivo. A projeção financeira usa
esses registros para estimar os próximos 6, 9 ou 12 meses e calcular indicadores
de saúde financeira.

## Executar em desenvolvimento

```bash
npm install
npm run dev
```

O projeto abre em `http://localhost:5173` e salva os cadastros no `localStorage` do navegador.

## Gerar produção

```bash
npm run build
```
