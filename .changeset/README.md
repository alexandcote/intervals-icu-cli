# Changesets

Add a changeset for every user-visible change:

```sh
pnpm changeset
```

After changes reach `main`, the Changesets GitHub Action maintains a release PR
that consumes pending changesets and updates package versions and `CHANGELOG.md`.
Merging that release PR publishes the package automatically.

To generate those files locally instead, run:

```sh
pnpm version-packages
```

Commit the generated release files as part of a release PR. Do not create the
release tag manually; Changesets creates it after publishing.
