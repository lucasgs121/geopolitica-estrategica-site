Write-Host ">> Enviando arquivos para o servidor (sem .env e sem node_modules)..."

# Envia somente arquivos essenciais do projeto (sem node_modules)
scp `
  index.html style.css script.js server.js package.json package-lock.json `
  logo.png footer-logo.png whatsapp.png `
  README.md README_EMAIL.md README_RUN.md debug.html .env.example `
  root@72.60.137.38:/var/www/geopolitica

Write-Host ">> Instalando dependencias e reiniciando..."
ssh root@72.60.137.38 "cd /var/www/geopolitica && npm install --omit=dev && pm2 restart geopolitica --update-env && pm2 save"

Write-Host ">> Deploy concluído!"
