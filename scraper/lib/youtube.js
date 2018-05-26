const request = require('request');
const cheerio = require('cheerio');

function linksFromYouTubeWithPrefix(url, prefix = 're:publica 2018 – ', suffix = null) {
  const promise = new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) { reject(error); return; }

      const $ = cheerio.load(body);

      const links = {};
      $('a').each((i, link) => {
        const a = $(link);
        const href = a.attr('href');
        const text = a.text().trim();

        let matches = false;
        if (prefix && text.startsWith(prefix)) {
          matches = true;
        } else if (prefix && text.endsWith(suffix)) {
          matches = true;
        }

        if (matches) {
          const [textTitle] = text.replace(prefix, '').split('\n');
          links[textTitle.toLowerCase()] = `https://www.youtube.com${href}`;
        }
      });

      resolve(links);
    });
  });
  return promise;
}

module.exports = linksFromYouTubeWithPrefix;
