const githubAuthors = require('./github_authors');
const gitAuthors = require('./git_authors');

module.exports = {
  authors: githubAuthors,
  nameAndEmail: gitAuthors,
};
