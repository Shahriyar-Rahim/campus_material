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

const baseQueryWithLogout = async (args, api, extra) => {
  const result = await baseQuery(args, api, extra);
  if (result.error?.status === 401) api.dispatch(logout());
  return result;
};

export const plannerApi = createApi({
  reducerPath: "plannerApi",
  baseQuery: baseQueryWithLogout,
  tagTypes: ["Task", "Planner"],
  endpoints: (builder) => ({
    getDailyPlanner: builder.query({
      query: (date) => ({ url: "/planner/daily", params: { date } }),
      providesTags: ["Planner"],
    }),
    getWeeklyPlanner: builder.query({
      query: (startDate) => ({ url: "/planner/week", params: { startDate } }),
      providesTags: ["Planner"],
    }),
    createTask: builder.mutation({
      query: (body) => ({ url: "/planner", method: "POST", body }),
      invalidatesTags: ["Planner"],
    }),
    updateTask: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/planner/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Planner"],
    }),
    reorderTasks: builder.mutation({
      query: (updates) => ({ url: "/planner/reorder", method: "PATCH", body: updates }),
      invalidatesTags: ["Planner"],
    }),
    deleteTask: builder.mutation({
      query: (id) => ({ url: `/planner/${id}`, method: "DELETE" }),
      invalidatesTags: ["Planner"],
    }),
  }),
});

export const {
  useGetDailyPlannerQuery,
  useGetWeeklyPlannerQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useReorderTasksMutation,
  useDeleteTaskMutation,
} = plannerApi;
