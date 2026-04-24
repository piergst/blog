# CLAUDE.md

## Stack

Hugo static site. PaperMod theme lives as a git submodule under `themes/PaperMod/` — never edit files there, override via project-level `layouts/` and `assets/`.

## Key choices

- **Multilingual FR/EN** — FR is the default language (no URL prefix), EN is prefixed with `/en/`. Per-language settings (menus, titles, language switcher labels) live under `[languages.*]` in `hugo.toml`.
- **Page bundles for articles** — an article is a folder `content/posts/<slug>/` containing `index.fr.md`, `index.en.md`, and any co-located assets (images, extra HTML, etc.). Image paths in markdown are relative (`![alt](pic.png)`), not `/static/...`.
- **Section-wide params via `[cascade]`** — `content/posts/_index.{fr,en}.md` use `[cascade]` to push `ShowToc = true` / `TocOpen = true` to every post, without adding it to each article's front matter. Individual posts can override with `ShowToc = false`.
- **Copy-code button is custom** — PaperMod's built-in is disabled (`ShowCodeCopyButtons = false` in `hugo.toml`). Our version lives in `layouts/partials/extend_footer.html` and injects SVG icons, a press animation, and a single-line vs multi-line position variant.
- **Code block styling follows PaperMod's `.toc` pattern** — background goes directly on the bordered element, inner elements are forced transparent. This avoids the nested bg/radius mismatch we fought through (Chroma injects an inline `style="background-color:..."` on `<pre>`; PaperMod sets its own on `<code>`). See comments in `assets/css/extended/custom.css`.
- **Language badge** — pure CSS, reads Chroma's `data-lang` attribute via `content: attr(data-lang)` on a `::before` pseudo-element. No JS involvement.
- **Syntax highlighting** — Chroma, style configured in `hugo.toml` under `[markup.highlight]`. Any style name from https://xyproto.github.io/splash/docs/all.html works.
- **Shortcodes organised by article** — `layouts/shortcodes/<article-slug>/` subfolders keep article-specific shortcodes tied to their article. Call with `{{< article-slug/shortcode-name >}}`.

## Customization entry points

- `assets/css/extended/custom.css` — site-wide CSS overrides. PaperMod auto-loads any file here after its own CSS, so rules win at equal specificity.
- `layouts/partials/extend_footer.html` — hook PaperMod calls at the end of `<body>`. Use for custom JS that needs the DOM ready.
- `layouts/shortcodes/` — flat or subfolder-organised, called from markdown via `{{< name >}}` or `{{< folder/name >}}`.

## Commenting conventions

- **English** across config, CSS, templates, and front matter comments.
- **Sober** — only the WHY when non-obvious. Never the WHAT.
- **Trust the reader** — don't narrate what a selector or property does; named identifiers already say it.
- **Do explain** inline-style overrides (and the `!important` they require), magic numbers (e.g. the `scale(0.88)` press feedback), gotchas (clipboard API needs HTTPS or localhost), and non-obvious architectural choices.
- **CSS files** with multiple topics use `=====` banner separators between sections.
- **TOML front matter** accepts `#` comments — use them sparingly, for non-obvious directives like `[cascade]`.
