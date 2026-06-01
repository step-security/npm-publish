[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# Fast, easy publishing to NPM

[![Build Status](https://github.com/step-security/npm-publish/workflows/CI-CD/badge.svg)](https://github.com/step-security/npm-publish/actions)
[![License](https://img.shields.io/github/license/step-security/npm-publish)](LICENSE)

Publish packages to npm automatically in GitHub Actions whenever a change to your package's `version` field is detected.

[releases]: https://github.com/step-security/npm-publish/releases

## ⚠️ You probably don't need this!

This action automates a specific kind of continuous deployment to `npm`, where you want to publish whenever the `version` field in `package.json` changes on your `main` branch. If you prefer to publish on tags (for example, those created by the `npm version` command), or are using an alternative package manager like `pnpm`, you don't need this action! Simply configure `setup-node` with its `registry-url` option and call your package manager's `publish` command directly. This is more secure than relying on a third-party action like this one, and is more customizable.

```yaml
# Publish to npm whenever a tag is pushed
name: Publish to npm
on:
  push:
    tags: v*
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: "24"
          registry-url: "https://registry.npmjs.org"
      - run: npm ci
      - run: npm test
      - run: npm publish --ignore-scripts
```

See GitHub's [Node.js publishing][] guide and npm's [trusted publishing][] docs for more details and examples.

[Node.js publishing]: https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages
[trusted publishing]: https://docs.npmjs.com/trusted-publishers#supported-cicd-providers

## Features

- 🧠 **Smart**
  Only publishes if the version number in `package.json` differs from the latest on npm.

- 🛠 **Configurable**
  Customize the version-checking behavior, the registry URL, and path of your package.

- 🔐 **Secure**
  Keeps your npm authentication token secret. Doesn't read nor write to `~/.npmrc`.

- ⚡ **Fast**
  100% JavaScript (which is faster than Docker) and bundled to optimize loading time.

- 📤 **Outputs**
  Exposes the old and new version numbers, and the type of change (major, minor, patch, etc.) as variables that you can use in your workflow.

## Usage

To use the GitHub Action, you'll need to add it as a step in your [workflow file][]. By default, the only thing you need to do is set `permissions.id-token` to `write` to enable [trusted publishing][] via OIDC.

```yaml
on:
  push:
    branches: main

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: "24"
      - run: npm ci
      - run: npm test
      - uses: step-security/npm-publish@v4
```

> [!IMPORTANT]
> If you're publishing a private package with [trusted publishing][], you will still need to provide a read-only [`token`][npm authentication token] so the action can read existing versions from the registry before publish.
>
> ```diff
>   - uses: step-security/npm-publish@v4
> +   with:
> +     token: ${{ secrets.NPM_TOKEN }}
> ```

You can also publish to third-party registries. For example, to publish to the [GitHub Package Registry][], set `token` to `secrets.GITHUB_TOKEN` and `registry` to `https://npm.pkg.github.com`:

```yaml
on:
  push:
    branches: main

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write # allow GITHUB_TOKEN to publish packages
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: "24"
      - run: npm ci
      - run: npm test
      - uses: step-security/npm-publish@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          registry: "https://npm.pkg.github.com"
```

[workflow file]: https://help.github.com/en/actions/automating-your-workflow-with-github-actions
[npm authentication token]: https://docs.npmjs.com/creating-and-viewing-authentication-tokens
[GitHub Package Registry]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry

### Action usage

You can set any or all of the following input parameters using `with`:

| Name             | Type                   | Default                       | Description                                                                      |
| ---------------- | ---------------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `token`          | string                 | None                          | Registry authentication token, not required if using [trusted publishing][]³     |
| `registry`¹      | string                 | `https://registry.npmjs.org/` | Registry URL to use.                                                             |
| `package`        | string                 | Current working directory     | Path to a package directory, a `package.json`, or a packed `.tgz` to publish.    |
| `tag`¹           | string                 | `latest`                      | [Distribution tag][npm-tag] to publish to.                                       |
| `access`¹        | `public`, `restricted` | [npm defaults][npm-access]    | Whether the package should be publicly visible or restricted.                    |
| `provenance`¹ ²  | boolean                | `false`                       | Run `npm publish` with the `--provenance` flag to add [provenance][] statements. |
| `strategy`       | `all`, `upgrade`       | `all`                         | Use `all` to publish all unique versions, `upgrade` for only semver upgrades.    |
| `ignore-scripts` | boolean                | `true`                        | Run `npm publish` with the `--ignore-scripts` flag as a security precaution.     |
| `dry-run`        | boolean                | `false`                       | Run `npm publish` with the `--dry-run` flag to prevent publication.              |

1. May be specified using `publishConfig` in `package.json`.
2. Provenance requires npm `>=9.5.0`.
3. Trusted publishing npm `>=11.5.1` and must be run from a supported cloud provider.

[npm-tag]: https://docs.npmjs.com/cli/v9/commands/npm-publish#tag
[npm-access]: https://docs.npmjs.com/cli/v9/commands/npm-publish#access
[provenance]: https://docs.npmjs.com/generating-provenance-statements

### Action output

npm-publish exposes several output variables, which you can use in later steps of your workflow if you provide an `id` for the npm-publish step.

```diff
  steps:
    - uses: step-security/npm-publish@v4
+     id: publish

+   - if: ${{ steps.publish.outputs.type }}
+     run: echo "Version changed!"
```

| Name          | Type    | Description                                                                                                   |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `id`          | string  | Package identifier of the release: `${name}@${version}` or empty if no release.                               |
| `type`        | string  | [Semver release type][], `initial` if first release, `different` if other change, or empty if no release.     |
| `name`        | string  | Name of the package.                                                                                          |
| `version`     | string  | Version of the package.                                                                                       |
| `old-version` | string  | Previously published version on `tag` or empty if no previous version on tag.                                 |
| `tag`         | string  | [Distribution tag][npm-tag] the package was published to.                                                     |
| `access`      | string  | [Access level][npm-access] the package was published with, or `default` if scoped-package defaults were used. |
| `registry`    | string  | Registry the package was published to.                                                                        |
| `dry-run`     | boolean | Whether `npm publish` was run in "dry run" mode.                                                              |

[semver release type]: https://github.com/npm/node-semver#release_types

## License

npm-publish is under the [MIT license](LICENSE).
