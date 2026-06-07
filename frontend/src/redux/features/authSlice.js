import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,          // full user object (sans password)
  token: null,         // JWT access token
  isAuthenticated: false,
  isLoading: false,    // global auth loading flag (used in PrivateRoute)
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, { payload }) => {
      state.user = payload.user;
      state.token = payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setLoading: (state, { payload }) => {
      state.isLoading = payload;
    },
    updateUser: (state, { payload }) => {
      // Partial update — e.g. after profile picture change
      if (state.user) state.user = { ...state.user, ...payload };
    },
    setOnlineStatus: (state, { payload }) => {
      if (state.user) state.user.isOnline = payload;
    },
  },
});

export const { setCredentials, logout, setLoading, updateUser, setOnlineStatus } = authSlice.actions;

export const selectCurrentUser  = (state) => state.auth.user;
export const selectToken        = (state) => state.auth.token;
export const selectIsAuth       = (state) => state.auth.isAuthenticated;
export const selectAuthLoading  = (state) => state.auth.isLoading;
export const selectUserRole     = (state) => state.auth.user?.role;
export const selectUserDept     = (state) => state.auth.user?.dept;
export const selectUserLevel    = (state) => state.auth.user?.level;
export const selectUserTerm     = (state) => state.auth.user?.term;

export default authSlice.reducer;
