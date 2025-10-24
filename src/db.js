const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 10
});

async function insertUsersBatch(rows) {
  if (!rows || rows.length === 0) return;
  // rows: [{name, age, address, additional_info}, ...]
  // Build multi-row parameterized insert
  const columns = ['name', 'age', 'address', 'additional_info'];
  const values = [];
  const params = [];
  let idx = 1;

  for (const r of rows) {
    params.push(`$${idx++}`); values.push(r.name);
    params.push(`$${idx++}`); values.push(r.age);
    params.push(`$${idx++}`); values.push(r.address ? JSON.stringify(r.address) : null);
    params.push(`$${idx++}`); values.push(r.additional_info ? JSON.stringify(r.additional_info) : null);
  }

  // Build VALUES clause groups like ($1,$2,$3,$4),($5,$6,$7,$8),...
  const chunkSize = 4;
  const valueGroups = [];
  for (let i = 0; i < rows.length; i++) {
    const groupParams = [];
    for (let j = 0; j < chunkSize; j++) {
      groupParams.push(`$${i * chunkSize + j + 1}`);
    }
    valueGroups.push(`(${groupParams.join(',')})`);
  }

  const text = `INSERT INTO public.users (${columns.join(',')}) VALUES ${valueGroups.join(',')}`;
  // Execute in a client to allow better error handling
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(text, values);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getAgeDistribution() {
  const text = `
    SELECT
      SUM(CASE WHEN age < 20 THEN 1 ELSE 0 END) AS lt_20,
      SUM(CASE WHEN age >= 20 AND age <= 40 THEN 1 ELSE 0 END) AS between_20_40,
      SUM(CASE WHEN age > 40 AND age <= 60 THEN 1 ELSE 0 END) AS between_40_60,
      SUM(CASE WHEN age > 60 THEN 1 ELSE 0 END) AS gt_60,
      COUNT(*) AS total
    FROM public.users;
  `;
  const res = await pool.query(text);
  return res.rows[0];
}

module.exports = {
  pool,
  insertUsersBatch,
  getAgeDistribution
};