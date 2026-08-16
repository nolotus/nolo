# Bundled ripgrep for Nolo Desktop

Desktop local agents use `searchFiles`, which prefers a **packaged** `rg` binary so end users do not need Homebrew or a system ripgrep install.

## Layout

```text
vendor/ripgrep/
  <platform-arch>/rg[.exe]   # cached per target (e.g. darwin-arm64)
  staged/rg[.exe]            # current host binary, copied into the app as Resources/.../bin/
  .cache/                    # download/extract scratch (gitignored)
```

## Refresh / download

```bash
bun packages/desktop/scripts/ensure-bundled-ripgrep.ts
# or force re-download:
bun packages/desktop/scripts/ensure-bundled-ripgrep.ts --force
```

`pre-build.ts` runs this automatically unless `NOLO_DESKTOP_SKIP_BUNDLED_RG=1`.

## Runtime

Desktop sets `NOLO_BUNDLED_RG` to the packaged path. `packages/agent-runtime` resolves:

1. `NOLO_BUNDLED_RG`
2. PATH + common install locations (`/opt/homebrew/bin`, …)
3. grep / pure JS fallbacks

## License

ripgrep is dual-licensed MIT / Unlicense. See https://github.com/BurntSushi/ripgrep
