const Slug = require('slug');
const ent = require('ent');

Slug.defaults.mode = 'rfc3986';

const Helpers = {
  dehtml: function dehtml(str) {
    const nohtml = str.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'')
    return ent.decode(nohtml);
  },
  mkId: function mkId(string) {
    return string.toString().replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
  },
  nullIfEmpty: function nullIfEmpty(string) {
    if (typeof string === 'string' && string.length > 0) {
      return string;
    }
    return null;
  },
  slug: function makeSlug(string) {
    const stopwords = ['in', 'von', 'ist', 'und', 'zu', 'für', 'der', 'die', 'das'];
    const filteredString = string.split(' ').filter(word => !stopwords.includes(word.toLowerCase())).join(' ');
    return Slug(filteredString);
  },
};

module.exports = Helpers;
