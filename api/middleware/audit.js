const pool = require('../config/db');

const logAudit = async (userId, action, entityType, entityId, changes = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, action, entityType, entityId, changes ? JSON.stringify(changes) : null]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

module.exports = { logAudit };
