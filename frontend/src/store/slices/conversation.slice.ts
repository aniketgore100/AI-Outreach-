import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/services/api-client";
import { conversationService } from "@/services/conversation.service";
import type { Pagination } from "@/types/lead-list.types";
import type {
  ConversationDetail,
  ConversationStatus,
  ConversationSummary,
  ReplyToConversationPayload,
} from "@/types/conversation.types";
import type { RootState } from "../store";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

interface ConversationsQuery {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
  search?: string;
}

interface ConversationSliceState {
  items: ConversationSummary[];
  pagination: Pagination | null;
  status: AsyncStatus;
  error: string | null;

  current: ConversationDetail | null;
  currentStatus: AsyncStatus;
  currentError: string | null;

  replyStatus: AsyncStatus;
  replyError: string | null;

  actionStatus: AsyncStatus;
  actionError: string | null;
}

const initialState: ConversationSliceState = {
  items: [],
  pagination: null,
  status: "idle",
  error: null,

  current: null,
  currentStatus: "idle",
  currentError: null,

  replyStatus: "idle",
  replyError: null,

  actionStatus: "idle",
  actionError: null,
};

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export const fetchConversations = createAsyncThunk<
  { items: ConversationSummary[]; pagination: Pagination },
  ConversationsQuery | void,
  { state: RootState; rejectValue: string }
>("conversations/fetchAll", async (params, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await conversationService.list(params ?? {}, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const fetchConversation = createAsyncThunk<
  ConversationDetail,
  string,
  { state: RootState; rejectValue: string }
>("conversations/fetchOne", async (id, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await conversationService.getOne(id, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

/** Silent variant for background polling — no loading/error state churn,
 * so it never flickers a skeleton over a thread the user is reading. */
export const refreshConversation = createAsyncThunk<
  ConversationDetail,
  string,
  { state: RootState; rejectValue: string }
>("conversations/refreshOne", async (id, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await conversationService.getOne(id, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const replyToConversation = createAsyncThunk<
  ConversationDetail,
  { id: string; payload: ReplyToConversationPayload },
  { state: RootState; rejectValue: string }
>("conversations/reply", async ({ id, payload }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await conversationService.reply(id, payload, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const markConversationRead = createAsyncThunk<
  ConversationDetail,
  string,
  { state: RootState; rejectValue: string }
>("conversations/markRead", async (id, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await conversationService.markRead(id, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

export const setConversationArchived = createAsyncThunk<
  ConversationDetail,
  { id: string; archived: boolean },
  { state: RootState; rejectValue: string }
>("conversations/setArchived", async ({ id, archived }, { getState, rejectWithValue }) => {
  const { accessToken } = getState().auth;
  if (!accessToken) return rejectWithValue("Not authenticated");

  try {
    return await conversationService.setArchived(id, archived, accessToken);
  } catch (err) {
    return rejectWithValue(extractErrorMessage(err));
  }
});

function upsertItem(items: ConversationSummary[], updated: ConversationDetail) {
  const index = items.findIndex((item) => item.id === updated.id);
  if (index === -1) return items;
  const next = items.slice();
  next[index] = updated;
  return next;
}

const conversationSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    clearCurrentConversation(state) {
      state.current = null;
      state.currentStatus = "idle";
      state.currentError = null;
    },
    clearReplyError(state) {
      state.replyError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Could not load conversations";
      })

      .addCase(fetchConversation.pending, (state) => {
        state.currentStatus = "loading";
        state.currentError = null;
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        state.currentStatus = "succeeded";
        state.current = action.payload;
        state.items = upsertItem(state.items, action.payload);
      })
      .addCase(fetchConversation.rejected, (state, action) => {
        state.currentStatus = "failed";
        state.currentError = action.payload ?? "Could not load this conversation";
      })

      .addCase(refreshConversation.fulfilled, (state, action) => {
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
        state.items = upsertItem(state.items, action.payload);
      })

      .addCase(replyToConversation.pending, (state) => {
        state.replyStatus = "loading";
        state.replyError = null;
      })
      .addCase(replyToConversation.fulfilled, (state, action) => {
        state.replyStatus = "succeeded";
        state.current = action.payload;
        state.items = upsertItem(state.items, action.payload);
      })
      .addCase(replyToConversation.rejected, (state, action) => {
        state.replyStatus = "failed";
        state.replyError = action.payload ?? "Could not send this reply";
      });

    [markConversationRead, setConversationArchived].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.actionStatus = "loading";
          state.actionError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.actionStatus = "succeeded";
          state.current = action.payload;
          state.items = upsertItem(state.items, action.payload);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.actionStatus = "failed";
          state.actionError = action.payload ?? "Could not update this conversation";
        });
    });
  },
});

export const { clearCurrentConversation, clearReplyError } = conversationSlice.actions;
export default conversationSlice.reducer;
