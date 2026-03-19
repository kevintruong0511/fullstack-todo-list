import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './tasksSlice';
import filterReducer from './filterSlice';

const store = configureStore({
  reducer: {
    tasks:  tasksReducer,
    filter: filterReducer,
  },
});

export default store;
