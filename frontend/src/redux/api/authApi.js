import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { setCredentials, logout } from "../features/authSlice";

const authBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const authBaseQueryWithLogout = async (args, api, extraOptions) => {
  const result = await authBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) api.dispatch(logout());
  return result;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: authBaseQueryWithLogout,
  tagTypes: ["User"],
  endpoints: (builder) => ({
    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["User"],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.data.user, token: undefined }));
        } catch {}
      },
    }),
    updateProfile: builder.mutation({
      query: (formData) => ({ url: "/auth/update-profile", method: "PATCH", body: formData, formData: true }),
      invalidatesTags: ["User"],
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: "/auth/change-password", method: "PATCH", body }),
    }),
  }),
});

export const { useGetMeQuery, useUpdateProfileMutation, useChangePasswordMutation } = authApi;
