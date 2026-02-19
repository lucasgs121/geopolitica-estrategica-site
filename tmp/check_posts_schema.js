const fs = require('fs');

let url = '';
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
  if (m) {
    url = m[1].trim();
    break;
  }
}

if (!url) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
  url = url.slice(1, -1);
}

const { Pool } = require('pg');
const pool = new Pool({ connectionString: url });

pool
  .query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='posts' ORDER BY ordinal_position")
  .then((r) => {
    for (const row of r.rows) {
      console.log(`${row.column_name}\t${row.data_type}\t${row.column_default || ''}`);
    }
    return pool.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
