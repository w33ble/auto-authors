# auto-authors

Command line tool for generating a list of authors from git commit history and github.

Created in the spirit of [auto-changelog](https://github.com/CookPete/auto-changelog/).

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/w33ble/auto-authors/master/LICENSE)
[![npm](https://img.shields.io/npm/v/auto-authors.svg)](https://www.npmjs.com/package/auto-authors)
[![Project Status](https://img.shields.io/badge/status-experimental-orange.svg)](https://nodejs.org/api/documentation.html#documentation_stability_index)


## Installation

```
$ npm install auto-authors

# or globally, if you like

$ npm install -g auto-authors
```

## Usage

**NOTE:** You may need to provide your github access token to get past API limits, see below.

```
$ auto-authors 
```

#### Options

`auto-authors` can also take some argument, which you can use to control its output. You can use `--help` to see this list as well.

options | default | description
------- | ------- | -----------
template | `compact` | The template to use, either one of the provided tempates (`compact`, `complete`, or `json`) or the path to a custom template.
output | `AUTHORS.md` | The file to write the author info to.

#### Optional Authentication

To get around GitHub's API rate limiting you can provide a personal
OAuth2 access token, e.g.

```
$ OAUTH_TOKEN=b2935592ba8667b668d4a433162bc3d2b96e9e1b auto-authors
```

You can create and revoke  [personal access tokens in your account settings](https://github.com/settings/tokens). For this use case no special permissions are required, so `public access` is sufficient.

## Programmatic Usage

If you'd like to use this module in node, it exports 3 methods, all of which return promises:

method | description
------ | -----------
githubAuthors() | Resolves to an array of objects for each author. The objects contain `name`, `email`, and `username` depending on what information is available, and uses the Github API to get the username.
gitAuthors() | Resolves to an array of objects for each author. The objects contain `name` and `email` and *does not* use the Github API at all.
compileTemplate(template, data) | Resolves to a string, containing the markdown output given the template and data. `data` should be an object with an `authors` property that contains an array of authors (from `githubAuthors` or `gitAuthors`).

#### License

MIT © [David Trejo](https://github.com/DTrejo), [Joe Fleming](https://github.com/w33ble)
