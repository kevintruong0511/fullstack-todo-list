import { useDispatch, useSelector } from 'react-redux';
import {
  addTask, updateTask, deleteTask,
  toggleTask, clearCompleted, reorderTasks, resetToDefault,
} from '../redux/tasksSlice';

let _id = 100;
const genId = () => String(++_id + Date.now());

export function useTasks() {
  const dispatch = useDispatch();
  const items    = useSelector((s) => s.tasks.items);
  const filter   = useSelector((s) => s.filter);

  const filtered = items.filter((t) => {
    if (filter.status !== 'all' && t.status !== filter.status) return false;
    if (filter.category !== 'all' && t.category !== filter.category) return false;
    if (filter.priority !== 'all' && t.priority !== filter.priority) return false;
    if (filter.searchQuery && !t.title.toLowerCase().includes(filter.searchQuery.toLowerCase())) return false;
    return true;
  });

  return {
    items,
    filtered,
    totalCount:     items.length,
    activeCount:    items.filter((t) => t.status === 'active').length,
    completedCount: items.filter((t) => t.status === 'completed').length,
    add:     (title, priority = 'medium', category = 'work', description = '') =>
      dispatch(addTask({
        id: genId(), title, priority, category, description,
        status: 'active', createdAt: new Date().toISOString(), dueDate: null,
      })),
    update:         (id, data)   => dispatch(updateTask({ id, ...data })),
    remove:         (id)         => dispatch(deleteTask(id)),
    toggle:         (id)         => dispatch(toggleTask(id)),
    clearCompleted: ()           => dispatch(clearCompleted()),
    reorder:        (tasks)      => dispatch(reorderTasks(tasks)),
    reset:          ()           => dispatch(resetToDefault()),
  };
}
