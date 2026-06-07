import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "../features/authSlice";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

// Wrap with logout on 401
const baseQueryWithLogout = async (args, api, extra) => {
  const result = await baseQuery(args, api, extra);
  if (result.error?.status === 401) api.dispatch(logout());
  return result;
};

export const routineApi = createApi({
  reducerPath: "routineApi",
  baseQuery: baseQueryWithLogout,
  endpoints: (builder) => ({
    getMyCourses: builder.query({
      query: ({ dept, level, term }) => ({
        url: "/routine/my-courses",
        params: { dept, level, term },
      }),
    }),
    getMyRoutine: builder.query({
      query: () => "/routine/my",
    }),
  }),
});

export const { useGetMyCoursesQuery, useGetMyRoutineQuery } = routineApi;