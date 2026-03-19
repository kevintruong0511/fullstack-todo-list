import { useState } from 'react';
import TaskCard from '../components/ui/TaskCard';
import TaskInput from '../components/ui/TaskInput';
import FilterBar from '../components/ui/FilterBar';
import Modal from '../components/ui/Modal';
import { useTasks } from '../hooks/useTasks';
import { useFilter } from '../hooks/useFilter';

export default function TaskList() {
  const { filtered, activeCount, add, toggle, remove, update } = useTasks();
  const { searchQuery, setSearch, priority, setPriority } = useFilter();
  const [editTask, setEditTask] = useState(null);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Tasks</h1>
          <p className="page-subtitle">
            {activeCount} task{activeCount !== 1 ? 's' : ''} remaining
          </p>
        </div>
      </div>

      {/* Add Task */}
      <TaskInput onAdd={add} />

      {/* Search + Priority Filter */}
      <div className="search-row">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <select
          className="task-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
      </div>

      {/* Filter Tabs */}
      <FilterBar />

      {/* Task List */}
      <div className="task-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p className="empty-title">No tasks found</p>
            <p className="empty-sub">Try a different filter or add a new task above.</p>
          </div>
        ) : (
          filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onToggle={toggle}
              onDelete={remove}
              onEdit={setEditTask}
            />
          ))
        )}
      </div>

      {editTask && (
        <Modal
          task={editTask}
          onSave={(data) => update(editTask.id, data)}
          onClose={() => setEditTask(null)}
        />
      )}
    </div>
  );
}
