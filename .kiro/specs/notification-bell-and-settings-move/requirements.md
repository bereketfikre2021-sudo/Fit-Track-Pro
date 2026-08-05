# Requirements: Notification Bell & Settings Move

## Overview
Move the Settings shortcut from the top header nav into the Profile page, and replace it with a real-time in-app notification bell. When the admin sends an in_app notification via the admin panel, the user receives it immediately in the bell dropdown and it is auto-marked as read when they open/view it.

## Requirements

### REQ-1: Move Settings out of the header
The Settings gear icon in the top-right header (DashboardLayout.jsx) must be removed. Users must be able to reach Settings via a clearly labelled row/link inside the Profile page (ProfileTab.jsx), placed just below the hero card.

### REQ-2: Notification Bell in the header
Replace the Settings icon slot in the header with a Bell icon (Lucide `Bell`). The bell must show a numeric unread badge when there are unread notifications. The badge must be capped at 99+.

### REQ-3: Fetch in-app notifications from Supabase
On mount and via real-time subscription, fetch all `notifications` rows from Supabase where `user_id = current user` AND `channel = 'in_app'`, ordered by `created_at` descending. Only authenticated users see the bell with data; unauthenticated users see nothing.

### REQ-4: Notification dropdown/panel
Clicking the bell opens a dropdown (desktop) or bottom sheet/drawer (mobile) showing the 20 most recent notifications. Each item shows: title, body (truncated to 2 lines), category badge, and relative timestamp. Unread items are visually distinguished (e.g. a left accent border or highlighted background). The panel has a "Mark all as read" button.

### REQ-5: Auto-mark as read on view (Facebook-style)
When the user opens the notification panel, all currently visible unread notifications are marked as read automatically (set `is_read = true`, `read_at = now()`). This is done client-side via a single Supabase update call, not one-by-one. The badge count drops to zero immediately (optimistic update).

### REQ-6: Real-time updates
Use Supabase Realtime (postgres_changes) to subscribe to INSERT events on the notifications table filtered by `user_id`. New notifications appear at the top of the list and increment the badge without a page reload.

### REQ-7: Empty state
When there are no notifications, show a centred message: "No notifications yet" with the Bell icon.

### REQ-8: Settings entry in Profile page
Add a tappable row labelled "Settings" with a Settings icon and a chevron-right, placed directly below the hero card in ProfileTab.jsx. Tapping it navigates to `/profile/settings`.
