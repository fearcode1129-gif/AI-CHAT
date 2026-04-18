# AI-chat Refactor Playbook

This document is a complete, execution-focused refactor plan for the current repository at `D:\CodeProject\AI-chat`.

It covers:

- Stage 1: move the codebase under `src/`
- Stage 2: extract the chat domain into `src/features/chat`
- exact file move mappings
- exact config changes
- exact import rewrite patterns
- validation and rollback guidance

This plan is intentionally incremental. The goal is to improve structure without freezing ongoing development.

## Status

- Stage 1: completed
- Stage 2: completed
- Compatibility wrapper cleanup after Stage 2: completed
- Latest validation target: `npm run build` and `npm run test`

Completed Stage 1 work:

- moved `app`, `components`, `hooks`, `lib`, and `stores` under `src/`
- updated `tsconfig.json`, `vitest.config.ts`, and `tailwind.config.ts` to point at `src`
- added `src/auth.ts` to keep server auth imports stable during the transition

Completed Stage 2 work:

- created `src/features/chat` and its internal folder skeleton
- moved chat stores, hooks, client code, constants, components, and server files into `src/features/chat`
- updated `src/app` imports to use `@/features/chat/...`
- updated test imports and mocks to use `@/features/chat/...`
- removed the old chat compatibility wrapper files once all callers were repointed

Notes:

- Stage 1 and Stage 2 in this playbook are fully complete.
- Follow-up work listed later in this document, such as extracting `usage`, `files`, `theme`, introducing `src/shared`, and reorganizing tests by domain, is intentionally outside Stage 1 and Stage 2.

---

## 1. Current Snapshot

Current top-level source layout:

```text
app/
components/
hooks/
lib/
stores/
tests/
prisma/
public/
auth.ts
next-auth.d.ts
next.config.mjs
tailwind.config.ts
tsconfig.json
vitest.config.ts
```

Current chat-related code is spread across these folders:

```text
app/
  page.tsx
  api/chat/stream/route.ts
  api/chats/route.ts
  api/chats/[id]/route.ts
  api/chats/[id]/messages/route.ts

components/
  app-shell.tsx
  bottom-composer.tsx
  chat-delete-dialog.tsx
  chat-rename-dialog.tsx
  chat-stage.tsx
  empty-home.tsx
  message-list.tsx
  mobile-tab-bar.tsx
  sidebar.tsx
  workspace-panel.tsx

hooks/
  use-chat-workspace.ts
  chat-workspace/message-state.ts
  chat-workspace/use-chat-hydration.ts
  chat-workspace/use-chat-streaming.ts
  chat-workspace/use-chat-workspace-state.ts

stores/
  chat-cache-store.ts
  chat-workspace-store.ts
  stream-task-store.ts

lib/
  client/chat-api.ts
  constants/chat.ts
  server/chat-mappers.ts
  server/knowledge.ts
  server/repositories/chat-repository.ts
  server/services/chat-stream-service.ts
```

Current supporting configuration relevant to this refactor:

- `tsconfig.json`: alias `@/* -> ./*`
- `vitest.config.ts`: alias `@ -> path.resolve(__dirname)`
- `tailwind.config.ts`: scans `./app`, `./components`, `./lib`
- `auth.ts`: imports `db` from `@/lib/server/db`

This means the repo already has alias-based imports, which makes the migration much easier.

---

## 2. Refactor Target

We are not trying to jump straight to a huge final architecture in one pass.

The practical target for these two stages is:

```text
D:\CodeProject\AI-chat
├─ src/
│  ├─ app/
│  ├─ features/
│  │  └─ chat/
│  │     ├─ components/
│  │     ├─ hooks/
│  │     │  └─ chat-workspace/
│  │     ├─ stores/
│  │     ├─ client/
│  │     ├─ constants/
│  │     ├─ server/
│  │     │  ├─ mappers/
│  │     │  ├─ repositories/
│  │     │  ├─ services/
│  │     │  └─ knowledge/
│  │     ├─ types/
│  │     └─ index.ts
│  ├─ shared/
│  └─ server/
├─ prisma/
├─ public/
├─ tests/
├─ auth.ts
├─ next-auth.d.ts
├─ next.config.mjs
├─ tailwind.config.ts
├─ tsconfig.json
└─ vitest.config.ts
```

