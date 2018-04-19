const gitAuthors = require('./git_authors');
const fetchGithubUsername = require('./fetch_github_username');
const { RATE_LIMIT_EXCEEDED } = require('./constants');

module.exports = function githubAuthors() {
  return gitAuthors()
    .then(ppl => {
      const tasks = ppl.map(person => fetchGithubUsername(person));
      return Promise.all(tasks);
    })
    .then(results => {
      const seen = {};
      return results
        .map(p => {
          if (seen[p.username]) return null;
          seen[p.username] = true;
          return p;
        })
        .filter(p => p);
    })
    .catch(err => {
      if (err.message === RATE_LIMIT_EXCEEDED) {
        // eslint-disable-next-line no-console
        console.warn(
          '\nWarning: GitHub API rate limit exceeded! The result might be incomplete!\n'
        );
        if (!process.env.OAUTH_TOKEN) {
          // eslint-disable-next-line no-console
          console.warn(
            'Hint: Set the "OAUTH_TOKEN" environment variable to increase your limit.\n'
          );
        }
      }

      throw err;
    });
};
