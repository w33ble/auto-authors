const fetch = require('node-fetch');
const pkg = require('../package.json');
const { RATE_LIMIT_EXCEEDED } = require('./constants');

let rateLimitExceeded = false;

// look for the email first. if no results, look for the name.
module.exports = function fetchGithubUsername(p) {
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
};
