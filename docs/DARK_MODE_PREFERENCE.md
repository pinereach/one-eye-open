# Dark mode preference: where it’s stored and why it might not stick

## Where we store it

- **Client-side only**: The preference is stored in **localStorage** under the key `darkMode`:
  - `'true'` = dark mode
  - `'false'` = light mode
- **Not stored on the server**: We do not save theme to the backend or cookies. It’s only in the browser’s localStorage for that origin.

## How it’s applied

- **When the user toggles**: [src/components/ui/DarkModeToggle.tsx](src/components/ui/DarkModeToggle.tsx) updates `document.documentElement.classList` (add/remove `dark`) and calls `localStorage.setItem('darkMode', 'true' | 'false')`.
- **When the app loads**: A `useEffect` in `DarkModeToggle` runs on mount and, if `localStorage.getItem('darkMode') === 'true'`, adds the `dark` class and sets React state. So the stored preference is applied **only after React mounts and the toggle component is rendered**.

## Why a user might feel they “have to keep switching”

1. **Toggle not in the tree**: The dark mode toggle (and thus the effect that applies the stored value) only renders when the user is **logged in** (or in development). If they first load the app while logged out, nothing reads localStorage and applies the theme; the page stays light until they log in and the layout with the toggle mounts.
2. **Apply happens after first paint**: The preference is applied in a React effect, so there is a short window where the page can render in the default (light) theme before the effect runs. In slow or heavy loads that can feel like the preference “didn’t stick.”
3. **localStorage not persistent**: In private/incognito or strict tracking protection, localStorage is often cleared when the session ends, so the preference doesn’t persist across sessions.
4. **Different device or browser**: Because we don’t store the preference on the server, each device/browser has its own setting.
5. **Multiple tabs**: If they change the theme in one tab, other open tabs don’t update until they refresh or toggle there (we don’t listen to `storage` events).

## Fix applied

An **inline script in [index.html](index.html)** runs before React and reads `localStorage.getItem('darkMode')`. If it’s `'true'`, it adds the `dark` class to `<html>` immediately. So:

- The theme is applied on **every load** before first paint, and not only when the toggle component mounts.
- It works even when the user is **logged out** (no dependency on the header/toggle being rendered).
- The toggle still writes to localStorage and updates the class when clicked; the inline script only handles the initial load.
