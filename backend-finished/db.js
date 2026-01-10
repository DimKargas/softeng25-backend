// db.js
// MariaDB/MySQL connection pool for use in routes
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // XAMPP default, change if needed
  database: 'ev_charging_db', // change if needed
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
