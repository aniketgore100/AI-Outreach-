import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./slices/auth.slice";
import campaignReducer from "./slices/campaign.slice";
import conversationReducer from "./slices/conversation.slice";
import gmailConnectionReducer from "./slices/gmail-connection.slice";
import leadListReducer from "./slices/lead-list.slice";
import personaImportReducer from "./slices/persona-import.slice";
import templateReducer from "./slices/template.slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leadLists: leadListReducer,
    gmailConnections: gmailConnectionReducer,
    templates: templateReducer,
    campaigns: campaignReducer,
    conversations: conversationReducer,
    personaImport: personaImportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
