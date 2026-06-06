// const { Pool } = require('pg');
// require('dotenv').config();

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   database: process.env.DB_NAME,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
// });

// pool.connect((err) => {
//    ssl: {
//     rejectUnauthorized: false 
//   }
//   if (err) {
//     console.error('DB connection error:', err);
//   } else {
//     console.log('PostgreSQL connected successfully');
//   }
// });

// module.exports = pool;


const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,      
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('DB connection error:', err.message);
  } else {
    console.log('PostgreSQL connected successfully');
    release();
  }
});

module.exports = pool;