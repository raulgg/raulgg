# Scripts

## Update Stack Icons

Run the stack icon sync from the repository root:

```sh
node scripts/sync-stack-icons.mjs
```

The script updates `assets/stack/*.svg` for every entry in `TECH_STACK`.

To add a new stack item, add its icon slug to the `TECH_STACK` constant in `sync-stack-icons.mjs`, then run the sync command.

Source order:

1. SVGL
2. Devicon, using the `original` SVG variant
3. Existing local SVG fallback

Each icon is wrapped in a `48x48` SVG canvas with the logo rendered inside a `40x40` area. This creates transparent right and bottom spacing that works in GitHub READMEs.

Useful checks:

```sh
node scripts/sync-stack-icons.mjs --dry-run
node scripts/sync-stack-icons.mjs --local --dry-run
```

Use `--dry-run` to check what would be updated without writing files. Use `--local` to reprocess the current local SVG files without fetching remote sources.
