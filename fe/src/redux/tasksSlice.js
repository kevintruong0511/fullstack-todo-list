import { createSlice } from '@reduxjs/toolkit';
import { DUMMY_TASKS } from '../data/tasks';
import { storageService } from '../services/storageService';

const saved = storageService.load();

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: saved || DUMMY_TASKS,
  },
  reducers: {
    addTask(state, action) {
      state.items.unshift(action.payload);
      storageService.save(state.items);
    },
    updateTask(state, action) {
      const idx = state.items.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) {
        state.items[idx] = { ...state.items[idx], ...action.payload };
        storageService.save(state.items);
      }
    },
    deleteTask(state, action) {
      state.items = state.items.filter((t) => t.id !== action.payload);
      storageService.save(state.items);
    },
    toggleTask(state, action) {
      const task = state.items.find((t) => t.id === action.payload);
      if (task) {
        task.status = task.status === 'completed' ? 'active' : 'completed';
        storageService.save(state.items);
      }
    },
    clearCompleted(state) {
      state.items = state.items.filter((t) => t.status !== 'completed');
      storageService.save(state.items);
    },
    reorderTasks(state, action) {
      state.items = action.payload;
      storageService.save(state.items);
    },
    resetToDefault(state) {
      state.items = DUMMY_TASKS;
      storageService.clear();
    },
  },
});

export const {
  addTask, updateTask, deleteTask, toggleTask,
  clearCompleted, reorderTasks, resetToDefault,
} = tasksSlice.actions;

export default tasksSlice.reducer;
