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

export const requestsApi = createApi({
  reducerPath: "requestsApi",
  baseQuery: baseQueryWithLogout,
  tagTypes: ["Request"],
  endpoints: (builder) => ({
    createRequest: builder.mutation({
      query: (body) => ({ url: "/requests", method: "POST", body }),
      invalidatesTags: ["Request"],
    }),
    getMyRequests: builder.query({
      query: () => "/requests/my",
      providesTags: ["Request"],
    }),
    getRequests: builder.query({
      query: ({ status, page = 1 } = {}) => ({
        url: "/requests",
        params: { status, page },
      }),
      providesTags: ["Request"],
    }),
    updateRequestStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/requests/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Request"],
    }),
    replyToRequest: builder.mutation({
      query: ({ id, reply }) => ({
        url: `/requests/${id}/reply`,
        method: "PATCH",
        body: { reply },
      }),
      invalidatesTags: ["Request"],
    }),
    deleteRequest: builder.mutation({
      query: (id) => ({ url: `/requests/${id}`, method: "DELETE" }),
      invalidatesTags: ["Request"],
    }),
  }),
});

export const {
  useCreateRequestMutation,
  useGetMyRequestsQuery,
  useGetRequestsQuery,
  useUpdateRequestStatusMutation,
  useReplyToRequestMutation,
  useDeleteRequestMutation,
} = requestsApi;