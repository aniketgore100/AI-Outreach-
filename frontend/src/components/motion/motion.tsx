"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import type { ReactNode } from "react";

const pageTransition = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

const subtleSpring: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 30,
  mass: 0.9,
};

type StateProps = {
  "data-state"?: "open" | "closed";
};

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="min-h-full w-full"
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function MotionDialogOverlay(props: React.ComponentProps<typeof motion.div> & StateProps) {
  const { "data-state": state, style, ...rest } = props;

  return (
    <motion.div
      {...rest}
      style={{ pointerEvents: state === "closed" ? "none" : "auto", ...style }}
      initial={false}
      animate={state === "open" ? "open" : "closed"}
      variants={{
        open: { opacity: 1 },
        closed: { opacity: 0 },
      }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    />
  );
}

export function MotionDialogSurface(props: React.ComponentProps<typeof motion.div> & StateProps) {
  const { "data-state": state, style, ...rest } = props;

  return (
    <motion.div
      {...rest}
      style={{
        pointerEvents: state === "closed" ? "none" : "auto",
        transformOrigin: "50% 20%",
        ...style,
      }}
      initial={false}
      animate={state === "open" ? "open" : "closed"}
      variants={{
        open: { opacity: 1, scale: 1, y: 0 },
        closed: { opacity: 0, scale: 0.98, y: 10 },
      }}
      transition={subtleSpring}
    />
  );
}

export function MotionDropdownSurface(props: React.ComponentProps<typeof motion.div> & StateProps) {
  const { "data-state": state, style, ...rest } = props;

  return (
    <motion.div
      {...rest}
      style={{
        pointerEvents: state === "closed" ? "none" : "auto",
        transformOrigin: "top right",
        ...style,
      }}
      initial={false}
      animate={state === "open" ? "open" : "closed"}
      variants={{
        open: { opacity: 1, scale: 1, y: 0 },
        closed: { opacity: 0, scale: 0.98, y: -4 },
      }}
      transition={{ duration: 0.14, ease: "easeOut" }}
    />
  );
}

export { motion, subtleSpring };
