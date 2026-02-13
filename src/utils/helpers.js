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