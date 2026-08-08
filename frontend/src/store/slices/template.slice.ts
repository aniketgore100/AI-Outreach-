import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/services/api-client";
import { templateService } from "@/services/template.service";
import type { Pagination } from "@/types/lead-list.types";
import type {
  EmailTemplate,
  SaveTemplatePayload,
  SendTestEmailPayload,
  SendTestEmailResult,
  TemplateStatus,
  UpdateTemplatePayload,
} from "@/types/template.types";
import type { RootState } from "../store";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

interface TemplatesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: TemplateStatus;
}

interface TemplateSliceState {
  items: EmailTemplate[];
  pagination: Pagination | null;
  status: AsyncStatus;
  error: string | null;

  current: EmailTemplate | null;
  currentStatus: AsyncStatus;

  saveStatus: AsyncStatus;
  saveError: string | null;

  duplicateStatus: AsyncStatus;
  duplicateError: string | null;

  sendTestStatus: AsyncStatus;
  sendTestError: string | null;
  sendTestResult: SendTestEmailResult | null;
}

const initialState: TemplateSliceState = {
  items: [],
  pagination: null,
  status: "idle",
  error: null,

  current: null,
  currentStatus: "idle",

  saveStatus: "idle",
  saveError: null,

  duplicateStatus: "idle",
  duplicateError: null,

  sendTestStatus: "idle",
  sendTestError: null,
  sendTestResult: null,
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const fetchTemplates = createAsyncThunk<
  { items: EmailTemplate[]; pagination: Pagination },
  TemplatesQuery | void,
  { state: RootState; rejectValue: string }
>("templates/fetchAll", async (params, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await templateService.list(params ?? {}, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const fetchTemplate = createAsyncThunk<EmailTemplate, string, { state: RootState; rejectValue: string }>(
  "templates/fetchOne",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await templateService.getOne(id, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createTemplate = createAsyncThunk<EmailTemplate, SaveTemplatePayload, { state: RootState; rejectValue: string }>(
  "templates/create",
  async (payload, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await templateService.create(payload, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateTemplate = createAsyncThunk<
  EmailTemplate,
  { id: string; payload: UpdateTemplatePayload },
  { state: RootState; rejectValue: string }
>("templates/update", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await templateService.update(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const deleteTemplate = createAsyncThunk<string, string, { state: RootState; rejectValue: string }>(
  "templates/delete",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      await templateService.remove(id, accessToken);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const duplicateTemplate = createAsyncThunk<EmailTemplate, string, { state: RootState; rejectValue: string }>(
  "templates/duplicate",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await templateService.duplicate(id, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const sendTestEmail = createAsyncThunk<
  SendTestEmailResult,
  { id: string; payload: SendTestEmailPayload },
  { state: RootState; rejectValue: string }
>("templates/sendTest", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await templateService.sendTest(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

const templateSlice = createSlice({
  name: "templates",
  initialState,
  reducers: {
    clearCurrentTemplate(state) {
      state.current = null;
      state.currentStatus = "idle";
    },
    clearSaveError(state) {
      state.saveError = null;
    },
    clearSendTestResult(state) {
      state.sendTestResult = null;
      state.sendTestError = null;
      state.sendTestStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load templates";
      })

      .addCase(fetchTemplate.pending, (state) => {
        state.currentStatus = "loading";
      })
      .addCase(fetchTemplate.fulfilled, (state, action) => {
        state.currentStatus = "succeeded";
        state.current = action.payload;
      })
      .addCase(fetchTemplate.rejected, (state, action) => {
        state.currentStatus = "failed";
        state.error = action.payload ?? "Could not load this template";
      })

      .addCase(createTemplate.pending, (state) => {
        state.saveStatus = "loading";
        state.saveError = null;
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.saveStatus = "succeeded";
        state.current = action.payload;
      })
      .addCase(createTemplate.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.saveError = action.payload ?? "Could not create this template";
      })

      .addCase(updateTemplate.pending, (state) => {
        state.saveStatus = "loading";
        state.saveError = null;
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        state.saveStatus = "succeeded";
        state.current = action.payload;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(updateTemplate.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.saveError = action.payload ?? "Could not save this template";
      })

      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })

      .addCase(duplicateTemplate.pending, (state) => {
        state.duplicateStatus = "loading";
        state.duplicateError = null;
      })
      .addCase(duplicateTemplate.fulfilled, (state, action) => {
        state.duplicateStatus = "succeeded";
        state.items = [action.payload, ...state.items];
      })
      .addCase(duplicateTemplate.rejected, (state, action) => {
        state.duplicateStatus = "failed";
        state.duplicateError = action.payload ?? "Could not duplicate this template";
      })

      .addCase(sendTestEmail.pending, (state) => {
        state.sendTestStatus = "loading";
        state.sendTestError = null;
        state.sendTestResult = null;
      })
      .addCase(sendTestEmail.fulfilled, (state, action) => {
        state.sendTestStatus = "succeeded";
        state.sendTestResult = action.payload;
      })
      .addCase(sendTestEmail.rejected, (state, action) => {
        state.sendTestStatus = "failed";
        state.sendTestError = action.payload ?? "Could not send the test email";
      });
  },
});

export const { clearCurrentTemplate, clearSaveError, clearSendTestResult } = templateSlice.actions;
export default templateSlice.reducer;
