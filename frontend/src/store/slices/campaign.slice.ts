import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/services/api-client";
import { campaignService } from "@/services/campaign.service";
import type { Pagination } from "@/types/lead-list.types";
import type {
  CampaignDetail,
  CampaignStatus,
  CampaignSummary,
  CreateCampaignPayload,
  FinalizeCampaignPayload,
  UpdateCampaignDetailsPayload,
  UpdateCampaignLeadListPayload,
  UpdateFollowUpPayload,
  UpdateInitialOutreachPayload,
  UpdateReplyHandlingPayload,
  UpsertCampaignSchedulePayload,
} from "@/types/campaign.types";
import type { RootState } from "../store";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

interface CampaignsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CampaignStatus;
}

interface CampaignSliceState {
  items: CampaignSummary[];
  pagination: Pagination | null;
  status: AsyncStatus;
  error: string | null;

  current: CampaignDetail | null;
  currentStatus: AsyncStatus;
  currentError: string | null;

  saveStatus: AsyncStatus;
  saveError: string | null;

  finalizeStatus: AsyncStatus;
  finalizeError: string | null;
}

const initialState: CampaignSliceState = {
  items: [],
  pagination: null,
  status: "idle",
  error: null,

  current: null,
  currentStatus: "idle",
  currentError: null,

  saveStatus: "idle",
  saveError: null,

  finalizeStatus: "idle",
  finalizeError: null,
};

/** Patches the matching row in the list (and `current`, if it's the open
 * campaign) with the freshly returned detail instead of refetching the
 * whole list — same intent as `deleteLeadList.fulfilled` filtering
 * `state.items` in lead-list.slice.ts, just an update instead of a removal. */
function applyCampaignUpdate(state: CampaignSliceState, campaign: CampaignDetail) {
  state.items = state.items.map((item) =>
    item.id === campaign.id ? { ...item, status: campaign.status, updatedAt: campaign.updatedAt } : item
  );
  if (state.current?.id === campaign.id) {
    state.current = campaign;
  }
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const fetchCampaigns = createAsyncThunk<
  { items: CampaignSummary[]; pagination: Pagination },
  CampaignsQuery | void,
  { state: RootState; rejectValue: string }
>("campaigns/fetchAll", async (params, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.list(params ?? {}, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const fetchCampaign = createAsyncThunk<CampaignDetail, string, { state: RootState; rejectValue: string }>(
  "campaigns/fetchOne",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await campaignService.getOne(id, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createCampaign = createAsyncThunk<
  CampaignDetail,
  CreateCampaignPayload,
  { state: RootState; rejectValue: string }
>("campaigns/create", async (payload, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.create(payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const updateCampaignDetails = createAsyncThunk<
  CampaignDetail,
  { id: string; payload: UpdateCampaignDetailsPayload },
  { state: RootState; rejectValue: string }
>("campaigns/updateDetails", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.updateDetails(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const updateInitialOutreach = createAsyncThunk<
  CampaignDetail,
  { id: string; payload: UpdateInitialOutreachPayload },
  { state: RootState; rejectValue: string }
>("campaigns/updateInitialOutreach", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.updateInitialOutreach(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const updateReplyHandling = createAsyncThunk<
  CampaignDetail,
  { id: string; payload: UpdateReplyHandlingPayload },
  { state: RootState; rejectValue: string }
>("campaigns/updateReplyHandling", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.updateReplyHandling(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const updateFollowUp = createAsyncThunk<
  CampaignDetail,
  { id: string; payload: UpdateFollowUpPayload },
  { state: RootState; rejectValue: string }
>("campaigns/updateFollowUp", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.updateFollowUp(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const updateCampaignLeadList = createAsyncThunk<
  CampaignDetail,
  { id: string; payload: UpdateCampaignLeadListPayload },
  { state: RootState; rejectValue: string }
>("campaigns/updateLeadList", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.updateLeadList(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const upsertCampaignSchedule = createAsyncThunk<
  CampaignDetail,
  { id: string; payload: UpsertCampaignSchedulePayload },
  { state: RootState; rejectValue: string }
>("campaigns/upsertSchedule", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.upsertSchedule(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const finalizeCampaign = createAsyncThunk<
  CampaignDetail,
  { id: string; payload: FinalizeCampaignPayload },
  { state: RootState; rejectValue: string }
>("campaigns/finalize", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await campaignService.finalize(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const activateCampaign = createAsyncThunk<CampaignDetail, string, { state: RootState; rejectValue: string }>(
  "campaigns/activate",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await campaignService.activate(id, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const pauseCampaign = createAsyncThunk<CampaignDetail, string, { state: RootState; rejectValue: string }>(
  "campaigns/pause",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await campaignService.pause(id, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const resumeCampaign = createAsyncThunk<CampaignDetail, string, { state: RootState; rejectValue: string }>(
  "campaigns/resume",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await campaignService.resume(id, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Every per-step save thunk shares saveStatus/saveError and refreshes
// `current` with the full detail the API returns — the stepper only needs
// to know "is something saving right now", not which endpoint it was.
const STEP_SAVE_THUNKS = [
  createCampaign,
  updateCampaignDetails,
  updateInitialOutreach,
  updateReplyHandling,
  updateFollowUp,
  updateCampaignLeadList,
  upsertCampaignSchedule,
];

const campaignSlice = createSlice({
  name: "campaigns",
  initialState,
  reducers: {
    clearCurrentCampaign(state) {
      state.current = null;
      state.currentStatus = "idle";
      state.currentError = null;
    },
    clearSaveError(state) {
      state.saveError = null;
    },
    clearFinalizeStatus(state) {
      state.finalizeStatus = "idle";
      state.finalizeError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load campaigns";
      })

      .addCase(fetchCampaign.pending, (state) => {
        state.currentStatus = "loading";
        state.currentError = null;
      })
      .addCase(fetchCampaign.fulfilled, (state, action) => {
        state.currentStatus = "succeeded";
        state.current = action.payload;
      })
      .addCase(fetchCampaign.rejected, (state, action) => {
        state.currentStatus = "failed";
        state.currentError = action.payload ?? "Could not load this campaign";
      })

      .addCase(finalizeCampaign.pending, (state) => {
        state.finalizeStatus = "loading";
        state.finalizeError = null;
      })
      .addCase(finalizeCampaign.fulfilled, (state, action) => {
        state.finalizeStatus = "succeeded";
        state.current = action.payload;
      })
      .addCase(finalizeCampaign.rejected, (state, action) => {
        state.finalizeStatus = "failed";
        state.finalizeError = action.payload ?? "Could not save this campaign";
      })

      .addCase(activateCampaign.fulfilled, (state, action) => applyCampaignUpdate(state, action.payload))
      .addCase(pauseCampaign.fulfilled, (state, action) => applyCampaignUpdate(state, action.payload))
      .addCase(resumeCampaign.fulfilled, (state, action) => applyCampaignUpdate(state, action.payload));

    STEP_SAVE_THUNKS.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.saveStatus = "loading";
          state.saveError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.saveStatus = "succeeded";
          state.current = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saveStatus = "failed";
          state.saveError = action.payload ?? "Could not save this step";
        });
    });
  },
});

export const { clearCurrentCampaign, clearSaveError, clearFinalizeStatus } = campaignSlice.actions;
export default campaignSlice.reducer;
