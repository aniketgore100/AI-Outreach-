# Frontend Feature Tracker

## Implemented

- Register page with split-screen layout
- Reusable shadcn-style UI primitives
- React Hook Form + Zod validation
- Password visibility toggle
- Responsive auth layout
- `/register` route
- `/login` placeholder route for sign-in CTA
- Shared utility helper for class merging

## UI Decisions

- Kept the left side brand-led and minimal
- Kept the form compact and aligned with AI SaaS patterns
- Used one accent color and neutral surfaces
- Added explicit validation messages and focus states

## Next Items

- Connect register submit to backend auth API
- Replace login placeholder with a real sign-in flow
- Add toast feedback for success/failure
- Add dark-mode-specific visual QA
- Wire session handling after authentication
