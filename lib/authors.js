const { exec } = require('child_process');
const fetch = require('node-fetch');
const pkg = require('../package.json');

const RATE_LIMIT_EXCEEDED = 'Rate limit exceeded';
let rateLimitExceeded = false;

function unique(things) {
  const seen = [];
  return things.filter(t => {
    if (t && !seen.includes(t)) {
      seen.push(t);
      return true;
    }
    return false;
  });
}

// returns array of strings like
//    "firstname lastname <email@host.com>"
// - first contributions are first in the list
// - contains duplicates
// - might not have a real email
// - might not have real name
function gitAuthors() {
  return new Promise((resolve, reject) => {
    exec('git log --pretty="%an <%ae>"', (err, stdout, stderr) => {
      if (err || stderr) reject(new Error(err || stderr));
      else resolve(stdout.split('\n').reverse());
    });
  });
}

function nameAndEmail() {
  return gitAuthors().then(ppl => unique(ppl));
}

// look for the email first. if no results, look for the name.
function lookupGithubLogin(p) {
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
      const newP = Object.assign({}, p, { login: email });
      return newP;
    }

    // return getLogin(apiURI + encodeURIComponent(p.name + ' in:email type:user'))
    return getLogin(apiURI + encodeURIComponent(`${p.name} in:fullname type:user`)).then(name => {
      if (name) {
        const newP = Object.assign({}, p, { login: name });
        return newP;
      }

      return p;
    });
  });
}

function toMarkdown(p) {
  let str = '- ';
  if (p.login && p.login !== 'undefined') {
    str = `${str}[${p.name}](https://github.com/${p.login})`;
    if (p.name !== p.login) str += ` aka \`${p.login}\``;
  } else {
    str += p.name;
  }
  return str;
}

function authors(path, print) {
  function log(...args) {
    // eslint-disable-next-line no-console
    if (print) console.log.apply(console.log(...args));
  }

  process.chdir(path);

  return nameAndEmail()
    .then(ppl => {
      const tasks = ppl.map(p => {
        const person = {
          name: p.substring(0, p.indexOf('<')).trim(),
          email: p.substring(p.indexOf('<') + 1, p.indexOf('>')).trim(),
        };

        return lookupGithubLogin(person);
      });

      if (print) log(`Fetching ${tasks.length} logins from github based on email/name...`);
      return Promise.all(tasks);
    })
    .then(results => {
      const seen = {};
      const uresults = results
        .map(p => {
          if (seen[p.login]) return null;
          seen[p.login] = true;
          return p;
        })
        .filter(p => p)
        .map(toMarkdown);

      if (print) {
        log('');
        log('## Contributors');
        log(
          `${'Ordered by date of first contribution.' +
            ' [Auto-generated](https://github.com/dtrejo/node-authors) on '}${new Date().toUTCString()}.`
        );
        log('');
        log(uresults.join('\n'));
        log('');
      }

      return uresults;
    })
    .catch(err => {
      if (err.message === RATE_LIMIT_EXCEEDED) {
        log('\nWarning: GitHub API rate limit exceeded! The result might be incomplete!\n');
        if (!process.env.OAUTH_TOKEN) {
          log('Hint: Set the "OAUTH_TOKEN" environment variable to increase your limit.\n');
        }
      }

      throw err;
    });
}

module.exports = {
  authors,
  nameAndEmail,
};
