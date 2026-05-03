# Agent Instructions for aman_qr

## Project Overview
Expo React Native mobile app using file-based routing via `expo-router`.

## Tech Stack
- **Runtime**: Expo SDK ~54.0.33, React Native 0.81.5, React 19.1.0
- **Router**: expo-router v6 with file-based routing
- **TypeScript**: Strict mode enabled, path alias `@/*` maps to root
- **New Architecture**: Enabled (`newArchEnabled: true` in app.json)
- **Experiments**: Typed routes, React Compiler

## Directory Structure
```
app/              # Routes (file-based routing)
  (tabs)/         # Tab group layout
    _layout.tsx   # Tab navigator config
    index.tsx     # Home screen
    explore.tsx   # Explore screen
  _layout.tsx     # Root stack layout
  modal.tsx       # Modal screen
components/       # React components
  ui/             # UI primitives
constants/        # App constants (theme.ts)
hooks/            # Custom hooks (use-color-scheme, use-theme-color)
assets/           # Images, fonts, icons
scripts/          # Utility scripts
```

## Essential Commands
| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npx expo start` | Start dev server (all platforms) |
| `npm run ios` | Start iOS simulator |
| `npm run android` | Start Android emulator |
| `npm run web` | Start web dev server |
| `npm run lint` | Run ESLint (expo lint) |
| `npm run reset-project` | Reset to blank project (moves app/ to app-example/) |

## Routing Conventions
- Uses **file-based routing**: files in `app/` become routes automatically
- Groups (folders with parentheses) don't create URL segments: `(tabs)/` is just for organization
- `_layout.tsx` files define navigators (Stack, Tabs)
- Route params: `app/user/[id].tsx` → `/user/123`
- Modals: set `presentation: 'modal'` in Stack.Screen options
- Deep linking scheme: `amanqr://`

## Key Configuration
- **Entry point**: `expo-router/entry` (package.json main)
- **TypeScript paths**: `@/*` → `./*`
- **Strict mode**: Enabled in tsconfig.json
- **ESLint**: Uses `eslint-config-expo/flat`, ignores `dist/`
- **VS Code**: Auto-fix on save, organizes imports

## Development Notes
- Color scheme hook: `useColorScheme()` from `@/hooks/use-color-scheme`
- Theme colors: `useThemeColor()` from `@/hooks/use-theme-color`
- Platform-specific files: `.ios.tsx`, `.web.tsx`, etc.
- Vector icons: `@expo/vector-icons`
- Reanimated: Already configured (import in `_layout.tsx`)

## Common Pitfalls
- Always import `react-native-reanimated` in root layout (already done)
- New Architecture is enabled—some native modules may need updates
- Web output is static (configured in app.json)
- Do NOT manually add `react-native-web` usage—Expo handles this
