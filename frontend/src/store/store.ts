import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/auth.slice";
import gmailConnectionReducer from "./slices/gmail-connection.slice";
import leadListReducer from "./slices/lead-list.slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leadLists: leadListReducer,
    gmailConnections: gmailConnectionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
