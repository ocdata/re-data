class Enclosure {
  constructor(url, type, title = null, mimetype = 'video/mp4', thumbnailUrl = null) {
    this.url = url;
    this.type = type;
    this.title = title;
    this.mimetype = mimetype;
    this.thumbnailUrl = thumbnailUrl;
    if (!this.title) this.title = url;
  }

  
  get JSON() {
    const result = {
      url: this.url,
      type: this.type,
      title: this.title,
      mimetype: this.mimetype,
      thumbnail: this.thumbnailUrl,
    };
    
    return result;
  }

  get miniJSON() {
    return this.JSON;
  }
}

module.exports = Enclosure;
