export const formatDate = (date) => new Date(date).toISOString().split('T')[0];

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateFarmNumber = () => '#F-' + Math.floor(1000 + Math.random() * 9000);

export const generateEmail = (username) => `${username}@rotracker.com`;

export const defaultUserData = (uid, username) => ({
  uid: uid,
  email: generateEmail(username),
  createdAt: new Date(),
  role: 'user',
  profile: { username: username.toLowerCase(), avatar: null, mainCharacter: "" },
  otherPlayers: {},
  clan: null
});

export const formatLevelDisplay = (level, awakening) => {
  const lvl = Number(level);
  const awk = Number(awakening);

  if (!lvl || isNaN(lvl)) return "";

  if (lvl < 85) {
    return `${lvl}`;
  }

  if (lvl === 85) {
    if (awk > 0) {
      return `85/${awk}`;
    } else {
      return `85`;
    }
  }

  return `${lvl}`;
};