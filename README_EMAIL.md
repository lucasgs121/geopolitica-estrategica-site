# Envio de e-mail do formulário "Parceria"

## Por que não dá para "colocar a senha no código"
Porque isso vaza sua senha (mesmo em ZIP) e qualquer pessoa poderia usar seu e-mail.

## Como configurar de forma segura
1) Na pasta TESTE/, crie um arquivo chamado .env
2) Copie o conteúdo de .env.example e preencha com seus dados (SMTP_USER e SMTP_PASS = senha de app).
3) Rode:
   npm install
   npm start
4) Abra:
   http://localhost:3000
5) Teste o modal Parceria.

## Dica
Se falhar, veja o terminal: ele mostra se o SMTP não está configurado ou o erro do provedor.
