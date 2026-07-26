# Truthy — improvement roadmap

Standing plan of record for improving Truthy. Written to be picked up cold: if you are an agent or
contributor starting a fresh session with no prior context, everything you need to choose and execute
the next piece of work should be in this file or in `CLAUDE.md`.

**Last substantive update:** 2026-07-26.

---

## Read this first

1. Read `CLAUDE.md` in the repo root for architecture and commands. This doc assumes it.
2. Read [Project snapshot](#project-snapshot) — the project's *situation* (no users, two years
   dormant, solo maintainer) changes what the right answer is for several items.
3. Read [Cross-cutting context](#cross-cutting-context). Several items look independent but share
   the vault format, the save path, or the KDF. Ordering constraints there are real.
4. Read [Decisions](#decisions). Five are settled with rationale; **D-6 is open and may supersede a
   third of this roadmap.** Do not start T-02, T-03, T-07, T-12, or T-24 until D-6 is resolved.
5. Check the [Status board](#status-board), pick an item whose `Depends on` is clear, and confirm
   with the maintainer before starting. Then set its `Status` to `WIP`.
6. When work lands: update the item's `Status`, note anything you learned that contradicts this doc
   (especially in [Verified facts](#verified-facts)), and add a line to the
   [Changelog](#changelog).

**Conventions.** IDs (`T-01`, `F-01`, `D-1`) are permanent labels, not priorities — priority lives in
each item's `Priority` field and in which section it sits under. If an item is re-ranked, move it and
keep its ID so older commits and notes stay resolvable. Statuses: `TODO` · `NEXT` (agreed next
pickup) · `WIP` · `BLOCKED` (see `Depends on`) · `DONE` · `SUPERSEDED` (say by what) · `WONTFIX`
(say why). Line references are from commit `c720fae` and will drift — trust the prose over the
number.

---

## Project snapshot

Truthy is an offline desktop TOTP authenticator: Tauri v2 shell, React 19 + Mantine 9 frontend,
small Rust backend. Secrets live in a KDBX (KeePass) vault file at `$APPDATA/vault.kdbx`, unlocked
with a master password. Everything is local; the app makes no network requests.

Situational facts that legitimately change engineering decisions:

- **No users.** The app was built ~2 years ago, released as v1.1.0, and has been dormant since.
  There is no install base to migrate and no support burden. Breaking the on-disk format is cheap —
  the only vault that matters is the maintainer's own, and a one-time manual export/import is an
  acceptable migration path if it buys a materially better design.
- **Solo maintainer, security is the stated top priority.** Prefer designs that one person can fully
  audit over designs that are theoretically more capable but larger. This is an explicit tiebreaker
  in D-6.
- **Rewrites are on the table.** The maintainer has said they don't mind reimplementation effort if
  security improves.
- **KeePass interoperability is not a goal** (see D-5). KDBX was chosen in ~2024 for pragmatic
  reasons — offline, battle-tested, maintained — not because reading vaults in KeePassXC mattered.
- **The audit that produced this doc was a read-only review.** Nothing here has been fixed yet;
  every `TODO` below is still live in the codebase.

What has already been done as of the last update: switched the repo to pnpm-only (`yarn.lock`
deleted, `release.yml` migrated to `pnpm/action-setup`, `packageManager` pinned in `package.json`,
Tauri-v1 webkitgtk 4.0 dep dropped from CI), and added `CLAUDE.md`. No application code has changed.

---

## Status board

| ID | Priority | Status | Item |
|----|----------|--------|------|
| T-28 | P0 | DONE | Repair the build after the dependency upgrades in `670eaf7` |
| T-01 | P0 | DONE | Atomic vault writes + fix the window-close save race |
| T-04 | P0 | TODO | Make exports restorable (importers for our own formats) |
| T-05 | P0 | TODO | Reject HOTP explicitly; un-overload the `counter` field |
| T-06 | P0 | TODO | TOTP ignores per-entry algorithm/digits/period |
| T-26 | P0 | BLOCKED | Replace kdbxweb with a Rust-owned vault — **awaiting D-6** |
| T-02 | P1 | BLOCKED | Store the vault as binary KDBX, not base64 text — **may be superseded by T-26** |
| T-03 | P1 | BLOCKED | Argon2 variant mismatch + migration — **may be superseded by T-26** |
| T-07 | P1 | BLOCKED | Harden KDF params + password strength feedback — **reshaped by T-26** |
| T-08 | P1 | TODO | Idle lock must actually clear the vault from memory |
| T-09 | P1 | TODO | AES-GCM export needs a real KDF |
| T-10 | P1 | TODO | Set a strict CSP |
| T-11 | P1 | TODO | Remove unused shell plugin; trim fs capabilities |
| T-12 | P1 | BLOCKED | Protect secrets in memory — **reshaped by T-26** |
| T-13 | P1 | TODO | Clipboard auto-clear; stop double-writing |
| T-14 | P1 | TODO | Rust `.unwrap()` panics hang the UI |
| T-15 | P1 | TODO | Delete the devtools-blocking theater; fix title/favicon |
| T-16 | P1 | TODO | Validate `otpauth://` URIs properly |
| T-24 | P1 | BLOCKED | Coalesce/debounce vault saves — **may be unnecessary after T-26** |
| T-27 | P1 | TODO | Dependency health audit (kdbxweb is not the only stale one) |
| T-17 | P2 | DONE | CI: typecheck + clippy on push/PR |
| T-18 | P2 | TODO | Test harness + fixtures |
| T-19 | P2 | TODO | Stop eagerly bundling ~900 SVGs |
| T-20 | P2 | TODO | Sorting mutates a memoized array |
| T-21 | P2 | TODO | Empty-label entries crash the grid |
| T-22 | P2 | TODO | Surface swallowed errors |
| T-23 | P2 | TODO | Dead code / polish sweep |
| T-25 | P2 | TODO | Auto-update + signed builds |

Feature backlog is [`F-01`…`F-15`](#feature-backlog), deliberately unscheduled until P0 is clear.

**Suggested next pickups.** T-28, T-17, and T-01 are done. Next: **resolve D-6**, then either T-26 or
the T-02/T-03 pair depending on that answer. T-04, T-05, T-06, T-14, T-15, T-16 are all independent of
D-6 and safe to do at any time — T-16 is the best entry point for T-18 since `parseOtpAuthURL` is the
most test-friendly file in the codebase.

---

## Cross-cutting context

### A. The on-disk format, and why several items are entangled

**Current format (call it `L`, legacy).** `savedb()` in `src/utils/kdbx.ts` base64-encodes the KDBX4
binary and writes it with `writeTextFile`, so the file on disk is ASCII text. On top of that, the
KDBX header declares KDF **Argon2d** (kdbxweb's default) while the key was actually derived with
**Argon2id** (hardcoded in the Rust `gethash` command). Two independent deviations from the standard
in the same file.

**Consequences of `L`:** 33% size overhead; the "Export encrypted KDBX" button produces a file no
KeePass client can open (it's base64 text, and even decoded the KDF variant is wrong); and truthy
cannot open vaults created by KeePass, reporting "Invalid password" for a correct password.

**Detecting the format needs no sidecar file.** A binary KDBX4 file starts with the KeePass magic
bytes (`03 D9 A2 9A` then `67 FB 4B B5`, little-endian signature1/signature2). Read with `readFile`
(bytes) rather than `readTextFile` and branch: magic → binary, ASCII base64 → format `L`.

**Detecting the Argon2 variant is harder** — the header claims Argon2d in both the legacy and the
correct case, so the file cannot tell you. The only reliable approach is trial decryption: attempt
with a legacy-mode flag (ignore the requested variant, always Argon2id), and on `InvalidKey` retry
with the variant honored. The impl is a module-level global on `CryptoEngine`, so "try both" means a
mutable flag that the `gethash` wrapper consults — not two registered implementations. Cost: a
genuinely wrong password runs Argon2 twice.

**Why this matters even if we leave KDBX behind (T-26).** Whatever replaces the storage layer still
has to *read* format `L` once to migrate the maintainer's existing vault. The quirks above become a
read-only legacy importer rather than a format to fix. Do not delete this section when kdbxweb goes.

**Hard ordering rule.** T-01 (atomic writes) must land before any format migration, because a
migration is a full-file rewrite and a crash during *that* write is the worst possible moment for a
non-atomic save.

### B. Save frequency is coupled to KDF cost (today)

`kdbxweb`'s `db.save()` re-derives the master key from the credentials on every call, because KDBX4
regenerates the master seed per write. **Every save therefore runs a full Argon2 pass over IPC.**
That is survivable today only because the KDF params are weak (1 MiB / 2 passes / 1 lane), and saves
are frequent and partly implicit:

- `src/contexts/Settings.tsx:42` saves on every settings change — every theme pick, every toggle.
- Every add/edit/delete saves; the Aegis importer saves once *per imported entry*
  (`src/utils/importers/aegis.ts:57-62`).
- Copying a code mutates the entry in memory, persisted by whatever save happens next.

So T-07 (raise KDF to 64 MiB) is gated on T-24 (coalesce saves). Doing T-07 alone would put a
100ms+ Argon2 run behind every theme toggle and turn a 200-entry import into minutes.

**This coupling is an artifact of KDBX4, not a law of nature.** A custom container (see D-6) can keep
the Argon2-derived key in memory for the session and re-encrypt with a fresh nonce per save, so
Argon2 runs once per unlock instead of once per write. If T-26 goes ahead, T-24 likely becomes
unnecessary and the KDF budget stops being a UX tradeoff. This is one of the strongest arguments in
favour of the swap.

### C. Product principles that constrain solutions

From the README, deliberate and not to be "fixed" without asking:

- **No automatic backups** — backups are the user's responsibility. Scoped by D-1: crash-safety
  artifacts are explicitly *not* what this principle is about.
- **Everything in memory; frequent re-login is a feature** — constrains T-08. The fix is to make the
  lock real, not less frequent (a *configurable* timeout is still fine).
- **KDBX because it's battle-tested** — this was the original reasoning, now partly invalidated
  because the library implementing it is unmaintained. See D-6.

### D. Test fixtures that don't exist yet

Needed for confident work on T-04, T-26, T-06, and the substance of T-18:

- a format-`L` vault (base64 text, Argon2id-derived) — **generate one from current `master` before
  changing any storage code**, or the legacy migration path becomes untestable
- a KeePassXC-created vault with default Argon2d, and one with Argon2id (still useful as a
  legacy-reader test even though interop isn't a goal — see D-5)
- a real Aegis plain-JSON export, including an entry with an empty `name` (feeds T-21)
- an `otpauth-migration://` payload and an `otpauth://hotp/...` URI (feeds T-05, F-06)
- RFC 6238 TOTP vectors for SHA-1/256/512 at 6 and 8 digits (feeds T-06)

Keep them under `test/fixtures/`. **Generate them; never commit a vault containing a real secret.**

### Inspecting a vault offline

You can read and unlock a vault from Node without launching the app, which is far better than clicking
through the UI for verifying storage changes. This was used to prove T-01 and T-03. Recreate it in a
scratch directory (it needs nothing committed to the repo):

1. **Header/KDF parameters, no password needed.** Base64-decode the file, then walk the KDBX4 outer
   header: after the 12-byte magic+version come `[id: u8][len: u32][data]` fields terminated by
   `id 0`. Field `id 11` is `KdfParameters`, a VariantDictionary — `u16` version, then
   `[type: u8][keyLen: u32][key][valLen: u32][val]` entries terminated by `type 0`. Keys: `$UUID`
   (KDF), `S` (salt), `M` (memory, u64 **bytes**), `I` (iterations, u64), `P` (parallelism, u32),
   `V` (version). Argon2d UUID is `ef636ddf8c29444b91f7a9a403e30a0c`, Argon2id is
   `9e298b1956db4773b23dfc3ec6f0a1e6`.
2. **Full unlock.** kdbxweb runs fine under Node (WebCrypto is a global since Node 18) but needs an
   Argon2 implementation. Build a tiny throwaway cargo binary depending on `rust-argon2` that takes
   password/salt/params as hex and prints the raw hash, then register it via
   `CryptoEngine.setArgon2Impl` and shell out with `execFileSync`. `cargo build --offline` works
   because the crate is already vendored for the app. Symlink the repo's `node_modules` into the
   scratch directory to get `kdbxweb`.
3. Mirror `gethash` exactly: variant **Argon2id**, version `0x13`, and treat the `memory` argument as
   **KiB** — kdbxweb has already divided by 1024 before calling the impl.

**Two traps that cost time.** kdbxweb rejects a derived key whose `byteLength` isn't the requested
length with a misleading `Unsupported: bad derived key`; in Node,
`Buffer.from(hex, "hex").buffer` hands back the ~8KB *pooled* ArrayBuffer, so copy into an exact-size
one (`new Uint8Array(buf).buffer`). And `Kdbx.load` mutates the buffer it is given, so pass a fresh
slice if you intend to try more than one variant.

---

## Decisions

### Resolved

**D-1 · `.bak` files do not violate the no-backups principle.** *(2026-07-26)*
Atomic writes may retain a previous generation, and a format migration may write a one-time
`vault.kdbx.pre-migration.bak`. The README principle is about not silently managing the user's
backup strategy; crash-safety artifacts next to the vault are a different thing. Unblocks T-01.

**D-2 · "Restore" replaces; "import" merges. They are separate commands.** *(2026-07-26)*
The maintainer's position was that overwrite-vs-merge is the user's call, not the app's. The
resolution: don't overload one button with both meanings.
- **Restore from backup** = replace the vault outright, behind a confirmation that states the entry
  count being discarded and the count being restored. Unambiguous, matches what "restore" means
  everywhere else.
- **Import** = merge into the current vault, with per-conflict handling. That is the existing Aegis
  path and where duplicate detection belongs (F-05).

On duplicate identity, this was left to me, so: **match on the normalized secret alone.** Uppercase
it, strip `=` padding and whitespace, compare. Rationale — a TOTP secret *is* the credential's
identity; two entries sharing a secret are the same credential no matter what they're labelled, and
two entries with different secrets are different credentials even if labelled identically. The
nanoid `id` is useless across vaults because it's regenerated on import, and issuer+label is
user-editable cosmetic metadata. Same-secret-two-accounts effectively does not occur, because
issuers generate per-account secrets. F-05 should still surface each conflict and let the user pick
skip / replace / keep-both rather than deciding silently.

**D-3 · Reject HOTP explicitly; defer real support to F-07.** *(2026-07-26)*
Silently generating wrong codes forever is far worse than a clear "HOTP is not supported yet" error.
T-05 is now scoped to the rejection plus un-overloading the `counter` field, not to implementing
HOTP.

**D-4 · Target KDF cost: Argon2id, 64 MiB, 2 passes, 2 lanes.** *(2026-07-26)*
Anchored on KeePassXC's defaults. Genuinely low-end 2026 hardware is rare enough not to design
around. Two caveats for whoever implements it: (a) benchmark on the slowest machine you have and
consider `t=3` if there's headroom, since iterations are cheap relative to memory; (b) in most Rust
Argon2 implementations the `lanes`/parallelism parameter changes the *output* but is computed
sequentially, so `p=2` is about parameter choice, not speed. Also note context B — the affordability
of these params depends on how often the KDF runs, which D-6 changes.

**D-5 · KeePass interoperability is not a goal.** *(2026-07-26)*
KDBX was chosen because in ~2024 nothing else was offline, battle-tested, and maintained. Reading
truthy vaults in KeePassXC was never a requirement. This means format-correctness items (T-02, T-03)
have no user-facing value on their own — they only matter as correctness hygiene for a library we may
be about to remove, which is precisely what D-6 asks.

### Open

**D-6 · What replaces kdbxweb?** *(raised 2026-07-26 — blocks T-26, T-02, T-03, T-07, T-12, T-24)*

`kdbxweb@2.1.1` is effectively unmaintained (no meaningful activity in ~4 years). For a password
manager, a dependency with no security-response process is a real risk regardless of whether a
specific bug is known today — and no such bug is known, so this is about future response capability
and about what the dependency *forces* architecturally, not about a discovered vulnerability.

One correction to the framing that prompted this, because it affects the reasoning: **WebCrypto is
not the weak link.** `crypto.subtle` is not JavaScript crypto — it's the browser engine's native
implementation (BoringSSL/NSS), and it is a reasonable primitive source. The actual problem with the
current design is adjacent: because kdbxweb runs in the webview, the **decrypted vault, every OTP
secret, and the derived key material all live in the JavaScript heap**, where they are immutable
strings that cannot be zeroized, get copied by the GC, and land in swap and crash dumps. That is the
thing worth fixing, and it happens to require moving the vault into Rust — so the conclusion holds,
just for a different reason than "don't trust WebCrypto."

Options considered:

**Option A — keep KDBX, move it to Rust via the `keepass` crate (keepass-rs).**
Actively maintained, reads and writes KDBX3/KDBX4, built on RustCrypto primitives.
*For:* the format stays specified and multiply-implemented; edge cases (KDBX4's HMAC block
authentication, inner stream cipher, gzip, XML schema) are someone else's problem; interop stays
available even though it isn't a goal.
*Against:* bus factor is not obviously better than kdbxweb's — it's one maintainer, currently
active. And truthy uses KDBX as a flat key-value store of eight string fields per entry: you inherit
100% of a large parse surface for maybe 10% of the format. Given D-5, you're paying that complexity
for optionality you've said you don't want.

**Option B — own the container; RustCrypto primitives. ← recommended.**
A small versioned file: magic + version + Argon2id params + salt + AEAD nonce as a header, then
XChaCha20-Poly1305 over the serialized entry list, with the header bytes as AEAD associated data so
the KDF parameters can't be tampered with or downgraded. Crates: `argon2`, `chacha20poly1305`,
`zeroize`, `serde` + `ciborium`, `rand`, `data-encoding` for base32 secrets.
*For:*
- The crypto stays in externally reviewed, org-maintained code (RustCrypto; the `aes-gcm` and
  `chacha20poly1305` crates received an NCC Group audit in 2020 — verify the current scope yourself
  rather than treating that as a blanket guarantee). Only the *framing* is ours, and the framing is a
  boring, standard recipe: password → Argon2id → AEAD key, authenticate the header.
- It is small enough for one person to fully audit, which is the explicit tiebreaker in
  [Project snapshot](#project-snapshot). ~200 lines versus a KDBX implementation.
- `zeroize` gives real secret hygiene, which is unachievable in JS.
- Argon2 runs **once per unlock**, not once per save (see context B), so 64 MiB stops being a UX
  tradeoff and T-24 likely evaporates.
- Format versioning is ours, so future migrations are a `match` on a version byte.
*Against:* "rolling your own format" carries real risk, concentrated in composition rather than
primitives. The specific pitfalls to encode as tests: nonce uniqueness per write (a random 24-byte
XChaCha nonce is safe by size, but generate a fresh one every save and never reuse); header
integrity via AAD, so an attacker can't downgrade `m`/`t`/`p` to make cracking cheap; rejecting
truncated files rather than partially decrypting them; and refusing unknown version bytes instead of
guessing. Also loses the "battle-tested format" property, which given D-5 is a talking point rather
than a feature.

**Option C — `age`/`rage` as the container.** Well-specified, simple, reviewed. But its passphrase
mode is scrypt rather than Argon2, and it's designed for file encryption rather than a
frequently-rewritten mutable store. No clear advantage over B.

**Option D — SQLCipher / SQLite + encryption.** Overkill for <1000 entries, adds a C dependency and
cross-platform build pain, and SQLCipher's default KDF is PBKDF2. Rejected.

**Companion change, and arguably the bigger prize — move TOTP generation into Rust too.** Once Rust
owns the vault, the natural boundary is: Rust holds the secrets and the derived key (zeroized on
lock), and the frontend asks for "current codes for all entries" and receives only the 6-digit codes
plus display metadata. Plaintext secrets then cross the IPC boundary only when adding, editing, or
deliberately exporting an entry. This makes T-12 mostly free, makes T-08's lock a real
zeroization rather than dropping a JS reference, and deletes the Argon2-over-IPC hack entirely.
RFC 6238 is ~50 lines over `hmac` + `sha1`/`sha2` and is trivially testable against published
vectors; `totp-rs` is the alternative if you'd rather not hand-roll it, at the cost of another
single-maintainer dependency.

**Recommendation: Option B plus the Rust-side TOTP move, executed as T-26.** Suggest a throwaway
spike first — container encrypt/decrypt round-trip plus TOTP against RFC vectors, no UI — to confirm
the ergonomics and measure Argon2 timings at the D-4 params before committing to the full migration.

**If D-6 resolves to Option B or A:** mark T-02 and T-03 `SUPERSEDED` — do not implement them. Their
value was KDBX format correctness, which evaporates when the KDBX library goes. Their *content*
survives only as the legacy-reader requirement in context A. **If D-6 resolves to "stay on
kdbxweb":** T-02 and T-03 return to P0 and must ship as a single format bump.

---

## P0 — data loss and correctness

### T-28 · Repair the build after the dependency upgrades in `670eaf7`
**Status:** DONE (2026-07-26, `b82634c`) · **Priority:** P0

**Why it existed.** The dependency upgrades committed in `670eaf7` left `master` failing `tsc` with 8
errors, so the project did not build at all. Recorded here because the root causes are exactly what
the next upgrade will hit, and because two of them changed runtime behavior, not just types.

**Root causes.**
1. **plugin-dialog v2 renamed the confirm/message option `type` → `kind`** — 4 sites in
   `ExportModal.tsx`. Purely mechanical.
2. **kdbxweb's `Argon2Fn` requires `Promise<ArrayBuffer>`**, not `Promise<Uint8Array>` —
   `src/utils/kdbx.ts`. Fixed by returning `.buffer`. Note the spread is retained
   (`new Uint8Array([...hash]).buffer`) because the declared type is `Uint8Array` but Tauri
   serializes a Rust `Vec<u8>` as a **number array** at runtime.
3. **`TOTP.generate` became async** in totp-generator 2.x, returning `Promise<{otp, expires}>`. Two
   call sites were inside existing `async` functions; the third (`pages/Home/index.tsx`) was a
   `useMemo` and had to be split into an effect that fills a `codes` state map plus a memo that
   merges codes onto entries. The `time < 2` refresh trigger was preserved verbatim.
4. **A malformed secret now throws.** totp-generator raises
   `"Invalid base32 character in key"` from `base32ToBuffer`. In the batch loop that would blank
   *every* code, so generation is guarded per entry. Previously the same throw escaped a `useMemo`
   and crashed the render, so this is strictly better, but it means a broken entry now fails quietly
   — relevant to T-22.

**Deliberately not done here:** honoring the `{ algorithm, digits, period }` options that
`TOTP.generate` now accepts. That's T-06, and it needs stored-value sanitization first — see the trap
recorded there.

### T-01 · Atomic vault writes + fix the window-close save race
**Status:** DONE (2026-07-26, `d413a24`) · **Priority:** P0 · **Blocks:** any format migration

**What shipped.** Vault writes go through a new Rust `save_vault` command
(`src-tauri/src/main.rs`): write `vault.kdbx.tmp` → `sync_all()` → copy the current vault to
`vault.kdbx.bak` → `fs::rename` tmp over the vault → best-effort directory fsync on unix. The `.bak`
is a **copy rather than a rename** specifically so `vault.kdbx` is never absent, even momentarily;
that is what makes recovery-on-load unnecessary, since the vault is a complete file at every instant.
The on-disk format is unchanged (still base64 text), so there was no migration and the read paths in
`App.tsx` / `ChangePasswordModal.tsx` were untouched.

`savedb` in `src/utils/kdbx.ts` now invokes that command and serializes saves through a module-level
promise chain, and exports `flushSaves()` for the close handler and later for T-08's lock. Vault
*creation* in `App.tsx` previously called `writeTextFile` directly and now goes through `savedb` too,
so every write takes the same path.

The `onCloseRequested` handler now `preventDefault()`s, awaits the save, and calls
`appWindow.destroy()` explicitly. **On failure it deliberately leaves the window open** rather than
discarding the user's changes. Its dep array changed from `[]` to `[db]` — it had been closing over
`db` with an empty dep array and only worked because `db` happens to be stable for a session.

**Not done:** debouncing (T-24, blocked on D-6) and trimming the now-partly-unneeded fs write grants
(T-11 — `writeTextFile` is still used by the export flows, so the permission must stay for now).

**Verified.** 5 `cargo test` cases cover the write mechanics (including that a stale temp file from a
crashed save can never be mistaken for the vault). Beyond that, a vault written by the new path was
opened offline with the technique in
[Inspecting a vault offline](#inspecting-a-vault-offline): both `vault.kdbx` and the rotated
`vault.kdbx.bak` unlock and their `customData` settings parse as valid JSON. So the atomic write
produces valid, decryptable vaults and the backup rotation preserves a valid previous generation.

**Still unverified:** code generation and rendering with real entries, and copy-to-clipboard — the
maintainer's test vault contains 0 entries, so those paths need an entry added first.

**Why.** `savedb()` uses `writeTextFile`, which truncates and then writes. A crash, power cut, or
full disk mid-write leaves a truncated vault, and there are no backups by design — that is every
secret, gone. The window-close handler makes it worse (`src/pages/Home/index.tsx:112`):

```ts
const unlisten = appWindow.onCloseRequested(async () => {
  const content = await db?.save();
  savedb(content);        // not awaited; close is not prevented
});
```

The webview can tear down mid-write, so *closing the app normally* is a corruption window. This is
the item where the current code can cost the maintainer everything, which is why it's first.

**Where.** `src/utils/kdbx.ts` (`savedb`), `src/pages/Home/index.tsx:112`.

**Plan.**
1. Write to `vault.kdbx.tmp`, then `rename` over `vault.kdbx`. `fs:allow-rename` is already granted
   in `src-tauri/capabilities/migrated.json`.
2. Retain one previous generation as `vault.kdbx.bak` (rename old → bak before promoting tmp).
   Permitted by D-1.
3. Serialize saves through a single-flight promise chain so two concurrent saves cannot interleave
   tmp writes. This is also the hook T-24 would extend.
4. Close handler: `event.preventDefault()`, await the save, then close the window explicitly.
   Surface a notification on failure rather than closing over a failed write.

**Forward-compatibility note.** If D-6 goes to Option A or B, the vault write moves into Rust
eventually. Consider implementing the atomic write as a small Rust command
(`save_vault_atomic(bytes)`) now rather than in TypeScript: it's barely more work, survives T-26
unchanged, and is a step toward removing broad fs write permissions from the webview (T-11
synergy). The close-handler and single-flight logic stay in TypeScript either way.

**Verify.** Kill the process mid-save (large vault plus a breakpoint) and confirm the original file
still loads. Close the window with unsaved changes and confirm they persist.

---

### T-04 · Make exports restorable
**Status:** TODO · **Priority:** P0 · **Depends on:** D-2 (resolved) · **Note:** the export/import
surface will need revisiting after T-26; the *semantics* below are stable, the file formats may not be

**Why.** Four export formats exist and three cannot be brought back into the app: there is no JSON
importer, and the AES decrypt function is dead code behind an `@ts-ignore`
(`src/components/Modals/ExportModal.tsx:193`). The fourth (the KDBX copy) is restorable only by
manually copying a file into AppData, documented nowhere. For an app whose README tells users
backups are their responsibility, this is the sharpest edge in the product: it hands you a backup you
cannot restore.

**Where.** `src/components/Modals/ImportModal.tsx`, `src/utils/importers/`, `ExportModal.tsx`.

**Plan.** Per D-2, build two distinct flows.
- **Restore from backup** — replace the vault outright. Validate the file opens with the supplied
  password *before* touching the live vault, then show a confirmation naming both entry counts.
- **Import** — merge, with duplicate detection on the normalized secret (D-2), surfacing each
  conflict for skip / replace / keep-both. Wire up `aesGcmDecrypt` for the encrypted-JSON format and
  version the export envelope so T-09's change doesn't orphan existing files.

**Verify.** Round-trip every export format that claims to be restorable. Restore into a vault with
existing entries and confirm the discarded count in the confirmation matches reality.

---

### T-05 · Reject HOTP explicitly; un-overload the `counter` field
**Status:** TODO · **Priority:** P0 · **Depends on:** D-3 (resolved) · **Related:** T-16, F-07

**Why.** `src/utils/parseOtpAuthURL.ts` hardcodes `counter: 0`, ignores the URI's `counter`
parameter, and never checks whether the type is `totp` or `hotp`. `src/utils/entryops.ts` then reuses
that same `counter` field as the **usage count**, which `src/pages/Home/components/Card.tsx:138`
increments on every copy. So an `otpauth://hotp/...` URI imports as a TOTP entry and produces
permanently wrong codes, with no error anywhere and no way for the user to work out why.

**Where.** `parseOtpAuthURL.ts`, `entryops.ts`, `Card.tsx:138`, `pages/Home/index.tsx` (the "usage
count" sort reads the same field).

**Plan.** Per D-3, do not implement HOTP here.
1. Split the field into `hotpCounter` (protocol) and `useCount` (telemetry) — names that can't be
   re-confused. Existing entries all store usage count in `counter`, so map old `counter` →
   `useCount` on read.
2. Add an explicit `type: "totp" | "hotp"` field to the entry model.
3. Detect `otpauth://hotp/...` at parse time and reject it with a clear message naming HOTP and
   pointing at F-07, rather than coercing it to TOTP.

**Verify.** An HOTP URI produces a visible, specific error. "Most used" sorting still works across
the field rename.

---

### T-06 · TOTP ignores per-entry algorithm/digits/period
**Status:** TODO · **Priority:** P0 · **Depends on:** — · **Related:** T-16, F-02

**Why.** `src/pages/Home/index.tsx:139` calls `TOTP.generate(e.secret)` with no options, so the
stored `algorithm`, `digits`, and `period` are parsed, persisted, and then discarded. Any issuer
using SHA-256, 8 digits, or a 60-second period silently gets wrong codes. The user-visible symptom
is "this site rejects my code" with nothing to diagnose. Compounding it, `pages/New/indx.tsx:52`
hardcodes SHA-1/6/30 for manually added entries and never exposes the fields in the UI — there's
already a `TODO` on that line.

**Where.** `pages/Home/index.tsx:134-142`, `pages/New/indx.tsx:52`,
`src/utils/hooks/useTimer.tsx` (hardcodes a 30-second window), `pages/Home/components/Progress.tsx`.

**Plan.** Pass `{ algorithm, digits, period }` through to the generator — `TOTP.generate` accepts all
three (confirmed while doing T-28). Normalize algorithm strings in exactly one place —
`parseOtpAuthURL`'s `algomap` currently yields `undefined` for anything unexpected (T-16). Expose the
three fields in the add/edit form, which is F-02 and belongs in this same pass since the data model
already carries them. Decide what to do about mixed periods: the progress bar and the `time < 2`
refresh trigger both assume one global 30-second tick, so either generalize to per-card countdowns or
keep one tick and derive per-entry progress from it. `TOTP.generate` also returns `expires`, which
makes per-entry countdowns cheap.

**⚠ Trap — sanitize stored values before honoring them.** `pages/Home/index.tsx` reads digits as
`Number(entry.fields.get("digits")?.toString() || 6)`. For an entry stored from a URI with no
`digits`, T-16 shows the persisted value can be the string `"NaN"` — and `"NaN" || 6` short-circuits
to `"NaN"`, so `Number(...)` yields `NaN`. That is harmless *today* precisely because the value is
discarded. The moment this item passes it through, those entries generate broken codes. So T-06 must
clamp and validate stored `digits`/`period`/`algorithm` (falling back to 6/30/SHA-1) **before**
honoring them, which effectively couples it to T-16. Do T-16 first.

**Note on scope.** T-28 restructured these exact call sites for the async API change but deliberately
did not touch parameter handling, so the code is already in the right shape for this work.

**Verify.** RFC 6238 vectors for SHA-1/256/512 at 6 and 8 digits. A 60-second-period entry visibly
tracks its own window.

---

### T-26 · Replace kdbxweb with a Rust-owned vault
**Status:** BLOCKED on D-6 · **Priority:** P0 · **Depends on:** D-6, T-01 · **Supersedes (if
approved):** T-02, T-03; **reshapes:** T-07, T-12, T-24

**Why.** `kdbxweb` has had no meaningful maintenance in ~4 years, which is not acceptable for the
only dependency standing between a password file and an attacker — not because a vulnerability is
known (none is), but because there is no one to respond if one appears. The larger issue is
architectural: kdbxweb runs in the webview, so the decrypted vault, all secrets, and the derived key
live in the JS heap where they cannot be zeroized. See D-6 for the full options analysis and the
correction about WebCrypto.

**Scope, assuming D-6 resolves to Option B.**
1. **Spike first** (throwaway): Rust container encrypt/decrypt round-trip, plus TOTP against RFC
   6238 vectors. Measure Argon2 at the D-4 params on the slowest available machine. No UI.
2. Define the container: magic + version + Argon2id params + salt + nonce header, XChaCha20-Poly1305
   body over CBOR-serialized entries, header bytes as AEAD associated data. Document the format in
   `docs/VAULT_FORMAT.md` — a format only you maintain must be written down.
3. Rust owns unlock/lock/CRUD/save, holds the derived key in a `Zeroizing` buffer for the session,
   and re-encrypts with a fresh nonce per save (Argon2 once per unlock — context B).
4. Move TOTP generation to Rust; the frontend receives codes and display metadata, not secrets.
5. One-time legacy importer for format `L` (context A), including the Argon2id-always quirk, gated
   behind a `vault.kdbx.pre-migration.bak` (D-1).
6. Delete kdbxweb, `byte-utils.ts`, the `setArgon2Impl` hook, and the `gethash` command; narrow the
   fs capabilities the webview still needs (T-11).

**Pitfalls to encode as tests.** Fresh nonce per write; header authenticated as AAD so `m`/`t`/`p`
cannot be downgraded; truncated files rejected rather than partially decrypted; unknown version
bytes refused rather than guessed; wrong password distinguishable from corrupt file in the error
surface, without leaking which via timing.

**Verify.** Round-trip a 500-entry vault. Confirm the legacy vault migrates and the pre-migration
backup opens with the old code path. Confirm plaintext secrets never appear in a webview heap
snapshot after unlock. Confirm lock zeroizes.

---

## P1 — security

### T-02 · Store the vault as binary KDBX, not base64 text
**Status:** BLOCKED on D-6 · **Priority:** P1 · **Depends on:** T-01

Detail in [context A](#a-the-on-disk-format-and-why-several-items-are-entangled). Switch
`savedb`/`loaddb` to `writeFile`/`readFile` with `Uint8Array`, sniff the magic bytes on open to
accept format `L` transparently, and ship as one format bump with T-03. Touches
`src/utils/kdbx.ts`, `src/App.tsx` (create and unlock paths),
`src/components/Modals/ChangePasswordModal.tsx` (re-reads the vault), and makes
`src/utils/byte-utils.ts` dead.

**Do not start.** Given D-5 (interop is not a goal), the only value here is correctness hygiene for a
library T-26 may delete. Resolve D-6 first; if it goes to Option A or B, mark this `SUPERSEDED`.

### T-03 · Argon2 variant mismatch + migration
**Status:** BLOCKED on D-6 · **Priority:** P1 · **Depends on:** T-01 · **Ships with:** T-02

Detail and the trial-decryption strategy in
[context A](#a-the-on-disk-format-and-why-several-items-are-entangled); the verified library facts are
in [Verified facts](#verified-facts). Short version: kdbxweb requests Argon2**d**, the Rust
`gethash` command hardcodes Argon2**id** and drops the variant argument, so the header and the actual
derivation disagree.

**The trap, worth stating plainly:** honoring the variant argument without a migration path locks the
user out of their existing vault permanently. Any fix must trial-decrypt legacy-first and self-heal
on unlock.

**Empirically proven, not just inferred** (2026-07-26). A real vault was opened offline twice using
the technique in [Inspecting a vault offline](#inspecting-a-vault-offline), with only the Argon2
variant changed:

| Derivation | Result |
|---|---|
| Argon2**id** (what `gethash` computes) | unlocks |
| Argon2**d** (what the file header declares) | `InvalidKey` |

The same vault's KDF parameters read back as Argon2d / 1 MiB / 2 iterations / 1 lane / v0x13, matching
kdbxweb's defaults exactly. So the file is decryptable *only* under the app's non-standard derivation.
This is the concrete confirmation that KeePassXC cannot open these vaults and that a naive fix is a
lockout.

**Do not start.** Same reasoning as T-02 — resolve D-6 first. The legacy-reader requirement survives
into T-26 regardless.

### T-07 · Harden KDF params + password strength feedback
**Status:** BLOCKED · **Priority:** P1 · **Depends on:** D-4 (resolved), and either T-24 (if staying
on kdbxweb) or T-26

**Why.** *Verified:* kdbxweb's defaults, never overridden, are 1 MiB memory / 2 iterations / 1 lane.
KeePassXC ships 64 MiB. Against offline cracking of a stolen vault that's a large cost reduction in
exactly the dimension Argon2 exists to raise — and the password minimum is 8 characters
(`src/App.tsx:35`).

**Plan.** Apply D-4's params (Argon2id, 64 MiB, t=2, p=2) on create, and upgrade existing vaults on
unlock as part of whichever migration lands. Add a strength meter and passphrase guidance to the
create and change-password forms, and raise the minimum length. Whether this is affordable depends
entirely on how often the KDF runs — see context B. Under T-26 it runs once per unlock and this is
free; under kdbxweb it runs per save and T-24 must land first.

### T-08 · Idle lock must actually clear the vault from memory
**Status:** TODO · **Priority:** P1 · **Depends on:** —

**Why.** `useIdle` fires and the app calls `nav("/")`, but `src/contexts/App.tsx` never clears `db`,
`group`, or `entries`. The fully decrypted vault and every secret stay in the heap indefinitely.
Re-entering `/home` *does* require the password — the `replace: true` navigations keep it out of
history — so this is **not** an access bypass. But memory dumps, swap, and crash reports still yield
everything, which is precisely what an idle lock exists to prevent. Today the lock is a UI redirect
wearing a security feature's clothing.

**Where.** `src/contexts/App.tsx`, `src/pages/Home/index.tsx:57`, `src/pages/New/indx.tsx:70`.

**Plan.** Add `lock()` to `AppContext` nulling `db`/`group`/`entries`; call it from the idle effect in
both pages and when leaving the authed area. Flush pending saves before locking (T-01's serialized
path). Extract the duplicated `import.meta.env.DEV ? 5000000 : 50 * 1000` into one constant and make
the timeout configurable (F-04). Full zeroization is impossible in JS — dropping references plus
T-12 is as far as this goes without T-26, which is the real fix.

**Related UX bug worth fixing here.** `useIdle` listens to DOM events, so an unfocused window counts
as idle: the app locks 50 seconds after you switch to another window. That is the likely source of
the "logs you out constantly" complaint. Decide deliberately whether focus loss should reset the
timer, start it, or be ignored.

### T-09 · AES-GCM export needs a real KDF
**Status:** TODO · **Priority:** P1 · **Depends on:** — · **Related:** T-04

**Why.** `ExportModal.tsx:169` uses raw `SHA-256(password)` as the AES key — no salt, no KDF. One
SHA-256 per guess makes the "encrypted" export dramatically easier to crack than the vault it came
from, inverting the user's reasonable assumption that an encrypted export is at least as safe as the
vault.

**Plan.** Derive with Argon2 (already available) or PBKDF2 with a random salt and high iteration
count. Write a versioned envelope — magic, version, salt, nonce, ciphertext — so T-04's importer can
read both old and new files. Also replace the `window.prompt` password entry: **unverified, test
first** — native JS dialogs are unreliable across Tauri v2 webviews, and if `prompt` returns `null`
there, this export is already broken on those platforms.

### T-10 · Set a strict CSP
**Status:** TODO · **Priority:** P1 · **Depends on:** —

`src-tauri/tauri.conf.json` has `"csp": null`. This app should never touch the network, so a policy
turns "offline by design" into something enforced rather than assumed, and is the cheapest available
mitigation for any future injection bug. Start from `default-src 'self'; script-src 'self'; style-src
'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'`.
Mantine injects styles at runtime so `unsafe-inline` for styles is probably required — verify rather
than assume, and check the inlined SVG icon components still render.

### T-11 · Remove unused shell plugin; trim fs capabilities
**Status:** TODO · **Priority:** P1 · **Depends on:** —

*Verified:* nothing under `src/` imports `@tauri-apps/plugin-shell`, yet the plugin is registered
(`src-tauri/src/main.rs:12`) and `shell:default` + `shell:allow-open` are granted in
`capabilities/migrated.json`. That's an IPC-reachable command surface with no feature behind it.
Drop the Rust crate, the npm dependency, the `.plugin()` line, and both permissions. Then audit the
rest of `migrated.json` — it's a Tauri-v1 auto-migration, not a considered policy:
`fs:allow-read-dir`, `fs:allow-remove`, `fs:allow-copy-file`. Note that import/export rely on the
dialog plugin handing the chosen path to the fs scope, so don't over-trim. Renaming the file away
from `migrated.json` signals it has been reviewed.

### T-12 · Protect secrets in memory
**Status:** BLOCKED · **Priority:** P1 · **Depends on:** D-6

**Why.** `entryops.ts` writes every field as a plain string, including `secret`. kdbxweb supports
`ProtectedValue` for masked in-memory storage and inner-stream encryption of the field in the file.
At rest the outer container still protects everything, so this is defense-in-depth — but it also
means the KDBX XML export writes secrets in cleartext, secrets appear as ordinary visible fields if
the vault is opened in KeePass, and the values exist as GC-copied immutable JS strings throughout the
heap.

**Plan depends on D-6.** Under kdbxweb: store `secret` as `ProtectedValue`, read via `.getText()`,
handle the mixed case where existing entries hold plain strings, and audit every read path —
`pages/Home/index.tsx:63-82` calls `.toString()` on every field, and `ProtectedValue.toString()` does
**not** return the plaintext. Under T-26: this mostly dissolves, because secrets stay in Rust behind
`Zeroizing` and never enter the webview. Don't do the kdbxweb version if T-26 is going ahead.

### T-13 · Clipboard auto-clear; stop double-writing
**Status:** TODO · **Priority:** P1 · **Depends on:** —

A copied OTP sits in the clipboard indefinitely, and on macOS syncs to other devices via Universal
Clipboard. Every other authenticator clears it. Add a configurable clear-after (default 15–30s) that
only clears if the clipboard still holds the value we wrote. Separately, `Card.tsx:136-140` writes
the clipboard twice — Mantine's `copy()` and then `clipboard.writeText()`; keep the Tauri plugin
path and drop the other.

### T-14 · Rust `.unwrap()` panics hang the UI
**Status:** TODO · **Priority:** P1 · **Depends on:** —

`src-tauri/src/main.rs:33` does `image::open(path).unwrap()`, which panics on a corrupt or non-image
file; `main.rs:74` does `hash_raw(...).unwrap()`, which panics on invalid Argon2 params. A panicking
Tauri command never resolves its promise, so the user gets an eternally frozen "Read QR Code" or a
login that never returns and never errors. Return `Result<T, String>` from both, propagate, and show
a notification. Bound the QR input (max dimensions and file size) before decoding. This gets more
load-bearing once T-07 changes the Argon2 params being passed in.

### T-15 · Delete the devtools-blocking theater; fix title/favicon
**Status:** TODO · **Priority:** P1 · **Depends on:** —

`index.html` contains an inline script blocking the context menu, F12, Ctrl+R, and Ctrl+I under a
`// safety practices` comment. It stops no attacker — release builds don't ship devtools unless the
feature is enabled — misses Cmd+R on macOS so it isn't even internally consistent, and breaks
legitimate UX. Filed under security because it is *believed* to be a security control and isn't.
Delete it; confirm release builds don't enable Tauri's `devtools` feature (debug builds
intentionally call `open_devtools()` at `main.rs:16`). While in the file: `<title>` still says
"Tauri + React + TS" and the favicon is `vite.svg`.

### T-16 · Validate `otpauth://` URIs properly
**Status:** TODO · **Priority:** P1 · **Depends on:** — · **Related:** T-05, T-06

`parseOtpAuthURL` never checks the scheme or the type, so `https://evil.com/x?secret=…` parses
happily. Unknown algorithm values fall out of `algomap` as `undefined` and get written into a field.
`parseInt(... || "", 10)` yields `NaN` for absent `digits`/`period`, which currently survives only
because `NaN || 6` short-circuits — fragile, and T-06 makes it load-bearing. Assert
`protocol === "otpauth:"`, parse the type from the host, validate the secret is base32, whitelist
algorithms with an explicit fallback, and return typed errors the UI can render. Best done as the
first commit of T-05/T-06, with unit tests (T-18) — this is the single most test-friendly file in
the codebase.

### T-24 · Coalesce/debounce vault saves
**Status:** BLOCKED on D-6 · **Priority:** P1 · **Depends on:** T-01 · **Blocks:** T-07 (under
kdbxweb only)

Rationale in [context B](#b-save-frequency-is-coupled-to-kdf-cost-today). Single-flight plus ~500ms
debounce around `savedb`, sharing T-01's serialization; batch importers into one save at the end;
flush on lock (T-08) and on window close (T-01). Measure Argon2 duration at both param sets before
committing to T-07's numbers.

**Likely unnecessary under T-26**, which decouples saves from the KDF entirely. Don't build this
until D-6 lands.

### T-27 · Dependency health audit
**Status:** TODO · **Priority:** P1 · **Depends on:** —

kdbxweb prompted D-6, but it isn't the only stale dependency, and a password manager should know the
maintenance status of everything in its trust path. Known suspects (verify current state rather than
trusting this list):

- **`bardecoder 0.5.0`** — QR decoding, appears dormant since ~2021. `rqrr` is the maintained
  alternative. This crate parses untrusted image input, so it's genuinely security-relevant.
- **`image 0.24.9`** — several majors behind current, and also on the untrusted-input path.
- **`rust-argon2 2.1.0`** — works, but RustCrypto's `argon2` is more actively developed and would be
  the natural choice if T-26 goes ahead.
- Frontend: audit whether anything else in the vault path is unmaintained.

**Plan.** Add `cargo audit` (and `pnpm audit`) to CI as part of T-17, then triage. Deliberately
separate from T-26 so the storage decision doesn't block routine hygiene.

---

## P2 — quality and infrastructure

### T-17 · CI: typecheck + clippy on push/PR
**Status:** TODO · **Priority:** P2

`pnpm build` (i.e. `tsc`) is currently the *only* automated gate in the project, and nothing runs it
on push. Add `.github/workflows/check.yml` running `pnpm install --frozen-lockfile`, `pnpm build`,
and `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`; fold in `cargo audit` for
T-27. Cheapest high-leverage item in this doc — worth doing before any storage-layer work so the
risky changes have a gate under them.

### T-18 · Test harness + fixtures
**Status:** TODO (Rust side started) · **Priority:** P2 · **Soft-blocks:** T-04, T-06, T-26

`cargo test` is now in use and wired into CI — `src-tauri/src/main.rs` has 5 tests covering the atomic
vault write from T-01. **No frontend test runner exists yet**, which is the bulk of what's left. Add
Vitest.
Start with the pure, mock-free targets: `parseOtpAuthURL` (valid, HOTP, malformed), `byte-utils`
round-trip, the Aegis importer against a fixture, RFC 6238 vectors, and a vault create → save → load
round-trip including the legacy path. Fixtures per
[context D](#d-test-fixtures-that-dont-exist-yet) — generate them, never commit real secrets.

### T-19 · Stop eagerly bundling ~900 SVGs
**Status:** TODO · **Priority:** P2

`src/utils/icons.tsx` uses `import.meta.glob(..., { eager: true })`, so every brand icon in
`src/icons/` becomes a React component in the main chunk whether or not it's used — that's startup
time and baseline memory. Options: lazy glob with `Suspense` in the picker, or a sprite sheet.
**Constraint:** the stored `icon` field is the glob key (e.g. `/src/icons/GitHub.svg`), so the key
format must survive any change or existing entries lose their icons.

### T-20 · Sorting mutates a memoized array
**Status:** TODO · **Priority:** P2

`pages/Home/index.tsx:146` calls `.sort()` directly on `memoisedEntries`, mutating a `useMemo` result
in place. Copy before sorting. While there, collapse the near-duplicate asc/desc comparators —
"usage count" and "last used" currently return the same descending order in both branches, so those
two sorts silently ignore the direction toggle.

### T-21 · Empty-label entries crash the grid
**Status:** TODO · **Priority:** P2

`Card.tsx:59` and `:97` call `e.label[0].toUpperCase()` when there's no issuer. An entry with an
empty label — easy to produce via Aegis import — throws and blanks the entire app with no recovery
path. The `pages/Home` mapper also `!`-asserts every field
(`entry.fields.get("id")?.toString()!`), so missing fields become `undefined` and propagate silently.
Add a fallback avatar character and stop asserting.

### T-22 · Surface swallowed errors
**Status:** TODO · **Priority:** P2

Several paths `console.error` with no user-facing feedback, and effects fire unawaited promises whose
rejections vanish (`pages/Home/index.tsx:64`, `contexts/Settings.tsx:46`). Worst offender: the
`finally` block in `ImportModal.tsx:50` closes the modal and implies success even when the import
threw. A vault app must never fail a write silently. Pairs naturally with T-01.

### T-23 · Dead code / polish sweep
**Status:** TODO · **Priority:** P2

Low-risk cleanups, best batched into one commit: empty `import {  } from "@tauri-apps/api"`
(`Card.tsx:17`); `alert()` / `window.confirm()` instead of the dialog plugin
(`ChangePasswordModal.tsx`, `pages/New/indx.tsx:137` — the latter's bare `confirm` is
`window.confirm`; verify it actually works on all three platforms); `Cargo.toml` still has
`authors = ["you"]` and `description = "A Tauri App"`; the `pages/New/indx.tsx` filename typo;
commented-out dead blocks in `main.rs`, `Progress.tsx`, and `MainModal.tsx`; `byte-utils.ts` becomes
unused after T-02 or T-26.

### T-25 · Auto-update + signed builds
**Status:** TODO · **Priority:** P2

No update mechanism, and builds are unsigned and un-notarized so macOS shows a Gatekeeper warning.
Lower urgency than it looks given there are no users — but it becomes the delivery mechanism for
everything else here the moment there are. Needs `tauri-plugin-updater`, a signing keypair in repo
secrets, and an Apple Developer account for notarization. Sequence after the P0 block.

---

## Feature backlog

Not scheduled until P0 is clear. Several are cheap follow-ons to P0 work — noted where that's true.

**Cheap, high value**
- **F-01** Round-trip our own exports — folded into T-04.
- **F-02** Expose algorithm/digits/period in the add/edit form — do it inside T-06; the data model
  already carries the fields and `pages/New/indx.tsx:52` already has the `TODO`.
- **F-03** Favorites / pin-to-top.
- **F-04** Configurable lock timeout — folded into T-08. Clipboard auto-clear is T-13.
- **F-05** Duplicate detection and import preview (choose which entries to bring in). Duplicate
  identity is settled by D-2: normalized secret.
- **F-06** More importers: 2FAS, Bitwarden, KeePassXC OTP entries, Google Authenticator
  `otpauth-migration://` (protobuf), plain `otpauth://` line-delimited files.

**Medium effort**
- **F-07** Real HOTP support with a manual increment button — the deferred half of D-3/T-05.
- **F-08** Steam Guard codes (custom alphabet, 5 characters).
- **F-09** Keyfile support as a second factor for the vault itself. kdbxweb has it; under T-26 it's a
  second input to the KDF.
- **F-10** OS keychain / Touch ID quick-unlock, master password still required periodically.
  Interacts with T-08's threat model — decide explicitly what quick-unlock is meant to protect
  against before building it.
- **F-11** Screen-region QR capture, or scan a QR from a clipboard image. Picking a PNG file is a lot
  of friction for what should be the primary add path.
- **F-12** QR export per entry, to move a secret to a phone. Needs a reveal-secret confirmation.
- **F-13** Folders or tags plus filtering — matters past roughly 30 entries.
- **F-14** Global show/hide hotkey, tray icon, "copy top search match" on Enter.

**Later**
- **F-15** Autotype / paste-into-focused-window; user-chosen vault location (deliberate sync); i18n.

---

## Verified facts

Checked directly against the tree so nobody re-derives them. Versions: `kdbxweb@2.1.1`, Tauri v2,
`rust-argon2@2.1.0`. **If you discover any of these is wrong, fix it here in the same commit.**

- `kdbxweb` `HeaderConst.DefaultKdfAlgo = KdfId.Argon2d` — `dist/kdbxweb.js:3022`.
- `kdbxweb` default KDF params: `DefaultKdfMemory = 1024 * 1024` (bytes), `DefaultKdfIterations = 2`,
  `DefaultKdfParallelism = 1`, `DefaultKdfVersion = 0x13` — `dist/kdbxweb.js:3023-3027`. Truthy never
  overrides these, so live vaults use 1 MiB / 2 / 1.
- `kdbxweb` divides memory by 1024 before invoking the registered Argon2 impl
  (`dist/kdbxweb.js:679`), so our callback receives KiB — which matches `rust-argon2`'s
  `Config.mem_cost` unit. **The memory units are correct today; only the variant is wrong.**
- `kdbxweb` passes `argon2type` and `version` to the registered impl (`dist/kdbxweb.js:679`); the
  callback in `src/utils/kdbx.ts` accepts and silently drops both, and
  `src-tauri/src/main.rs:70` hardcodes `Variant::Argon2id`.
- `Kdbx.setKdf` exists at `dist/kdbxweb.js:4652`. The KDF *parameter*-setting surface has not been
  checked — verify before relying on it.
- `@tauri-apps/plugin-shell` is imported nowhere under `src/` (grepped) despite being registered and
  permissioned.
- `src-tauri/.gitignore` already covers `/target/` and `/gen/schemas`.
- The app makes no network requests; there is no telemetry and no update check.
- **`TOTP.generate` (totp-generator 2.x) is async**, returns `{ otp, expires }`, and accepts
  `{ digits, algorithm, encoding, period, timestamp, explicitZeroPad }`. Its `TOTPAlgorithm` values
  (`"SHA-1"`, `"SHA-256"`, `"SHA-384"`, `"SHA-512"`) already match what `parseOtpAuthURL`'s `algomap`
  produces. `expires` makes per-entry countdowns cheap (relevant to T-06).
- **totp-generator resolves crypto as `globalThis.crypto || require("node:crypto").webcrypto`**, so
  the `node:crypto` externalization warning from `vite build` is benign in a webview — the
  short-circuit means the require is never evaluated. It falls back to bundled `jssha` if WebCrypto
  throws. This is a *second* WebCrypto dependency in the OTP path, which strengthens D-6's argument
  for generating codes in Rust: it would drop this dependency entirely.
- `TOTP.generate` throws `"Invalid base32 character in key"` from `base32ToBuffer` on a malformed
  secret. Code generation in `pages/Home/index.tsx` guards per entry so one bad secret can't blank
  every code.
- **plugin-dialog v2 names the confirm/message dialog option `kind`**, not `type`
  (`dist-js/index.d.ts:199`).
- `cargo clippy --all-targets -- -D warnings` and `cargo test` are both clean as of `f4fb98c`, so CI
  can enforce them.
- The main JS chunk is **~2.47 MB** (877 kB gzipped) as of `b82634c`, dominated by the eagerly-globbed
  icon set — empirical support for T-19.
- Tauri's Rust `app.path().app_data_dir()` and the JS `BaseDirectory.AppData` resolve to the same
  directory (`~/Library/Application Support/com.fosslife.truthy` on macOS), which is what lets the
  Rust `save_vault` command and the JS read paths coexist.
- **A live vault's KDF parameters read back as Argon2d / 1 MiB / 2 iterations / 1 lane / v0x13** —
  kdbxweb's defaults, confirmed on a real file rather than inferred from library source.
- **Deriving with Argon2d fails with `InvalidKey` on a vault this app wrote; Argon2id succeeds.**
  Direct proof of T-03.
- kdbxweb throws `Unsupported: bad derived key` when an Argon2 impl returns a buffer whose
  `byteLength` differs from the requested length — a misleading message for what is usually Node's
  pooled-`Buffer.buffer` trap. `Kdbx.load` also mutates the buffer passed to it.

**Not verified — test before relying on it:** whether `window.prompt`, `window.confirm`, and `alert`
function in Tauri v2 webviews on macOS, Windows, and Linux (affects T-09, T-23); whether Mantine
requires `style-src 'unsafe-inline'` (affects T-10); the current maintenance status of `bardecoder`
and `image` (affects T-27); the exact scope of the NCC Group audit of RustCrypto's AEAD crates
(cited in D-6 — treat as a pointer, not a guarantee).

---

## Changelog

- **2026-07-26 (later)** — **T-28, T-17, T-01 landed** (`b82634c`, `a569702`, `d413a24`, `f4fb98c`).
  Build repaired (it was broken on `master` at `670eaf7`); CI added with a blocking typecheck, blocking
  clippy + `cargo test`, and an advisory dependency audit; vault writes made atomic via a Rust
  `save_vault` command, with saves serialized and the window-close save no longer racing teardown. 5
  Rust tests cover the atomic write. T-18's Rust half is therefore started; the frontend runner is
  still missing. A vault written by the new path was then unlocked offline (see
  [Inspecting a vault offline](#inspecting-a-vault-offline)), confirming both it and its rotated
  `.bak` are valid and decryptable. The same exercise **empirically proved T-03's Argon2 variant
  mismatch** and confirmed the live KDF parameters are 1 MiB / 2 / 1. **Remaining gap:** code
  generation, rendering, and copy-to-clipboard are still unexercised, because the test vault has 0
  entries — add one and check codes render and tick over.
- **2026-07-26** — Doc created from an initial read-only audit of commit `c720fae`. Decisions D-1
  through D-5 resolved by the maintainer; D-6 (kdbxweb replacement) raised and left open with a
  recommendation of Option B. T-02, T-03, T-07, T-12, T-24 moved to `BLOCKED` pending D-6, since
  their value depends on staying on kdbxweb. T-26 (Rust-owned vault) and T-27 (dependency health)
  added. Repo switched to pnpm-only: `yarn.lock` deleted, `release.yml` migrated to
  `pnpm/action-setup` with `cache: "pnpm"` and `--frozen-lockfile`, `packageManager` pinned in
  `package.json`, Tauri-v1 webkitgtk 4.0 dep dropped from CI. `CLAUDE.md` added. No application code
  changed.
