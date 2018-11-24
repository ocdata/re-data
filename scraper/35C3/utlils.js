function toArray(obj) {
  return Object.keys(obj).map(key => obj[key]);
}

function clone(obj) {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    newObj[key] = obj[key];
  });
  return newObj;
}

function mkSlug(string) {
  const slug = string
    .toString()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .toLowerCase();
  return slug;
}

module.exports = { mkSlug, clone, toArray };