High-level rules after Stage 2:

- `src/app` contains only Next.js entrypoints, pages, layouts, and route handlers
- `src/features/chat` contains chat-specific UI, hooks, stores, client code, and server-side chat logic
- root-level framework files remain at the root unless there is a strong reason to move them
- non-chat domains are intentionally left alone for now

---

## 3. Scope Boundaries

This playbook only covers:

- Stage 1: `src` consolidation
- Stage 2: `chat` feature consolidation

This playbook does not include:

- full `auth` feature extraction
- full `usage` feature extraction
- full `files` feature extraction
- full `theme` feature extraction
- CI setup
- lint/prettier/husky setup
- API contract redesign
- database schema changes

That is deliberate. Trying to do all of that together would create a risky, oversized refactor.

---

## 4. Stage 1 Overview: Move Source Under `src`

### 4.1 Goal

Unify source code under `src` with minimal behavior changes.

### 4.2 Why This Stage Exists

Benefits:

- reduces root-level sprawl
- gives us a stable alias base for future feature extraction
- keeps Stage 2 mostly about business structure instead of framework relocation
- avoids rewriting imports twice later

### 4.3 Stage 1 Success Criteria

At the end of Stage 1:

- the app still builds
- all route handlers still resolve imports correctly
- tests still run
- imports still mostly use the same `@/...` paths from the caller perspective

---

## 5. Stage 1 Exact File Moves

Move these directories as-is:

```text
app/**                -> src/app/**
components/**         -> src/components/**
hooks/**              -> src/hooks/**
lib/**                -> src/lib/**
stores/**             -> src/stores/**
```

Do not move these yet:

```text
prisma/
public/
tests/
node_modules/
.next/
```

Do not move these root files yet:

```text
auth.ts
next-auth.d.ts
next-env.d.ts
next.config.mjs
postcss.config.mjs
tailwind.config.ts
tsconfig.json
vitest.config.ts
package.json
```

---

## 6. Stage 1 Config Changes

### 6.1 `tsconfig.json`

