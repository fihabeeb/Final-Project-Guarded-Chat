const accounts = [
  { name: 'Alice', password: '123', id: 'alice1'},
  { name: 'Bob', password: '456', id: 'bob2' },
  { name: 'Charlie', password: '789', id: 'charlie3'},
  { name: 'Dan', password: 'abc', id: 'dan4'},
  { name: 'Eve', password: 'def', id: 'eve5'},
];


export function authenticateUser(nameIn, passwordIn) {
  for (let i = 0; i < accounts.length; i++) {
    console.log("Authenticating user: " + nameIn);
    console.log("Provided Password: " + passwordIn);
    if (accounts[i].name == nameIn && accounts[i].password == passwordIn) {
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