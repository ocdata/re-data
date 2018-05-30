const Format = {
  Discussion:
    { id: 'discussion', label_de: 'Diskussion', label_en: 'Discussion' },
  Talk:
    { id: 'talk', label_de: 'Vortrag', label_en: 'Talk' },
  Workshop:
    { id: 'workshop', label_de: 'Workshop', label_en: 'Workshop' },
  Action:
    { id: 'action', label_de: 'Aktion', label_en: 'Action' },
  Meetup:
    { id: 'meetup', label_de: 'Meetup', label_en: 'Meetup' },
};

const Level = {
  Everyone:
    { id: 'everyone', label_de: 'Alle', label_en: 'Everyone' },
  Beginner:
    { id: 'beginner', label_de: 'Anfänger', label_en: 'Beginner' },
  Fortgeschrittene:
    { id: 'intermediate', label_de: 'Fortgeschrittene', label_en: 'Intermediate' },
  Experten:
    { id: 'advanced', label_de: 'Experten', label_en: 'Advanced' },
};

const Language = {
  German: {
    id: 'de',
    label_de: 'Deutsch',
    label_en: 'German',
  },
  English: {
    id: 'en',
    label_de: 'Englisch',
    label_en: 'English',
  },
};


const Mappings = { Format, Level, Language };

module.exports = Mappings;