Current:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./*"]
}
```

Change to:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

Recommended final Stage 1 version:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 6.2 `vitest.config.ts`

Current:

```ts
resolve: {
  alias: {
    "@": path.resolve(__dirname)
  }
}
```

Change to:

```ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "src")
  }
}
```

Recommended full file after Stage 1:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

### 6.3 `tailwind.config.ts`

Current content scan:

```ts
content: [
  "./app/**/*.{ts,tsx}",
  "./components/**/*.{ts,tsx}",
  "./lib/**/*.{ts,tsx}",
];
```

Change to:

```ts
content: [
  "./src/app/**/*.{ts,tsx}",
  "./src/components/**/*.{ts,tsx}",
  "./src/hooks/**/*.{ts,tsx}",
  "./src/lib/**/*.{ts,tsx}",
  "./src/stores/**/*.{ts,tsx}",
  "./src/features/**/*.{ts,tsx}",
  "./src/shared/**/*.{ts,tsx}",
];
```

Notes:

- `src/features` and `src/shared` can be added now even if they do not exist yet
- adding `src/hooks` and `src/stores` avoids missing classes during the transition

### 6.4 `auth.ts`

Current import:

```ts
import { db } from "@/lib/server/db";
```

After Stage 1 this still works, because `@` now points to `src` and the moved file will be:

```text
src/lib/server/db.ts
```

No code change is required here in Stage 1 if the file path remains `src/lib/server/db.ts`.

### 6.5 `next.config.mjs`

No required changes for Stage 1.

Current file:

```js
const nextConfig = {
  typedRoutes: true,
  serverExternalPackages: ["pdfjs-dist"],
};
```

This can stay as-is.

---

## 7. Stage 1 Import Impact

### 7.1 What Usually Does Not Need to Change

If a file already imports things using `@/...`, most imports remain unchanged after moving into `src`.

Examples:

```ts
import { AppShell } from "@/components/app-shell";
import { useChatWorkspace } from "@/hooks/use-chat-workspace";
import { chatRepository } from "@/lib/server/repositories/chat-repository";
```

These still work after Stage 1, because the alias target changes from repo root to `src`.

### 7.2 What Might Need Attention

You need to check for:

- relative imports that assume the old root placement
- test mocks that reference old absolute paths
- Tailwind content paths
- any scripts outside `src` that use `@/...`

### 7.3 Stage 1 Search Checklist

Run these searches after the move:

```text
from "@/components/
from "@/hooks/
from "@/lib/
from "@/stores/
../components/
../hooks/
../lib/
../stores/
```

Purpose:

- alias imports should keep working
- relative imports may require fixes if any files moved between sibling folders

---

## 8. Stage 1 Suggested Commit Plan

Suggested commit split:

1. move source directories into `src`
2. update `tsconfig.json`, `vitest.config.ts`, and `tailwind.config.ts`
3. fix any broken imports and compile issues

This keeps rollback manageable.

---

## 9. Stage 1 Validation Checklist

Run these after Stage 1:

```text
npm run build
npm run test
```

Manual checks:

- `/` loads correctly
- `/sign-in` loads correctly
- `/sign-up` loads correctly
- chat list renders
- streaming chat request still starts
- auth still resolves session on the server

---

## 10. Stage 2 Overview: Consolidate Chat Into `src/features/chat`

### 10.1 Goal

Restructure only the chat domain into a proper feature folder.

### 10.2 Why Chat Goes First

Chat is currently the densest cross-cutting area:

- UI components
- view-model hooks
- stream orchestration
- zustand stores
- API client
- server-side repositories and services

This gives the highest architecture payoff for the least ambiguity.

### 10.3 Stage 2 Success Criteria

At the end of Stage 2:

- chat-related code lives under `src/features/chat`
- `src/app` imports chat behavior from `src/features/chat`
- old chat files in `src/components`, `src/hooks`, `src/stores`, and `src/lib` are removed or no longer referenced
- build and tests still pass

---

## 11. Stage 2 Exact Target Structure

Create:

```text
src/features/chat/
  components/
  hooks/
    chat-workspace/
  stores/
  client/
  constants/
  server/
    mappers/
    repositories/
    services/
    knowledge/
  types/
  index.ts
```

Optional but recommended later:

```text
src/shared/
src/server/
```

Those can remain mostly empty during Stage 2 if you are keeping scope tight.

---

## 12. Stage 2 Exact File Move Matrix

### 12.1 Chat UI Components

```text
src/components/app-shell.tsx
  -> src/features/chat/components/app-shell.tsx

src/components/bottom-composer.tsx
  -> src/features/chat/components/bottom-composer.tsx

src/components/chat-delete-dialog.tsx
  -> src/features/chat/components/chat-delete-dialog.tsx

src/components/chat-rename-dialog.tsx
  -> src/features/chat/components/chat-rename-dialog.tsx

src/components/chat-stage.tsx
  -> src/features/chat/components/chat-stage.tsx

src/components/empty-home.tsx
  -> src/features/chat/components/empty-home.tsx

src/components/message-list.tsx
  -> src/features/chat/components/message-list.tsx

src/components/mobile-tab-bar.tsx
  -> src/features/chat/components/mobile-tab-bar.tsx

src/components/sidebar.tsx
  -> src/features/chat/components/sidebar.tsx

src/components/workspace-panel.tsx
  -> src/features/chat/components/workspace-panel.tsx
```

### 12.2 Chat Hooks

```text
src/hooks/use-chat-workspace.ts
  -> src/features/chat/hooks/use-chat-workspace.ts

src/hooks/chat-workspace/message-state.ts
  -> src/features/chat/hooks/chat-workspace/message-state.ts

src/hooks/chat-workspace/use-chat-hydration.ts
  -> src/features/chat/hooks/chat-workspace/use-chat-hydration.ts

src/hooks/chat-workspace/use-chat-streaming.ts
  -> src/features/chat/hooks/chat-workspace/use-chat-streaming.ts

src/hooks/chat-workspace/use-chat-workspace-state.ts
  -> src/features/chat/hooks/chat-workspace/use-chat-workspace-state.ts
