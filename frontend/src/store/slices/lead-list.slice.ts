import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/services/api-client";
import { leadListService } from "@/services/lead-list.service";
import type {
  CreateLeadListPayload,
  Lead,
  LeadListDetail,
  LeadListSummary,
  Pagination,
} from "@/types/lead-list.types";
import type { RootState } from "../store";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

interface LeadsQuery {
  page?: number;
  limit?: number;
  search?: string;
  companyName?: string;
  jobTitle?: string;
  location?: string;
}

interface LeadListState {
  items: LeadListSummary[];
  pagination: Pagination | null;
  status: AsyncStatus;
  error: string | null;

  current: LeadListDetail | null;
  currentStatus: AsyncStatus;

  leads: Lead[];
  leadsPagination: Pagination | null;
  leadsStatus: AsyncStatus;
  leadsError: string | null;

  selectedLead: Lead | null;

  importStatus: AsyncStatus;
  importError: string | null;
}

const initialState: LeadListState = {
  items: [],
  pagination: null,
  status: "idle",
  error: null,

  current: null,
  currentStatus: "idle",

  leads: [],
  leadsPagination: null,
  leadsStatus: "idle",
  leadsError: null,

  selectedLead: null,

  importStatus: "idle",
  importError: null,
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const fetchLeadLists = createAsyncThunk<
  { items: LeadListSummary[]; pagination: Pagination },
  { page?: number; limit?: number; search?: string } | void,
  { state: RootState; rejectValue: string }
>("leadLists/fetchAll", async (params, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await leadListService.list(params ?? {}, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const importLeadList = createAsyncThunk<LeadListDetail, CreateLeadListPayload, { state: RootState; rejectValue: string }>(
  "leadLists/import",
  async (payload, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await leadListService.create(payload, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchLeadList = createAsyncThunk<LeadListDetail, string, { state: RootState; rejectValue: string }>(
  "leadLists/fetchOne",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await leadListService.getOne(id, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteLeadList = createAsyncThunk<string, string, { state: RootState; rejectValue: string }>(
  "leadLists/delete",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      await leadListService.remove(id, accessToken);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchLeads = createAsyncThunk<
  { items: Lead[]; pagination: Pagination },
  { leadListId: string; query: LeadsQuery },
  { state: RootState; rejectValue: string }
>("leadLists/fetchLeads", async ({ leadListId, query }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await leadListService.listLeads(leadListId, query, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const fetchLead = createAsyncThunk<
  Lead,
  { leadListId: string; leadId: string },
  { state: RootState; rejectValue: string }
>("leadLists/fetchLead", async ({ leadListId, leadId }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await leadListService.getLead(leadListId, leadId, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

const leadListSlice = createSlice({
  name: "leadLists",
  initialState,
  reducers: {
    clearImportError(state) {
      state.importError = null;
    },
    clearSelectedLead(state) {
      state.selectedLead = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeadLists.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchLeadLists.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchLeadLists.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load lead lists";
      })

      .addCase(importLeadList.pending, (state) => {
        state.importStatus = "loading";
        state.importError = null;
      })
      .addCase(importLeadList.fulfilled, (state) => {
        state.importStatus = "succeeded";
      })
      .addCase(importLeadList.rejected, (state, action) => {
        state.importStatus = "failed";
        state.importError = action.payload ?? "Could not import this lead list";
      })

      .addCase(fetchLeadList.pending, (state) => {
        state.currentStatus = "loading";
      })
      .addCase(fetchLeadList.fulfilled, (state, action) => {
        state.currentStatus = "succeeded";
        state.current = action.payload;
      })
      .addCase(fetchLeadList.rejected, (state) => {
        state.currentStatus = "failed";
        state.current = null;
      })

      .addCase(deleteLeadList.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })

      .addCase(fetchLeads.pending, (state) => {
        state.leadsStatus = "loading";
        state.leadsError = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.leadsStatus = "succeeded";
        state.leads = action.payload.items;
        state.leadsPagination = action.payload.pagination;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.leadsStatus = "failed";
        state.leadsError = action.payload ?? "Could not load leads";
      })

      .addCase(fetchLead.fulfilled, (state, action) => {
        state.selectedLead = action.payload;
      });
  },
});

export const { clearImportError, clearSelectedLead } = leadListSlice.actions;
export default leadListSlice.reducer;
