// 'username' is the unique login identifier; 'name' is the display name and may be shared.
const accounts = [
  { username: 'alice', name: 'Alice', password: '123', id: 'alice1'},
  { username: 'bob',   name: 'Bob',   password: '456', id: 'bob2' },
  { username: 'charlie', name: 'Charlie', password: '789', id: 'charlie3'},
  { username: 'dan',   name: 'Dan',   password: 'abc', id: 'dan4'},
  { username: 'eve',   name: 'Eve',   password: 'def', id: 'eve5'},
];


export function authenticateUser(usernameIn, passwordIn) {
  for (let i = 0; i < accounts.length; i++) {
    console.log("Authenticating user: " + usernameIn);
    if (accounts[i].username === usernameIn && accounts[i].password === passwordIn) {
      return accounts[i];
    }
  }
  return null;
}

export function searchUsers(query) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();

  // Search by name or ID
  return accounts
    .filter(account => {
      const nameMatch = account.name.toLowerCase().includes(lowerQuery);
      const idMatch = account.id.toLowerCase().includes(lowerQuery);
      return nameMatch || idMatch;
    })
    .map(account => ({
      name: account.name,
      id: account.id
      // Don't include password in search results
    }));
}

export function getUserById(userId) {
  const user = accounts.find(account => account.id === userId);
  if (user) {
    return {
      name: user.name,
      id: user.id
      // Don't include password
    };
  }
  return null;
}

export function getUsersByIds(userIds) {
  return userIds
    .map(userId => getUserById(userId))
    .filter(user => user !== null);
}