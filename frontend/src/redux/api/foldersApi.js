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

export const foldersApi = createApi({
  reducerPath: "foldersApi",
  baseQuery: baseQueryWithLogout,
  tagTypes: ["Folder"],
  endpoints: (builder) => ({

    // List folders for a specific level/term section
    getFolders: builder.query({
      query: ({ dept, level, term }) => ({
        url: "/folders",
        params: { dept, level, term },
      }),
      providesTags: (result, error, { dept, level, term }) =>
        result
          ? [
              ...result.data.map(({ _id }) => ({ type: "Folder", id: _id })),
              { type: "Folder", id: `${dept}-L${level}T${term}` },
            ]
          : [{ type: "Folder", id: `${dept}-L${level}T${term}` }],
    }),

    // All folders for a dept (for the filter panel — all levels/terms)
    getAllFoldersByDept: builder.query({
      query: (dept) => ({ url: "/folders/all", params: { dept } }),
      providesTags: (result, error, dept) => [{ type: "Folder", id: `dept-${dept}` }],
    }),

    // Single folder
    getFolderById: builder.query({
      query: (id) => `/folders/${id}`,
      providesTags: (result, error, id) => [{ type: "Folder", id }],
    }),

    // Create folder
    createFolder: builder.mutation({
      query: (body) => ({ url: "/folders", method: "POST", body }),
      invalidatesTags: (result, error, arg) => [
        { type: "Folder", id: `${arg.dept}-L${arg.level}T${arg.term}` },
        { type: "Folder", id: `dept-${arg.dept}` },
      ],
    }),

    // Update folder
    updateFolder: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/folders/${id}`, method: "PATCH", body }),
      invalidatesTags: (result, error, { id }) => [{ type: "Folder", id }],
    }),

    // Delete folder
    deleteFolder: builder.mutation({
      query: ({ id, hard = false }) => ({
        url: `/folders/${id}${hard ? "?hard=true" : ""}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Folder"],
    }),
  }),
});

export const {
  useGetFoldersQuery,
  useGetAllFoldersByDeptQuery,
  useGetFolderByIdQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} = foldersApi;
