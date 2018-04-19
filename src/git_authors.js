const { exec } = require('child_process');

const delim = '-----AUTHOR_EMAIL_DELIM-----';

// returns array of strings like
//    "firstname lastname <email@host.com>"
// - first contributions are first in the list
// - contains duplicates
// - might not have a real email
// - might not have real name
function gitAuthors() {
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

module.exports = function nameAndEmail() {
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
};
