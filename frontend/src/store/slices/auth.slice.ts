import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import type { AuthSession, LoginPayload, RegisterPayload, User } from "@/types/auth.types";
import type { RootState } from "../store";

type AuthStatus = "idle" | "loading" | "succeeded" | "failed";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  isInitialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: "idle",
  isInitialized: false,
  error: null,
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const registerUser = createAsyncThunk<AuthSession, RegisterPayload, { rejectValue: string }>(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.register(payload);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const loginUser = createAsyncThunk<AuthSession, LoginPayload, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      return await authService.login(payload);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_arg, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchCurrentUser = createAsyncThunk<User, void, { state: RootState; rejectValue: string }>(
  "auth/me",
  async (_arg, { getState, rejectWithValue }) => {
    const { accessToken } = getState().auth;

    if (!accessToken) {
      return rejectWithValue("Not authenticated");
    }

    try {
      return await authService.me(accessToken);
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const restoreSession = createAsyncThunk<AuthSession, void, { rejectValue: string }>(
  "auth/restoreSession",
  async (_arg, { rejectWithValue }) => {
    try {
      return await authService.refresh();
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Registration failed";
      })

      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Login failed";
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.status = "idle";
        state.error = null;
      })

      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
      })

      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isInitialized = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isInitialized = true;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
