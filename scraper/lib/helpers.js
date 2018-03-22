const ent = require('ent');

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
  }
};

module.exports = Helpers;