```

### 12.3 Chat Stores

```text
src/stores/chat-cache-store.ts
  -> src/features/chat/stores/chat-cache-store.ts

src/stores/chat-workspace-store.ts
  -> src/features/chat/stores/chat-workspace-store.ts

src/stores/stream-task-store.ts
  -> src/features/chat/stores/stream-task-store.ts
```

### 12.4 Chat Client

```text
src/lib/client/chat-api.ts
  -> src/features/chat/client/chat-api.ts
```

### 12.5 Chat Constants

```text
src/lib/constants/chat.ts
  -> src/features/chat/constants/chat.ts
```

### 12.6 Chat Server Code

```text
src/lib/server/chat-mappers.ts
  -> src/features/chat/server/mappers/chat-mappers.ts

src/lib/server/repositories/chat-repository.ts
  -> src/features/chat/server/repositories/chat-repository.ts

src/lib/server/services/chat-stream-service.ts
  -> src/features/chat/server/services/chat-stream-service.ts

src/lib/server/knowledge.ts
  -> src/features/chat/server/knowledge/knowledge.ts
```

### 12.7 Files Explicitly Not Moved in Stage 2

Keep these outside chat for now:

```text
src/lib/server/auth.ts
src/lib/server/db.ts
src/lib/server/config.ts
src/lib/server/aliyun.ts
src/lib/server/files.ts
src/lib/server/image-generation.ts
src/lib/server/quota.ts
src/lib/server/repositories/attachment-repository.ts
src/lib/server/repositories/usage-repository.ts
src/lib/server/services/usage-service.ts
src/hooks/use-usage-credits.ts
src/hooks/use-accent-theme.ts
src/stores/theme-store.ts
src/stores/usage-store.ts
src/components/auth/**
src/components/session-provider.tsx
src/components/assistant-markdown.tsx
```

This is important. Stage 2 is not a general cleanup pass.

---

## 13. Stage 2 Exact Import Rewrite Rules

### 13.1 Rule A: App entrypoints should import chat from the feature folder

These files should change:

```text
src/app/page.tsx
src/app/api/chat/stream/route.ts
src/app/api/chats/route.ts
src/app/api/chats/[id]/route.ts
src/app/api/chats/[id]/messages/route.ts
```

### 13.2 Rule B: chat internal files should stop importing from old horizontal folders

Inside `src/features/chat/**`, these old import sources should disappear:

```text
@/components/
@/hooks/
@/stores/
@/lib/client/chat-api
@/lib/constants/chat
@/lib/server/chat-mappers
@/lib/server/repositories/chat-repository
@/lib/server/services/chat-stream-service
@/lib/server/knowledge
```

They should become:

```text
@/features/chat/components/
@/features/chat/hooks/
@/features/chat/stores/
@/features/chat/client/
@/features/chat/constants/
@/features/chat/server/
```

### 13.3 Rule C: keep cross-domain infrastructure imports as-is for now

These imports can stay outside the feature for Stage 2:

```text
@/lib/server/auth
@/lib/server/db
@/lib/server/config
@/lib/server/aliyun
@/lib/server/files
@/lib/server/repositories/attachment-repository
@/lib/server/services/usage-service
```

That prevents scope creep.

---

## 14. Stage 2 File-by-File Import Guidance

### 14.1 `src/app/page.tsx`

Current pattern:

```ts
import { AppShell } from "@/components/app-shell";
```

Change to:

```ts
import { AppShell } from "@/features/chat/components/app-shell";
```

Everything else in this file can likely stay the same.

### 14.2 `src/app/api/chat/stream/route.ts`

Current pattern:

```ts
import {
  failChatStream,
  finalizeChatStream,
  startChatStream,
} from "@/lib/server/services/chat-stream-service";
```

Change to:

```ts
import {
  failChatStream,
  finalizeChatStream,
  startChatStream,
} from "@/features/chat/server/services/chat-stream-service";
```

Keep these as-is in Stage 2:

```ts
import { requireUser } from "@/lib/server/auth";
import { assertDailyQuotaAvailable } from "@/lib/server/services/usage-service";
```

### 14.3 `src/app/api/chats/route.ts`

Expected update pattern:

```ts
import { chatRepository } from "@/features/chat/server/repositories/chat-repository";
import { mapChatToDto } from "@/features/chat/server/mappers/chat-mappers";
```

If this route currently imports chat types from `@/lib/types` or `@/lib/types/api`, keep them as-is unless they are clearly chat-only.

### 14.4 `src/app/api/chats/[id]/route.ts`

Expected update pattern:

```ts
import { chatRepository } from "@/features/chat/server/repositories/chat-repository";
import { mapChatToDto } from "@/features/chat/server/mappers/chat-mappers";
```

### 14.5 `src/app/api/chats/[id]/messages/route.ts`

Expected update pattern:

```ts
import { chatRepository } from "@/features/chat/server/repositories/chat-repository";
import { mapMessageToDto } from "@/features/chat/server/mappers/chat-mappers";
```

### 14.6 `src/features/chat/hooks/use-chat-workspace.ts`

This is the most important internal rewrite.

Current import style is approximately:

```ts
import { deleteChat, updateChat, uploadFiles } from "@/lib/client/chat-api";
import { DEFAULT_ASSISTANT_MODEL } from "@/lib/constants/chat";
import { useChatHydration } from "@/hooks/chat-workspace/use-chat-hydration";
import { useChatStreaming } from "@/hooks/chat-workspace/use-chat-streaming";
import { useChatWorkspaceState } from "@/hooks/chat-workspace/use-chat-workspace-state";
import { useChatCacheStore } from "@/stores/chat-cache-store";
import { DEFAULT_HELPER_TEXT } from "@/stores/chat-workspace-store";
import { useStreamTaskStore } from "@/stores/stream-task-store";
```

Change to:

```ts
import {
  deleteChat,
  updateChat,
  uploadFiles,
} from "@/features/chat/client/chat-api";
import { DEFAULT_ASSISTANT_MODEL } from "@/features/chat/constants/chat";
import { useChatHydration } from "@/features/chat/hooks/chat-workspace/use-chat-hydration";
import { useChatStreaming } from "@/features/chat/hooks/chat-workspace/use-chat-streaming";
import { useChatWorkspaceState } from "@/features/chat/hooks/chat-workspace/use-chat-workspace-state";
import { useChatCacheStore } from "@/features/chat/stores/chat-cache-store";
import { DEFAULT_HELPER_TEXT } from "@/features/chat/stores/chat-workspace-store";
import { useStreamTaskStore } from "@/features/chat/stores/stream-task-store";
```

Keep this as-is if still shared:

```ts
import type { Message } from "@/lib/types";
```

Only move that type later if it becomes clearly chat-only.

### 14.7 `src/features/chat/hooks/chat-workspace/use-chat-hydration.ts`

Change imports that point to:

```text
@/stores/chat-cache-store
@/lib/client/chat-api
```

to:

```text
@/features/chat/stores/chat-cache-store
@/features/chat/client/chat-api
```

### 14.8 `src/features/chat/hooks/chat-workspace/use-chat-streaming.ts`

Change imports that point to:

```text
@/stores/chat-cache-store
@/stores/stream-task-store
@/lib/client/chat-api
@/lib/constants/chat
```

to:

```text
@/features/chat/stores/chat-cache-store
@/features/chat/stores/stream-task-store
@/features/chat/client/chat-api
@/features/chat/constants/chat
```

### 14.9 `src/features/chat/hooks/chat-workspace/use-chat-workspace-state.ts`

Change imports that point to:

```text
@/stores/chat-workspace-store
```

to:

```text
@/features/chat/stores/chat-workspace-store
```

### 14.10 `src/features/chat/components/*`

For every chat component moved into `src/features/chat/components`, update imports using this rule:

- chat components import chat components from `@/features/chat/components/...`
- chat components import chat hooks from `@/features/chat/hooks/...`
- chat components import chat stores from `@/features/chat/stores/...`
- non-chat shared things can still come from old shared-ish places for now

Examples:

```text
@/components/message-list
  -> @/features/chat/components/message-list

@/hooks/use-chat-workspace
  -> @/features/chat/hooks/use-chat-workspace
```

### 14.11 `src/features/chat/server/services/chat-stream-service.ts`

Current style includes imports such as:

```ts
import {
  CHAT_TITLE_MAX_LENGTH,
  DEFAULT_NEW_CHAT_TITLE,
} from "@/lib/constants/chat";
import { retrieveKnowledgeContext } from "@/lib/server/knowledge";
import { chatRepository } from "@/lib/server/repositories/chat-repository";
```

Change to:

```ts
import {
  CHAT_TITLE_MAX_LENGTH,
  DEFAULT_NEW_CHAT_TITLE,
} from "@/features/chat/constants/chat";
import { retrieveKnowledgeContext } from "@/features/chat/server/knowledge/knowledge";
import { chatRepository } from "@/features/chat/server/repositories/chat-repository";
```

Keep these as-is in Stage 2:

```ts
import { resolveModelByMode } from "@/lib/server/aliyun";
import { createDashScopeChatStream } from "@/lib/server/clients/dashscope-client";
import { attachmentRepository } from "@/lib/server/repositories/attachment-repository";
import { recordDailyUsage } from "@/lib/server/services/usage-service";
```

### 14.12 `src/features/chat/server/mappers/chat-mappers.ts`

This file should become the canonical place for route-layer DTO transformation.

Update route handlers to import from here rather than `@/lib/server/chat-mappers`.

### 14.13 `src/features/chat/server/repositories/chat-repository.ts`

Update all callers to import this from:

```text
@/features/chat/server/repositories/chat-repository
```

Likely callers:

- `src/app/api/chats/route.ts`
- `src/app/api/chats/[id]/route.ts`
- `src/app/api/chats/[id]/messages/route.ts`
- `src/features/chat/server/services/chat-stream-service.ts`

---

## 15. Stage 2 Recommended `index.ts`

Create:

```ts
export { AppShell } from "./components/app-shell";
export { useChatWorkspace } from "./hooks/use-chat-workspace";
```

You can expand this later, but do not over-export everything immediately.

---

## 16. Test Impact and Test Updates

Current tests include at least:

```text
tests/hooks/chat-workspace/use-chat-hydration.test.tsx
tests/hooks/chat-workspace/use-chat-streaming.test.tsx
tests/hooks/chat-workspace/use-chat-workspace-state.test.tsx
tests/hooks/use-chat-workspace.test.tsx
tests/lib/server/chat-mappers.test.ts
tests/lib/server/chat-repository.test.ts
tests/lib/server/chat-stream-service.test.ts
tests/stores/chat-cache-store.test.ts
tests/stores/stream-task-store.test.ts
tests/components/message-list.test.tsx
```

These tests will likely need import updates after Stage 2.

### 16.1 Test Rewrite Rules

Change imports from:

```text
@/hooks/use-chat-workspace
@/hooks/chat-workspace/*
@/stores/chat-cache-store
@/stores/stream-task-store
@/lib/server/chat-mappers
@/lib/server/repositories/chat-repository
@/lib/server/services/chat-stream-service
```

to:

```text
@/features/chat/hooks/use-chat-workspace
@/features/chat/hooks/chat-workspace/*
@/features/chat/stores/chat-cache-store
@/features/chat/stores/stream-task-store
@/features/chat/server/mappers/chat-mappers
@/features/chat/server/repositories/chat-repository
@/features/chat/server/services/chat-stream-service
```

### 16.2 What Should Not Change Yet

Do not reorganize the `tests/` folder itself during these two stages unless necessary.

Reason:

- import stability matters more than test taxonomy right now
- moving test files and source files at the same time makes failures harder to diagnose

---

## 17. Recommended Execution Order

Use this exact order.

### Stage 1

1. create `src/`
2. move `app` to `src/app`
3. move `components` to `src/components`
4. move `hooks` to `src/hooks`
5. move `lib` to `src/lib`
6. move `stores` to `src/stores`
7. update `tsconfig.json`
8. update `vitest.config.ts`
9. update `tailwind.config.ts`
10. run `npm run build`
11. run `npm run test`
12. fix breakages before continuing

### Stage 2

1. create `src/features/chat` skeleton
2. move chat stores first
3. move chat hooks next
4. move chat client and constants
5. move chat components
6. move chat server files
7. update imports in `src/app`
8. update imports in tests
9. run `npm run build`
10. run `npm run test`
11. manually verify chat flows

Why this order:

- stores and hooks sit at the center of chat interactions
- route handlers should be updated after feature internals exist
- tests should be fixed after source paths are stable

---

## 18. Suggested Commit Plan

Recommended commit sequence:

1. `chore: move source folders under src`
2. `chore: update path aliases and tailwind scan paths`
3. `refactor: create chat feature module skeleton`
4. `refactor: move chat stores and hooks into feature module`
5. `refactor: move chat client and constants into feature module`
6. `refactor: move chat components into feature module`
7. `refactor: move chat server code into feature module`
8. `test: update imports after chat feature extraction`

This gives you safe restore points.

---

## 19. Manual Verification Checklist

After Stage 2, verify all of the following:

### UI

- home page loads
- app shell renders
- chat list renders
- chat selection works
- rename dialog works
- delete dialog works
- composer input works
- message list renders markdown correctly

### Chat behavior

- start a new chat
- send a message
- receive a streaming response
- stop generation
- reopen an existing chat
- message history still loads

### API

- `POST /api/chat/stream`
- `GET /api/chats`
- `PATCH /api/chats/[id]` if supported
- `DELETE /api/chats/[id]` if supported
- `GET /api/chats/[id]/messages`

### Auth

- unauthenticated users still redirect to `/sign-in`
- session still resolves in `src/app/page.tsx`
- credentials auth still works via `auth.ts`

### Tests

- `npm run test`

### Build

- `npm run build`

---

## 20. Risk Areas

### 20.1 Alias Mismatch

Symptoms:

- imports compile in editor but fail in tests

Cause:

- `tsconfig.json` and `vitest.config.ts` alias targets differ

Mitigation:

- update both in the same commit

### 20.2 Tailwind Missing Styles

Symptoms:

- components render without expected classes after move

Cause:

- `tailwind.config.ts` content paths do not include new folders

Mitigation:

- update Tailwind scan paths before validation

### 20.3 Test Mock Path Drift

Symptoms:

- Vitest mocks stop applying

Cause:

- mock import strings still reference old paths

Mitigation:

- search test files for old chat paths and update them together

### 20.4 Accidental Scope Creep

Symptoms:

- refactor grows into auth/theme/files cleanup

Mitigation:

- keep non-chat files in place unless they block the move

### 20.5 Existing Dirty Working Tree

Current repo already has uncommitted changes in chat-related files.

Mitigation:

- do not mix this refactor with unrelated behavioral edits
- if needed, land the current feature work first, then refactor

---

## 21. Rollback Plan

If something goes wrong:

### After Stage 1

- revert only the `src` move and alias/config commit
- do not partially keep some directories in and some out of `src`

### After Stage 2

- revert the most recent feature extraction commit batch
- keep Stage 1 intact if it is already stable

The safest rollback boundary is:

- rollback Stage 2 independently
- preserve Stage 1 if build and tests passed there

---

## 22. What Not to Do During These Two Stages

Do not do these in parallel:

- rename business concepts
- redesign API payloads
- rewrite the streaming protocol
- change Prisma schema
- introduce new state management patterns
- move auth, usage, files, and theme into features in the same PR
- reorganize tests into `unit` and `integration` at the same time

Each of those is valuable later, but not inside this refactor slice.

---

## 23. Recommended Follow-up After Stage 2

Only after Stage 2 is stable:

1. extract `usage` into `src/features/usage`
2. extract `files` into `src/features/files`
3. extract `theme` into `src/features/theme`
4. introduce `src/shared`
5. move infrastructure to `src/server`
6. reorganize tests by domain
7. add docs, CI, and stricter checks

---

## 24. Final Summary

If you want the shortest safe path, do exactly this:

1. move `app/components/hooks/lib/stores` under `src`
2. update alias and Tailwind config
3. verify build and tests
4. extract only chat code into `src/features/chat`
5. repoint `src/app` and tests to the new chat feature paths
6. verify build, tests, and manual chat flows

That gets you the biggest structural improvement with the lowest risk and sets up the rest of the repo for gradual enterprise-style evolution.
