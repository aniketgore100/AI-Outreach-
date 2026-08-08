"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Provider } from "react-redux";

import { store } from "./store";
import { useAppDispatch } from "./hooks";
import { restoreSession } from "./slices/auth.slice";

function SessionBootstrap() {
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    void dispatch(restoreSession());
  }, [dispatch]);

  return null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <MotionConfig reducedMotion="user">
        <SessionBootstrap />
        {children}
      </MotionConfig>
    </Provider>
  );
}
