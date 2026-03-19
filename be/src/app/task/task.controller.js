const TaskService = require('./task.service');
const { successResponse } = require('../../helpers/responseHelper');
const { HTTP_STATUS } = require('../../constants/httpStatus');
const { MESSAGES } = require('../../constants/messages');

class TaskController {
  /**
   * GET /api/tasks
   */
  static async getAll(req, res) {
    const tasks = await TaskService.getAllTasks();
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGES.TASKS_FOUND,
      data: tasks,
    });
  }

  /**
   * GET /api/tasks/:id
   */
  static async getById(req, res) {
    const task = await TaskService.getTaskById(req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGES.TASK_FOUND,
      data: task,
    });
  }

  /**
   * POST /api/tasks
   */
  static async create(req, res) {
    const task = await TaskService.createTask(req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: MESSAGES.TASK_CREATED,
      data: task,
    });
  }

  /**
   * PUT /api/tasks/:id
   */
  static async update(req, res) {
    const task = await TaskService.updateTask(req.params.id, req.body);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGES.TASK_UPDATED,
      data: task,
    });
  }

  /**
   * DELETE /api/tasks/:id
   */
  static async delete(req, res) {
    await TaskService.deleteTask(req.params.id);
    return successResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: MESSAGES.TASK_DELETED,
      data: null,
    });
  }
}

module.exports = TaskController;
