import mysql from 'mysql2/promise';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'quantai_user',
  password: process.env.DB_PASSWORD || 'securepassword123',
  database: process.env.DB_NAME || 'quantai'
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

export async function executeQuery(sql: string) {
  const connection = await pool.getConnection();
  try {
    const [rows, fields] = await connection.execute(sql);
    return { rows, fields };
  } finally {
    connection.release();
  }
} 