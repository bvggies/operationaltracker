const pool = require('../config/db');

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
  .then(result => {
    console.log('Existing tables:');
    result.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });

