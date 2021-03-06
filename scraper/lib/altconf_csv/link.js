class Link {
  static get usernameLinkRegExes() {
    return {
      github: /^https?:\/\/([\w-]+\.)?github\.com\/([\w-]+)\/?$/i,
      twitter: /^https?:\/\/([\w-]+\.)?twitter\.com\/([\w-]+)\/?$/i,
      facebook: /^https?:\/\/(([\w-]+)\.)?facebook\.com\/([\w-]+)\/?$/i,
      instagram: /^https?:\/\/([\w-]+\.)?instagram\.com\/([\w-]+)\/?$/i,
      linkedin: /^https?:\/\/([\w-]+\.)?linkedin\.com\/in\/([\w-]+)\/?$/i,
      xing: /^https?:\/\/([\w-]+\.)?xing\.com\/profile\/([\w-]+)\/?$/i,
      'app.net': /^https?:\/\/([\w-]+\.)?app\.net\/([\w-]+)\/?$/i,
      youtube: /^https?:\/\/([\w-]+\.)?youtube\.com\/user\/([\w-]+)\/?$/i,
    };
  }

  static get videoServiceLinkRegExes() {
    return {
      youtube: [/^https?:\/\/([\w-]+\.)?youtube\.com\//i],
      twitch: [/^https?:\/\/([\w-]+\.)?twitch\.tv\//i],
    };
  }

  constructor(url, type, title = null) {
    this.url = url;
    this.type = type;
    this.title = title;
    if (!this.title) this.title = url;
  }

  get urlInfo() {
    let username = null;
    let service = 'web';
    
    // username matches
    Object.entries(Link.usernameLinkRegExes).forEach((keyValue) => {
      const serviceIdentifier = keyValue[0];
      const regex = keyValue[1];

      const match = this.url.match(regex);
      if (match) {
        service = serviceIdentifier;
        username = match[match.length - 1];
      }
    });

    if (!username) {
      Object.entries(Link.videoServiceLinkRegExes).forEach((keyValue) => {
        const serviceIdentifier = keyValue[0];
        const regexes = keyValue[1];

        regexes.forEach((regex) => {
          if (service && service !== 'web') return;
          
          const match = this.url.match(regex);
          if (match) {
            service = serviceIdentifier;
          }
        });
      });
    }

    return { service, username };
  }

  get JSON() {
    const { urlInfo } = this;
    const result = {
      url: this.url,
      type: this.type,
      title: this.title,
      service: urlInfo.service,
    };
    if (urlInfo.username) result.username = urlInfo.username;

    return result;
  }

  get miniJSON() {
    return this.JSON;
  }
}

module.exports = Link;
