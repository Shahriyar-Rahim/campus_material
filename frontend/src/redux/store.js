import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

const localStorageService = {
  getItem: (key) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(localStorage.removeItem(key)),
};

import authReducer from "./features/authSlice";
import { materialsApi } from "./api/materialsApi";
import { authApi } from "./api/authApi";
import { plannerApi } from "./api/plannerApi";
import { routineApi } from "./api/routineApi";
import { foldersApi } from "./api/foldersApi";

const authPersistConfig = {
  key: "campus-auth",
  storage: localStorageService,
  whitelist: ["user", "token", "isAuthenticated"],
};
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  [materialsApi.reducerPath]: materialsApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [plannerApi.reducerPath]: plannerApi.reducer,
  [routineApi.reducerPath]: routineApi.reducer,
  [foldersApi.reducerPath]: foldersApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat([
      materialsApi.middleware,
      authApi.middleware,
      plannerApi.middleware,
      routineApi.middleware,
      foldersApi.middleware,
    ]), // Passing as an array is cleaner
  devTools: import.meta.env.MODE !== "production",
});
export const persistor = persistStore(store);
export default store;
