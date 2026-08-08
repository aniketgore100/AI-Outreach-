import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/services/api-client";
import { gmailConnectionService } from "@/services/gmail-connection.service";
import type { GmailConnection, GmailConnectionsState } from "@/types/gmail-connection.types";
import type { RootState } from "../store";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

interface GmailConnectionSliceState extends GmailConnectionsState {
  status: AsyncStatus;
  error: string | null;
  connectStatus: AsyncStatus;
  connectError: string | null;
}

const initialState: GmailConnectionSliceState = {
  connections: [],
  limit: 0,
  used: 0,
  status: "idle",
  error: null,
  connectStatus: "idle",
  connectError: null,
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const fetchGmailConnections = createAsyncThunk<GmailConnectionsState, void, { state: RootState; rejectValue: string }>(
  "gmailConnections/fetchAll",
  async (_arg, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await gmailConnectionService.list(accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const startGoogleOAuth = createAsyncThunk<{ authorizationUrl: string }, string | undefined, { state: RootState; rejectValue: string }>(
  "gmailConnections/startGoogleOAuth",
  async (loginHint, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await gmailConnectionService.startGoogleOAuth(accessToken, loginHint);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const disconnectGmailAccount = createAsyncThunk<GmailConnection, string, { state: RootState; rejectValue: string }>(
  "gmailConnections/disconnect",
  async (id, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;
    if (!accessToken) return rejectWithValue("Not authenticated");

    try {
      return await gmailConnectionService.disconnect(id, accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

const gmailConnectionSlice = createSlice({
  name: "gmailConnections",
  initialState,
  reducers: {
    clearConnectError(state) {
      state.connectError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGmailConnections.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchGmailConnections.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.connections = action.payload.connections;
        state.limit = action.payload.limit;
        state.used = action.payload.used;
      })
      .addCase(fetchGmailConnections.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load Gmail connections";
      })

      .addCase(startGoogleOAuth.pending, (state) => {
        state.connectStatus = "loading";
        state.connectError = null;
      })
      .addCase(startGoogleOAuth.fulfilled, (state) => {
        state.connectStatus = "succeeded";
      })
      .addCase(startGoogleOAuth.rejected, (state, action) => {
        state.connectStatus = "failed";
        state.connectError = action.payload ?? "Could not start Google OAuth";
      })

      .addCase(disconnectGmailAccount.fulfilled, (state, action) => {
        const index = state.connections.findIndex((connection) => connection.id === action.payload.id);
        if (index >= 0) {
          state.connections[index] = action.payload;
        }
        state.used = state.connections.filter((connection) => connection.status === "connected").length;
      });
  },
});

export const { clearConnectError } = gmailConnectionSlice.actions;
export default gmailConnectionSlice.reducer;
