import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './tasksSlice';
import filterReducer from './filterSlice';
import authReducer from './authSlice';

const store = configureStore({
  reducer: {
    tasks:  tasksReducer,
    filter: filterReducer,
    auth:   authReducer,
  },
});

export default store;
