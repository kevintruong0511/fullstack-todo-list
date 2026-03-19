const { HTTP_STATUS } = require('../constants/httpStatus');
const { MESSAGES } = require('../constants/messages');

const VALID_PRIORITIES = ['low', 'medium', 'high'];

const validateCreateTask = (req, res, next) => {
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: 'error',
      message: MESSAGES.TITLE_REQUIRED,
    });
  }

  if (req.body.priority && !VALID_PRIORITIES.includes(req.body.priority)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: 'error',
      message: MESSAGES.INVALID_PRIORITY,
    });
  }

  // Sanitize
  req.body.title = title.trim();
  req.body.priority = req.body.priority || 'medium';

  next();
};

const validateUpdateTask = (req, res, next) => {
  const { title, priority } = req.body;

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: 'error',
      message: MESSAGES.TITLE_REQUIRED,
    });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: 'error',
      message: MESSAGES.INVALID_PRIORITY,
    });
  }

  if (title) req.body.title = title.trim();

  next();
};

module.exports = { validateCreateTask, validateUpdateTask };
