require('dotenv').config();
const db = require('./config/db');

(async () => {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('Banco respondeu corretamente:', result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao conectar no banco:', err);
    process.exit(1);
  }
})();
