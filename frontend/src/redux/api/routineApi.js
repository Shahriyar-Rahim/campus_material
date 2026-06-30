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
    getFormattedRoutine: builder.query({
      query: ({ dept, level, term, session } = {}) => ({
        url: "/routine/formatted",
        params: { dept, level, term, session },
      }),
    }),
    getRoutineTimeline: builder.query({
      query: ({ dept, level, term, session, from, to }) => ({
        url: "/routine/timeline",
        params: { dept, level, term, session, from, to },
      }),
      providesTags: ["Routine"],
    }),

    suspendDates: builder.mutation({
      query: ({ id, dates, reason }) => ({
        url: `/routine/${id}/suspend`,
        method: "PATCH",
        body: { dates, reason },
      }),
      invalidatesTags: ["Routine"],
    }),

    unsuspendDate: builder.mutation({
      query: ({ id, date }) => ({
        url: `/routine/${id}/unsuspend`,
        method: "PATCH",
        body: { date },
      }),
      invalidatesTags: ["Routine"],
    }),

    addExtraClass: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/routine/${id}/extra`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Routine"],
    }),

    removeExtraClass: builder.mutation({
      query: ({ id, extraId }) => ({
        url: `/routine/${id}/extra/${extraId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Routine"],
    }),
  }),
});

export const {
  useGetMyCoursesQuery,
  useGetMyRoutineQuery,
  useGetFormattedRoutineQuery,
  useGetRoutineTimelineQuery, // new
  useSuspendDatesMutation,
  useUnsuspendDateMutation,
  useAddExtraClassMutation,
  useRemoveExtraClassMutation,
} = routineApi;
