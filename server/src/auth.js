const accounts = [
  { name: 'Alice', password: '123', id: 'alice1'},
  { name: 'Bob', password: '456', id: 'bob2' },
  { name: 'Charlie', password: '789', id: 'charlie3'},
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