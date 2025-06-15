import express from 'express';
import { executeQuery } from '../services/database';

const router = express.Router();

router.post('/execute', async (req, res) => {
  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  try {
    const startTime = Date.now();
    const result = await executeQuery(sql);
    const executionTime = Date.now() - startTime;

    // Format the result to match the Output component's expected format
    const formattedResult = {
      sql,
      data: result.rows,
      columns: result.fields.map(field => field.name),
      executionTime,
      rowCount: result.rows.length
    };

    res.json(formattedResult);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Failed to execute query' });
  }
});

export default router; 