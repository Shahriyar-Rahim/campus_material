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

const withLogout = async (args, api, extra) => {
  const result = await baseQuery(args, api, extra);
  if (result.error?.status === 401) api.dispatch(logout());
  return result;
};

export const sessionsApi = createApi({
  reducerPath: "sessionsApi",
  baseQuery: withLogout,
  tagTypes: ["Session"],
  endpoints: (builder) => ({
    getSessions: builder.query({
      query: () => "/sessions",
      providesTags: ["Session"],
    }),
    getCurrentSession: builder.query({
      query: () => "/sessions/current",
      providesTags: ["Session"],
    }),
    createSession: builder.mutation({
      query: (body) => ({ url: "/sessions", method: "POST", body }),
      invalidatesTags: ["Session"],
    }),
    updateSession: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/sessions/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Session"],
    }),
    deleteSession: builder.mutation({
      query: (id) => ({ url: `/sessions/${id}`, method: "DELETE" }),
      invalidatesTags: ["Session"],
    }),
    assignSession: builder.mutation({
      query: ({ id, sections, overwrite = false }) => ({
        url: `/sessions/${id}/assign`,
        method: "POST",
        body: { sections, overwrite },
      }),
      invalidatesTags: ["Session"],
    }),
  }),
});

export const {
  useGetSessionsQuery,
  useGetCurrentSessionQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useAssignSessionMutation,
} = sessionsApi;
