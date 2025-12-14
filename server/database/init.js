const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const initDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove comments and split by semicolon, but be careful with CHECK constraints
    let cleanedSchema = schema
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    
    // Split by semicolon, but keep track of parentheses depth
    const statements = [];
    let currentStatement = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < cleanedSchema.length; i++) {
      const char = cleanedSchema[i];
      const nextChar = cleanedSchema[i + 1];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && cleanedSchema[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      } else if (!inString) {
        if (char === '(') depth++;
        if (char === ')') depth--;
        if (char === ';' && depth === 0) {
          const trimmed = currentStatement.trim();
          if (trimmed && !trimmed.match(/^\s*$/)) {
            statements.push(trimmed);
          }
          currentStatement = '';
          continue;
        }
      }
      
      currentStatement += char;
    }
    
    // Add last statement if exists
    const trimmed = currentStatement.trim();
    if (trimmed && !trimmed.match(/^\s*$/)) {
      statements.push(trimmed);
    }
    
    // Execute statements
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate') &&
              !error.message.includes('does not exist')) {
            console.error('Error executing statement:', error.message);
            console.error('Statement:', statement.substring(0, 200));
          }
        }
      }
    }
    
    console.log('Database schema initialized successfully');
    
    // Create default admin user if it doesn't exist
    const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (username, password_hash, email, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        ['admin', hashedPassword, 'admin@example.com', 'System Administrator', 'admin']
      );
      console.log('Default admin user created (username: admin, password: admin123)');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = initDatabase;
