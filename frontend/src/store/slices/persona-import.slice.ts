import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/services/api-client";
import { personaImportService } from "@/services/persona-import.service";
import type {
  PersonaCandidatesPagination,
  PersonaSourceEmail,
  PersonaSourceSet,
  StartImportPayload,
  UpdateSelectionPayload,
} from "@/types/persona-import.types";
import type { RootState } from "../store";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

interface PersonaImportState {
  currentSet: PersonaSourceSet | null;
  startStatus: AsyncStatus;
  startError: string | null;

  candidates: PersonaSourceEmail[];
  pagination: PersonaCandidatesPagination | null;
  candidatesStatus: AsyncStatus;
  candidatesError: string | null;

  updateSelectionStatus: AsyncStatus;
  updateSelectionError: string | null;

  confirmStatus: AsyncStatus;
  confirmError: string | null;
}

const initialState: PersonaImportState = {
  currentSet: null,
  startStatus: "idle",
  startError: null,

  candidates: [],
  pagination: null,
  candidatesStatus: "idle",
  candidatesError: null,

  updateSelectionStatus: "idle",
  updateSelectionError: null,

  confirmStatus: "idle",
  confirmError: null,
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const startPersonaImport = createAsyncThunk<
  PersonaSourceSet,
  { gmailConnectionId: string; payload: StartImportPayload },
  { state: RootState; rejectValue: string }
>("personaImport/start", async ({ gmailConnectionId, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await personaImportService.startImport(gmailConnectionId, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const fetchPersonaCandidates = createAsyncThunk<
  { set: PersonaSourceSet; items: PersonaSourceEmail[]; pagination: PersonaCandidatesPagination },
  { setId: string; page?: number; limit?: number },
  { state: RootState; rejectValue: string }
>("personaImport/fetchCandidates", async ({ setId, page, limit }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await personaImportService.listCandidates(setId, accessToken, page, limit);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const updatePersonaSelection = createAsyncThunk<
  { selectedCount: number },
  { setId: string; payload: UpdateSelectionPayload },
  { state: RootState; rejectValue: string }
>("personaImport/updateSelection", async ({ setId, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await personaImportService.updateSelection(setId, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const confirmPersonaImport = createAsyncThunk<
  PersonaSourceSet,
  string,
  { state: RootState; rejectValue: string }
>("personaImport/confirm", async (setId, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await personaImportService.confirmImport(setId, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

const personaImportSlice = createSlice({
  name: "personaImport",
  initialState,
  reducers: {
    resetPersonaImport(state) {
      Object.assign(state, initialState);
    },
    /** Optimistic local toggle so checkbox clicks feel instant — the
     * updatePersonaSelection thunk persists the same change to the server. */
    setCandidateIncluded(state, action: { payload: { id: string; included: boolean } }) {
      const candidate = state.candidates.find((item) => item.id === action.payload.id);
      if (candidate) candidate.included = action.payload.included;
    },
    setAllCandidatesIncluded(state, action: { payload: boolean }) {
      state.candidates.forEach((candidate) => {
        candidate.included = action.payload;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startPersonaImport.pending, (state) => {
        state.startStatus = "loading";
        state.startError = null;
      })
      .addCase(startPersonaImport.fulfilled, (state, action) => {
        state.startStatus = "succeeded";
        state.currentSet = action.payload;
      })
      .addCase(startPersonaImport.rejected, (state, action) => {
        state.startStatus = "failed";
        state.startError = action.payload ?? "Could not start the sent folder import";
      })

      .addCase(fetchPersonaCandidates.pending, (state) => {
        state.candidatesStatus = "loading";
        state.candidatesError = null;
      })
      .addCase(fetchPersonaCandidates.fulfilled, (state, action) => {
        state.candidatesStatus = "succeeded";
        state.currentSet = action.payload.set;
        state.candidates = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPersonaCandidates.rejected, (state, action) => {
        state.candidatesStatus = "failed";
        state.candidatesError = action.payload ?? "Could not load candidate emails";
      })

      .addCase(updatePersonaSelection.pending, (state) => {
        state.updateSelectionStatus = "loading";
        state.updateSelectionError = null;
      })
      .addCase(updatePersonaSelection.fulfilled, (state, action) => {
        state.updateSelectionStatus = "succeeded";
        if (state.currentSet) state.currentSet.selectedCount = action.payload.selectedCount;
      })
      .addCase(updatePersonaSelection.rejected, (state, action) => {
        state.updateSelectionStatus = "failed";
        state.updateSelectionError = action.payload ?? "Could not update the selection";
      })

      .addCase(confirmPersonaImport.pending, (state) => {
        state.confirmStatus = "loading";
        state.confirmError = null;
      })
      .addCase(confirmPersonaImport.fulfilled, (state, action) => {
        state.confirmStatus = "succeeded";
        state.currentSet = action.payload;
      })
      .addCase(confirmPersonaImport.rejected, (state, action) => {
        state.confirmStatus = "failed";
        state.confirmError = action.payload ?? "Could not confirm this selection";
      });
  },
});

export const { resetPersonaImport, setCandidateIncluded, setAllCandidatesIncluded } = personaImportSlice.actions;
export default personaImportSlice.reducer;
