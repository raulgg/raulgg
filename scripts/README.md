# Scripts

## Update Stack Icons

Run the stack icon sync from the repository root:

```sh
node scripts/sync-stack-icons.mjs
```

The script updates `assets/stack/*.svg` for every entry in `TECH_STACK`.

To add a new stack item, add its icon slug to the `TECH_STACK` constant in `sync-stack-icons.mjs`, then run the sync command.

Use `SVGL_TITLE_OVERRIDES` when an icon slug should resolve to a different SVGL title. Use `DEVICON_DARK_FILL_OVERRIDES` when a Devicon icon needs a generated dark variant with a replacement fill color.

If SVGL provides both light and dark routes for an icon, the script also generates a `*-dark.svg` variant. Devicon icons can generate a dark variant when their slug is listed in `DEVICON_DARK_FILL_OVERRIDES`. Reference those icons in `README.md` with a `<picture>` element so GitHub can switch images based on the active color scheme.

Source order:

1. SVGL
2. Devicon, using the `original` SVG variant
3. Existing local SVG fallback

Each icon is wrapped in a `48x48` SVG canvas with the logo rendered inside a `40x40` area. This creates `4px` of transparent spacing on every side, which works in GitHub READMEs.

Useful checks:

```sh
node scripts/sync-stack-icons.mjs --dry-run
```

Use `--dry-run` to check what would be updated without writing files.
