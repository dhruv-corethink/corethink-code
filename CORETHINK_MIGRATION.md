# CoreThink-Code Migration Checklist

## User Decisions
- **CLI Name**: `corethink-code`
- **Config Directory**: `.corethink-code` (also supports `.opencode` for backwards compatibility)
- **Remove Features**: Share, GitHub integration
- **Scope**: Complete rebrand (all tiers)

---

## Phase 1: Core Provider Logic Cleanup

### 1.1 System Prompts
- [x] `src/session/system.ts` - Removed anthropic/gemini/claude-specific prompt imports
- [x] `src/session/system.ts` - Simplified to single generic prompt (PROMPT_CORETHINK)
- [x] `src/session/system.ts` - Removed provider-specific prompt selection logic

### 1.2 UI Provider References
- [x] `src/cli/cmd/tui/component/dialog-model.tsx` - Changed `"opencode"` → `"corethink"`
- [x] `src/cli/cmd/tui/app.tsx` - Removed OpenRouter warning dialog
- [x] `src/cli/cmd/tui/routes/session/sidebar.tsx` - Updated branding

### 1.3 Plugin System
- [x] `src/plugin/index.ts` - Removed `"opencode-anthropic-auth"` from BUILTIN

---

## Phase 2: Remove External Features

### 2.1 Share Feature
- [x] `src/share/share.ts` - Stubbed implementation with "Feature not available"
- [x] `src/cli/cmd/tui/component/tips.ts` - Removed share-related tips

### 2.2 GitHub Integration
- [x] `src/cli/cmd/github.ts` - Stubbed the command

### 2.3 Installation References
- [x] `src/installation/index.ts` - Removed opencode.ai install URLs
- [x] `src/installation/index.ts` - Updated package names to corethink-code
- [x] `src/installation/index.ts` - Removed GitHub release checks (falls back to current version)

---

## Phase 3: Rebrand to corethink-code

### 3.1 Package Identity
- [x] `packages/opencode/package.json` - Updated `name` to `corethink-code`
- [x] `packages/opencode/package.json` - Updated `bin` to `corethink-code`

### 3.2 CLI Entry Point
- [x] `src/index.ts` - Changed `.scriptName("opencode")` → `.scriptName("corethink-code")`

### 3.3 User Agent & Branding
- [x] `src/installation/index.ts` - Updated USER_AGENT string
- [x] `src/global/index.ts` - Changed `const app = "opencode"` → `"corethink-code"`

### 3.4 Help Text & Tips
- [x] `src/cli/cmd/tui/component/tips.ts` - Updated all tips to use corethink-code
- [x] `src/config/config.ts` - Updated example model format
- [x] `src/cli/cmd/tui/app.tsx` - Updated error messages

---

## Phase 4: URL & Server Cleanup

### 4.1 Server References
- [x] `src/server/server.ts` - Updated opencode.ai domain allowlist to corethink.ai
- [x] `src/server/server.ts` - Removed app.opencode.ai proxy endpoint (now returns 404)

### 4.2 MCP OAuth
- [x] `src/mcp/oauth-provider.ts` - Updated client_name and client_uri

### 4.3 Config URLs
- [x] `src/config/config.ts` - Updated opencode.ai/docs references to corethink.ai/docs
- [x] `src/config/config.ts` - Updated config.json URL to corethink.ai/config.json
- [x] `src/config/config.ts` - Added .corethink-code directory support

---

## Errors & Problems Encountered

1. **TypeScript error: `never[]` return type** - When `SystemPrompt.header()` returned empty array without explicit type annotation, TypeScript inferred `never[]` instead of `string[]`. Fixed by adding explicit return type annotation.

---

## Progress Log

- [x] Phase 1 Complete
- [x] Phase 2 Complete
- [x] Phase 3 Complete
- [x] Phase 4 Complete
- [x] Final typecheck passes
- [x] CLI runs successfully

---

## Backwards Compatibility Notes

The migration maintains backwards compatibility:
- Config files: Both `.corethink-code/` and `.opencode/` directories are searched
- Config files: Both `corethink-code.json(c)` and `opencode.json(c)` are loaded
- Environment variables: `OPENCODE_*` flags still work (not renamed to avoid breaking scripts)
