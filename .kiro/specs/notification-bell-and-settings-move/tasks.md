# Implementation Plan: Notification Bell & Settings Move

## Overview
Move the Settings shortcut from the header into the Profile page, and replace it with a real-time in-app notification bell that fetches notifications sent from the admin panel, auto-marks them as read on view.

## Tasks

- [x] 1. Create useNotifications hook
  - Create `src/lib/useNotifications.js` — custom React hook
  - Fetches up to 50 in_app notifications for the current authenticated user from Supabase (channel='in_app', ordered by created_at desc)
  - Subscribes to Supabase Realtime INSERT events on the notifications table filtered by user_id, prepending new items to state
  - Exposes: notifications, unreadCount, loading, isOpen, openPanel, closePanel, markAllRead
  - openPanel sets isOpen=true and calls markAllRead if unreadCount > 0
  - markAllRead optimistically sets all local is_read=true and unreadCount=0, then sends a single Supabase UPDATE for all unread rows belonging to the user
  - Cleans up Realtime subscription on unmount
  - Returns early with empty state if no authenticated user

- [x] 2. Create NotificationBell component
  - Create `src/components/NotificationBell.jsx`
  - Uses useAuth and useNotifications hook
  - Returns null if user is not authenticated
  - Renders a button with Lucide Bell icon (h-[18px] w-[18px] strokeWidth=2), styled like the old Settings button (h-9 w-9 rounded-lg flex items-center justify-center)
  - Renders an unread count badge (absolute, bg-destructive text-primary-foreground, text-[9px], rounded-full) capped at 99+ when unreadCount > 0
  - On click: calls openPanel()
  - When isOpen=true renders the notification panel:
    - Desktop (md+): absolute dropdown pinned below-right of bell, w-80 max-h-96 overflow-y-auto rounded-xl border shadow-lg bg-background z-50
    - Mobile: fixed bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl border-t shadow-lg bg-background z-50
    - Panel header: "Notifications" label (font-semibold text-sm) + "Mark all as read" text button (text-xs text-primary, hidden once all are read)
    - Notification rows: unread items get border-l-2 border-primary and bg-primary/5; unread title is font-semibold; body is line-clamp-2 text-xs text-muted-foreground; footer shows category Badge (variant secondary) + relative time helper
    - Relative time helper: under 1 min = "just now", under 1 hr = "Xm ago", under 24 hr = "Xh ago", under 7 days = "Xd ago", else locale date string
    - Empty state: centered Bell icon (h-8 w-8 text-muted-foreground) + "No notifications yet" (text-sm text-muted-foreground)
    - Loading state: show a small spinner while initial fetch is in progress
    - Click-outside closes panel via a transparent backdrop div (fixed inset-0 z-40 behind the panel)

- [x] 3. Update DashboardLayout to use NotificationBell
  - Edit `src/pages/DashboardLayout.jsx`
  - Import NotificationBell from '../components/NotificationBell'
  - Remove the Settings Link button from the header right section (the <Link to="/profile/settings"> with the Settings icon)
  - Remove Settings from the lucide-react import (Dumbbell and User remain)
  - Place <NotificationBell /> in the same position, before the profile avatar Link

- [x] 4. Add Settings entry to ProfileTab
  - Edit `src/components/ProfileTab.jsx`
  - Add Settings to the lucide-react imports if not already there; add ChevronRight
  - Add a tappable Settings row directly after the hero Card and before the first AccordionCard
  - Use a Link to="/profile/settings" wrapping a Card element
  - Inside: flex row with Settings icon (h-4 w-4 text-primary), "Settings" text (text-sm font-semibold), and ChevronRight (h-4 w-4 text-muted-foreground) pushed to the right
  - Hover style: hover:bg-muted/30 transition-colors, rounded-xl, px-4 py-3.5 — matching AccordionCard header style

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "4"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] }
  ],
  "dependencies": {
    "2": ["1"],
    "3": ["2"]
  }
}
```

## Notes
- The admin already writes to the `notifications` table with channel='in_app', so no admin changes are needed.
- Supabase RLS must allow users to SELECT and UPDATE their own notification rows — verify this exists or add migrations if missing.
- The Realtime subscription uses the postgres_changes event for INSERT only; mark-as-read is driven purely by the client.
