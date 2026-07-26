# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Truthy is a desktop TOTP authenticator (Tauri v2 + React 19 + Mantine 9). It stores OTP secrets in a
KDBX (KeePass) vault at `$APPDATA/vault.kdbx`, encoded as base64 text. The vault is decrypted into
memory only; there is no persisted session, so the app forces re-login after 50s of idle
(`useIdle` in `src/pages/Home/index.tsx` and `src/pages/New/indx.tsx` — raised to ~5000s in DEV).

**`docs/ROADMAP.md` is the work tracker.** Known defects, their dependency ordering, open decisions
awaiting the maintainer, and verified facts about the vault format live there. Read it before
changing anything touching the vault format, the KDF, or the save path — several innocuous-looking
fixes there invalidate existing user vaults. Update item statuses and the changelog as work lands.

## Commands

Package manager is **pnpm** (`tauri.conf.json` invokes `pnpm dev`/`pnpm build`, and CI uses it too).
`pnpm-lock.yaml` is the only lockfile — do not reintroduce npm/yarn.

```bash
pnpm install
pnpm tauri dev       # full desktop app (spawns vite on :1420 + cargo)
pnpm dev             # vite only — most features break, Tauri IPC is unavailable
pnpm build           # tsc typecheck + vite build (this is the only "lint" step)
pnpm tauri build     # bundle installers

cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

`.github/workflows/check.yml` runs the typecheck, clippy, and `cargo test` on every push and PR; a
dependency-audit job runs advisory-only. There is **no frontend test runner yet** and no ESLint
config, so for TypeScript, type errors are the only automated gate — `tsconfig.json` has `strict`,
`noUnusedLocals`, and `noUnusedParameters` on, so unused imports fail the build. Rust has tests
(`src-tauri/src/main.rs`) covering the atomic vault write.

Releases are cut by pushing to the `release` branch (`.github/workflows/release.yml` → draft GitHub
release via `tauri-action`). Version must be bumped in **both** `package.json` and
`src-tauri/tauri.conf.json` (and usually `src-tauri/Cargo.toml`). Builds are unsigned and
un-notarized, so macOS users see a Gatekeeper warning.

`tauri-plugin-shell` is a dependency and is granted in the capabilities file, but nothing in `src/`
imports it — it is dead attack surface, not a feature to preserve.

## Architecture

### The vault is the database *and* the settings store

`kdbxweb` `Kdbx` object held in React state is the single source of truth:

- **Entries** live in the default group (`db.getDefaultGroup()`). Each OTP is a `KdbxEntry` whose
  `fields` map holds `id`, `label`, `issuer`, `secret`, `algorithm`, `digits`, `counter`, `period`,
  `icon`, `color`. `id` is a nanoid(12), not the KDBX UUID — all lookups go through
  `group.entries.find(e => e.fields.get("id") === ...)`.
- **Settings** are JSON-stringified into `db.meta.customData.settings` (`src/contexts/Settings.tsx`),
  and sort prefs into `customData.sortType`/`sortOrder`.
- A transient `islatest` field marks a just-added entry so `Home` can scroll to and spotlight it,
  then deletes the field and re-saves.

Any mutation must be followed by `const content = await db.save(); await savedb(content)`
(`src/utils/kdbx.ts`) — there is no autosave layer. `Home` also saves on
`appWindow.onCloseRequested`. Write new entry field values through `recordEntity()`
(`src/utils/entryops.ts`) rather than setting fields ad hoc.

**Never write the vault with `writeTextFile`.** `savedb` delegates to the Rust `save_vault` command,
which writes a temp file, fsyncs, snapshots the old vault to `vault.kdbx.bak`, then atomically renames
— because a truncated vault means total data loss and the app keeps no backups by design. `savedb`
also serializes concurrent saves through a promise chain; `flushSaves()` awaits the queue. Reads still
go through `readTextFile` in `App.tsx` / `ChangePasswordModal.tsx`, since the on-disk format
(base64 text) is unchanged.

### Argon2 crosses the IPC boundary

`kdbxweb` has no built-in Argon2. `src/utils/kdbx.ts` registers
`kdbxweb.CryptoEngine.setArgon2Impl` to `invoke("gethash", ...)`, implemented in
`src-tauri/src/main.rs` with `rust-argon2`. Importing anything from `./utils/kdbx` is what installs
this hook, so import `kdbxweb` from that module, never directly from `"kdbxweb"`, in any code path
that opens or saves a vault. Consequence: vault open/save only works under `tauri dev`, not plain
`vite`.

**Known defect, do not "clean up" without a migration:** the Rust side hardcodes
`Variant::Argon2id`, but kdbxweb's `DefaultKdfAlgo` is **Argon2d** and it passes the requested
variant as an argument that `gethash` ignores. Existing vaults are therefore self-consistent but
unreadable by KeePass/KeePassXC, and truthy cannot open vaults those tools create. Honoring the
variant argument silently invalidates every existing vault, so any fix needs a re-encrypt-on-open
migration path.

Every `db.save()` re-runs the KDF over IPC, so save frequency and KDF cost are coupled — the current
defaults (Argon2 1 MiB / 2 passes / 1 lane, from kdbxweb) make per-mutation saves cheap. Raising KDF
cost requires debouncing saves first.

The other Rust command is `read_qr` (bardecoder + image), used by `MainModal` to add an entry from a
screenshot of a QR code.

### Provider nesting and routing

`src/main.tsx` wires `ThemeProvider` → `Notifications` → `AppContextProvider` →
`SettingsContextProvider` → router. `SettingsContext` depends on `AppContext` (it reads/writes the
open db) and on `ThemeContext` (it applies the saved Mantine primary color), so that order is load-
bearing.

Routes: `/` login/create (`App.tsx`), `/home` grid, `/new` and `/edit/:id` (both `pages/New/indx.tsx`
— note the filename typo). Guard pattern in each page: `if (!db) return <Navigate to="/" />`, which
is also how idle logout works — navigating to `/` leaves the in-memory db behind.

`AppContext.forceRerender()` is a manual invalidation counter; entry lists re-derive from
`group.entries` when it changes, because mutating `KdbxEntry` objects in place is invisible to React.

### OTP generation

`useTimer()` returns seconds remaining in the current 30s window. `Home` recomputes all codes in a
`useMemo` keyed on `time < 2`, so the whole grid refreshes once per period. Codes are generated with
`totp-generator`'s `TOTP.generate(secret)` using defaults — per-entry `algorithm`/`digits`/`period`
are stored and parsed but **not** yet passed to the generator (see the TODO in `pages/New/indx.tsx`).

### Icons

~900 brand SVGs in `src/icons/` are loaded eagerly via `import.meta.glob(..., { query: "?react" })`
in `src/utils/icons.tsx` (vite-plugin-svgr). The stored `icon` field is the glob key
(e.g. `/src/icons/GitHub.svg`), so renaming files breaks existing vaults.

### Import / export

`src/utils/importers/` currently has only Aegis (plain JSON export). Register new importers in
`importers/index.ts` and switch on them in `ImportModal`. Export offers plaintext JSON,
AES-GCM JSON (SHA-256 of password as key, IV prepended, base64), KDBX XML, and a raw copy of
`vault.kdbx`.

### Tauri permissions

Everything filesystem/dialog/clipboard/shell related must be allowed in
`src-tauri/capabilities/migrated.json`. The fs scope is limited to `$APPDATA`, `$APPDATA/vault.kdbx`,
and `$APPLOG`; import/export write to user-chosen paths via the dialog plugin's returned path.
New Rust commands need registering in `tauri::generate_handler!`.

## Conventions worth keeping

- Mantine components + CSS modules (`*.module.css`) for the few custom styles; no Tailwind.
- User-facing errors go through `@mantine/notifications`; `confirm()` for destructive actions comes
  from `@tauri-apps/plugin-dialog` (some older code still uses `window.confirm`/`alert`).
- Modals are wrapped in `memo` with a comparator on `isOpen`/`opened` and `keepMounted={false}` —
  the icon picker mounts hundreds of SVGs, so keeping them mounted is expensive.
- No automatic backups by design (see README); don't add background writes to user-visible locations.
