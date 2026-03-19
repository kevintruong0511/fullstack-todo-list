const pool = require('../../../db');

class TaskModel {
  /**
   * Get all tasks ordered by creation date (newest first)
   */
  static async findAll() {
    const query = 'SELECT * FROM tasks ORDER BY created_at DESC';
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Get a single task by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Create a new task
   */
  static async create({ title, priority = 'medium' }) {
    const query = `
      INSERT INTO tasks (title, priority)
      VALUES ($1, $2)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [title, priority]);
    return rows[0];
  }

  /**
   * Update an existing task
   */
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const query = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  /**
   * Delete a task by ID
   */
  static async delete(id) {
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }
}

module.exports = TaskModel;
