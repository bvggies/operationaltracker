const pool = require('../config/db');

async function checkSchema() {
  const tables = ['users', 'projects', 'tasks', 'materials', 'equipment', 'attendance'];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`\n${table.toUpperCase()} table columns:`);
      result.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    } catch (error) {
      console.log(`\nError checking ${table}:`, error.message);
    }
  }
  
  process.exit(0);
}

checkSchema();

