# Agent Instructions for Zupfnoter Source

## Release Process (Patch Version)

### 1. Update Version
Edit `src/version.rb`:
```ruby
VERSION = "1.17.1"  # Increment patch version
```

### 2. Update Changelogs
Edit both files with the new version section at the top:

**`../../UD_Zupfnoter-Handbuch/095_UD_Zupfnoter-Historie.md`**:
```markdown
## V 1.17.1 Februar 2025

### Fix
- Behoben: [description]
```

**`../../CHANGES.md`**:
```markdown
# 1.17.1 February 2025

## fix

* Fixed: [description]
```

### 3. Commit & Tag
```bash
# Commit version and changelog updates
git add -A
git commit -m "release: V 1.17.1"

# Create annotated tag
git tag -a v1.17.1 -m "Release version 1.17.1"

# Push to remote
git push origin develop
git push origin v1.17.1
```

## Important Notes

- **Dropbox API**: Uses fetch() directly instead of SDK (see `src/opal-dropboxjs.rb` for workaround details)
- **Token Refresh**: Happens inline in `read_file()` and `write_file()` to handle expired tokens
- **Build**: Run `rake servedeploy` after changes to rebuild assets
