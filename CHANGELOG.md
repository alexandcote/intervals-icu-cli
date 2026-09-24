# intervals-icu-cli

## 0.1.3

### Patch Changes

- 9e6c694: Prompt for API keys without echoing them instead of accepting them as command arguments that can leak into shell history.

## 0.1.2

### Patch Changes

- d9aaced: Bundle runtime dependencies into the published CLI and verify the installed package on Node.js 18.

  Read the CLI version from package metadata so `intervals --version` cannot drift from the published version.

  Manage package versions, changelogs, and npm releases through Changesets release pull requests.
