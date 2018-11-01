const fetch = require('node-fetch');
const pkg = require('../package.json');
const { RATE_LIMIT_EXCEEDED } = require('./constants');

let rateLimitExceeded = false;

// look for the email first. if no results, look for the name.
module.exports = function fetchGithubUsername(person) {
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

  function getError(res) {
    const remaining = res.headers.get('x-ratelimit-remaining');

    // handle rate limiting issues
    if (remaining <= 0) {
      const err = new Error(RATE_LIMIT_EXCEEDED);
      err.resetTime = res.headers.get('x-ratelimit-reset') * 1000;
      return err;
    }

    return new Error(`${res.status}: ${res.statusText} (${res.url})`);
  }

  function getLogin(url) {
    return fetch(url, options)
      .then(res => {
        if (!res.ok || res.status >= 400) throw getError(res);
        return res.json();
      })
      .then(json => {
        rateLimitExceeded = rateLimitExceeded || json.message;
        if (rateLimitExceeded) throw new Error(RATE_LIMIT_EXCEEDED);
        if (json.items && json.items[0]) return json.items[0].login;
        return null;
      });
  }

  const userEmailUri = apiURI + encodeURIComponent(`${person.email} in:email type:user`);
  const getLoginDetails = () =>
    getLogin(userEmailUri).then(email => {
      if (email) {
        return Object.assign({}, person, { username: email });
      }

      // return getLogin(apiURI + encodeURIComponent(person.name + ' in:email type:user'))
      const userNameUri = apiURI + encodeURIComponent(`${person.name} in:fullname type:user`);
      return getLogin(userNameUri).then(name => {
        if (name) return Object.assign({}, person, { username: name });

        // no username or email match, just return the original person object
        return person;
      });
    });

  return getLoginDetails();
};
