# External theme bootstrap fallback boundary

The static `theme-ui.css` fallback only prevents a white page by supplying the
nature palette's background and text colors (light and dark). It is **not** a
complete nature theme. The zero-specificity `:where()` selectors intentionally
let the external bootstrap's `:root` variables win.

If the external bootstrap is unavailable (including HTTP 404), `--primary`,
`--textSecondary`, `--border`, `--backgroundSecondary` and `--space-*` remain unset:
button colors, borders and padding degrade. Setting theme/density attributes in
the small inline bootstrap does not populate those missing variables.

## Follow-up (not implemented in this patch)

Generate complete fallback CSS at build time from `THEME_COLORS.nature` and the
shared spacing/density token definitions, rather than adding hand-maintained
palette constants. Preserve zero specificity, avoid runtime dependencies, and
verify both 404 computed styles and successful external-bootstrap overrides.
This is deferred to a separate theme-generation change so the current warning
fix does not broaden the theme-variable/build contract.
