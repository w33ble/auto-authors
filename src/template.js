const { readFile } = require('fs');
const { join } = require('path');
const Handlebars = require('handlebars');

const templateDir = join(__dirname, '..', 'templates');

function removeIndentation(string) {
  return string.replace(/\n +/g, '\n').replace(/^ +/, '');
}

function getTemplate(template, cb) {
  // attempt to read from file
  readFile(template, 'utf8', (err, content) => {
    if (err) {
      // no match, attempt to load provided templates
      const templatePath = join(templateDir, `${template}.hbs`);
      readFile(templatePath, 'utf8', cb);
      return;
    }

    // return loaded template file
    cb(null, content);
  });
}

module.exports = function compileTemplate(tpl, data) {
  if (tpl === 'json') {
    return JSON.stringify(data, null, 2);
  }

  return new Promise((resolve, reject) => {
    getTemplate(tpl, (err, template) => {
      if (err) {
        if (err.code === 'ENOENT') reject(new Error(`Template not found: ${tpl}`));
        else reject(err);
      } else resolve(template);
    });
  }).then(template => {
    const output = Handlebars.compile(template)(data);
    return removeIndentation(output);
  });
};
