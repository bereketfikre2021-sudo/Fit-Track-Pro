# Design: Notification Bell & Settings Move

## Architecture

### New Files
- `src/lib/useNotifications.js` — custom hook: fetches, subscribes, and manages notification state
- `src/components/NotificationBell.jsx` — bell icon + badge + dropdown/drawer UI

### Modified Files
- `src/pages/DashboardLayout.jsx` — swap Settings icon for `<NotificationBell />`
- `src/components/ProfileTab.jsx` — add Settings navigation row below hero card

---

## useNotifications.js (hook)

```
State:
  notifications[]   — array of notification records
  unreadCount       — derived: count of items where is_read === false
  isOpen            — dropdown open state
  loading           — initial fetch loading

On mount (when user is authenticated):
  1. Fetch top 50 notifications from Supabase: channel='in_app', user_id=user.id, order by created_at desc
  2. Subscribe to Supabase Realtime INSERT on notifications where user_id=user.id
     - On new notification: prepend to list, increment unreadCount optimistically

markAllRead():
  1. Optimistically set all notifications.is_read = true in local state, unreadCount = 0
  2. Call supabase.from('notifications').update({ is_read: true, read_at: now() })
       .eq('user_id', user.id).eq('is_read', false)

openPanel():
  1. Set isOpen = true
  2. If unreadCount > 0, call markAllRead()

closePanel():
  1. Set isOpen = false

Cleanup: unsubscribe Realtime channel on unmount
```

---

## NotificationBell.jsx (component)

```
Props: none (reads from useAuth, useNotifications)

Render:
  - If user is not authenticated: return null
  - Button with Bell icon (Lucide Bell, h-[18px] w-[18px])
  - If unreadCount > 0: absolute badge span in top-right corner
    - bg-destructive, text-white, text-[9px], rounded-full
    - Text: unreadCount > 99 ? '99+' : unreadCount
  - onClick: openPanel()

Panel (shown when isOpen):
  Desktop: absolute positioned dropdown, w-80, max-h-96, overflow-y-auto
           pinned to top-right of bell button, z-50, rounded-xl, border, shadow-lg
  Mobile:  fixed bottom sheet overlay, full-width, max-h-[70vh], rounded-t-2xl
           triggered by same click — detect with useMediaQuery or CSS

Panel header:
  - "Notifications" title (font-semibold)
  - "Mark all as read" button (text-xs, text-primary) — only if unreadCount > 0

Notification row:
  - Unread: left border-l-2 border-primary + slightly brighter background (bg-primary/5)
  - Read: default muted background
  - Title: text-sm font-medium (bold if unread)
  - Body: text-xs text-muted-foreground, line-clamp-2
  - Bottom row: category badge (variant="secondary") + relative time (formatRelativeTime)
  
  formatRelativeTime(date):
    < 1 min  → "just now"
    < 1 hr   → "Xm ago"
    < 24 hr  → "Xh ago"
    < 7 days → "Xd ago"
    else     → locale date string

Empty state:
  - Centered Bell icon (h-8 w-8 text-muted-foreground) + "No notifications yet" (text-sm)

Close on click-outside: useEffect with mousedown listener or a transparent backdrop div
```

---

## DashboardLayout.jsx changes

Remove:
```jsx
<Link to="/profile/settings" aria-label="Settings" ...>
  <Settings ... />
</Link>
```

Add before the profile avatar link:
```jsx
<NotificationBell />
```

Also remove `Settings` from the lucide-react import.

---

## ProfileTab.jsx changes

Add a Settings row directly after the hero `<Card>` and before the first `<AccordionCard>`:

```jsx
<Link to="/profile/settings">
  <Card>
    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors rounded-xl">
      <div className="flex items-center gap-2.5">
        <Settings className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold">Settings</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  </Card>
</Link>
```

---

## Supabase Table

The `notifications` table already exists with columns:
- id, user_id, title, body, channel, priority, category, data, is_read, read_at, sent_at, created_at, action_url

RLS policy needed (if not already present): users can SELECT and UPDATE their own rows.

---

## Realtime Subscription Pattern

```js
const channel = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // prepend payload.new to notifications list
  })
  .subscribe()
```
