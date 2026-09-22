# Changesets

Add a changeset for every user-visible change:

```sh
pnpm changeset
```

Before a release, consume pending changesets to update package versions and
`CHANGELOG.md`:

```sh
pnpm version-packages
```

Commit the generated release files, merge them, then tag the release using the
version from `package.json`.
