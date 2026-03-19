const TaskModel = require('./task.model');

class TaskService {
  /**
   * Get all tasks
   */
  static async getAllTasks() {
    return await TaskModel.findAll();
  }

  /**
   * Get a task by ID
   */
  static async getTaskById(id) {
    const task = await TaskModel.findById(id);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return task;
  }

  /**
   * Create a new task
   */
  static async createTask(data) {
    return await TaskModel.create(data);
  }

  /**
   * Update a task
   */
  static async updateTask(id, data) {
    // Check if task exists
    await this.getTaskById(id);
    return await TaskModel.update(id, data);
  }

  /**
   * Delete a task
   */
  static async deleteTask(id) {
    const task = await TaskModel.delete(id);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return task;
  }
}

module.exports = TaskService;
