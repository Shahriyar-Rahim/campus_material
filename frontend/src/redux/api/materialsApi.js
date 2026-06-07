import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import { logout } from "../features/authSlice";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithRateLimit = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    api.dispatch(logout());
  }

  if (result.error?.status === 429) {
    const body = result.error.data;
    return {
      error: {
        status: 429,
        data: {
          rateLimitInfo: {
            message:
              body?.message ||
              "Upload limit reached. Please wait before uploading again.",
            retryAfterSeconds: body?.retryAfterSeconds ?? 60,
            resetAt: body?.resetAt ?? null,
            limit: body?.limit ?? 5,
            used: body?.used ?? 5,
            remaining: body?.remaining ?? 0,
          },
        },
      },
    };
  }

  return result;
};

export const materialsApi = createApi({
  reducerPath: "materialsApi",
  baseQuery: baseQueryWithRateLimit,
  tagTypes: ["Material", "MaterialStats"],
  endpoints: (builder) => ({
    getMaterials: builder.query({
      query: ({ dept, level, term, category, courseCode, page = 1 }) => ({
        url: "/materials",
        params: { dept, level, term, category, courseCode, page },
      }),
      providesTags: (result, error, { dept, level, term, category }) =>
        result
          ? [
              ...result.data.map(({ _id }) => ({ type: "Material", id: _id })),
              { type: "Material", id: `${dept}-L${level}T${term}-${category}` },
            ]
          : [{ type: "Material", id: `${dept}-L${level}T${term}-${category}` }],
      keepUnusedDataFor: 120,
    }),

    uploadMaterial: builder.mutation({
      query: (formData) => ({
        url: "/materials/upload",
        method: "POST",
        body: formData,
        formData: true,
      }),
      invalidatesTags: (result, error, arg) => {
        if (error?.status === 429) return [];
        return [
          {
            type: "Material",
            id: `${arg.get("dept")}-L${arg.get("level")}T${arg.get("term")}-${arg.get("category")}`,
          },
          { type: "MaterialStats" },
        ];
      },
    }),

    pinMaterial: builder.mutation({
      query: (id) => ({ url: `/materials/${id}/pin`, method: "PATCH" }),
      invalidatesTags: (result, error, id) => [{ type: "Material", id }],
    }),

    unpinMaterial: builder.mutation({
      query: (id) => ({ url: `/materials/${id}/unpin`, method: "PATCH" }),
      invalidatesTags: (result, error, id) => [{ type: "Material", id }],
    }),

    forwardMaterial: builder.mutation({
      query: ({ id, targets }) => ({
        url: `/materials/${id}/forward`,
        method: "POST",
        body: { targets },
      }),
      invalidatesTags: ["Material"],
    }),

    deleteMaterial: builder.mutation({
      query: ({ id, hard = false }) => ({
        url: `/materials/${id}`,
        method: "DELETE",
        params: hard ? { hard: true } : {}, // Let RTK Query attach the query string safely
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Material", id },
        { type: "MaterialStats" },
      ],
    }),

    updateMaterialMeta: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/materials/${id}`,
        method: "PATCH",
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Material", id }],
    }),

    getMaterialStats: builder.query({
      query: () => "/materials/stats",
      providesTags: ["MaterialStats"],
    }),
  }),
});

export const {
  useGetMaterialsQuery,
  useUploadMaterialMutation,
  usePinMaterialMutation,
  useUnpinMaterialMutation,
  useForwardMaterialMutation,
  useDeleteMaterialMutation,
  useUpdateMaterialMetaMutation,
  useGetMaterialStatsQuery,
} = materialsApi;

export const parseUploadError = (error) => {
  if (!error) return { isRateLimited: false, rateLimitInfo: null };

  if (error.status === 429) {
    return {
      isRateLimited: true,
      rateLimitInfo: error.data?.rateLimitInfo || {
        message: "Too many uploads. Please wait.",
        retryAfterSeconds: 60,
        resetAt: null,
      },
    };
  }

  return {
    isRateLimited: false,
    rateLimitInfo: null,
    errorMessage: error.data?.message || "Upload failed. Please try again.",
  };
};
