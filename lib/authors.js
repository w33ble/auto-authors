const { exec } = require('child_process');
const fetch = require('node-fetch');
const pkg = require('../package.json');

const RATE_LIMIT_EXCEEDED = 'Rate limit exceeded';
let rateLimitExceeded = false;

// returns array of strings like
//    "firstname lastname <email@host.com>"
// - first contributions are first in the list
// - contains duplicates
// - might not have a real email
// - might not have real name
function gitAuthors() {
  const delim = '-----AUTHOR_EMAIL_DELIM-----';
  return new Promise((resolve, reject) => {
    exec(`git log --pretty="%an${delim}%ae"`, (err, stdout, stderr) => {
      if (err || stderr) reject(new Error(err || stderr));
      else resolve(stdout.split('\n').reverse());
    });
  }).then(ppl =>
    ppl.map(output => {
      const [name, email] = output.split(delim);
      return { output, name, email };
    })
  );
}

function nameAndEmail() {
  return gitAuthors().then(ppl => {
    const seen = [];
    const uauthors = ppl.filter(({ email }) => {
      if (email && !seen.includes(email)) {
        seen.push(email);
        return true;
      }
      return false;
    });

    return uauthors.map(a => ({ name: a.name, email: a.email }));
  });
}

// look for the email first. if no results, look for the name.
function lookupGithubUsername(p) {
  const apiURI = 'https://api.github.com/search/users?q=';
  // var options = { json: true, headers: { 'user-agent': pkg.name + '/' + pkg.version } }
  const options = {
    method: 'GET',
    headers: {
      'user-agent': `${pkg.name}/${pkg.version}`,
      'Content-Type': 'application/json',
    },
  };
  if (process.env.OAUTH_TOKEN) {
    options.headers.Authorization = `token ${process.env.OAUTH_TOKEN.trim()}`;
  }

  function getLogin(url) {
    return fetch(url, options)
      .then(res => {
        if (!res.ok || res.status >= 400) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(json => {
        rateLimitExceeded = rateLimitExceeded || json.message;
        if (rateLimitExceeded) throw new Error(RATE_LIMIT_EXCEEDED);
        if (json.items && json.items[0]) return json.items[0].login;
        return null;
      });
  }

  return getLogin(apiURI + encodeURIComponent(`${p.email} in:email type:user`)).then(email => {
    if (email) {
      const newP = Object.assign({}, p, { username: email });
      return newP;
    }

    // return getLogin(apiURI + encodeURIComponent(p.name + ' in:email type:user'))
    return getLogin(apiURI + encodeURIComponent(`${p.name} in:fullname type:user`)).then(name => {
      if (name) {
        const newP = Object.assign({}, p, { username: name });
        return newP;
      }

      return p;
    });
  });
}

function authors() {
  return nameAndEmail()
    .then(ppl => {
      const tasks = ppl.map(person => lookupGithubUsername(person));
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
}

module.exports = {
  authors,
  nameAndEmail,
};
