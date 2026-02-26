import { changeChatter } from "./chatHistoryHandler.js";


const sidebar = document.querySelector('.sidebar-content');
const contacts = [
    { name: 'Alice', id: 'alice1'},
    { name: 'Bob', id: 'bob2'},
    { name: 'Charlie', id: 'charlie3'},
    { name: 'Dan', id: 'dan4'},
    { name: 'Dan', id: 'dan5'},
];

export function sidebarListeners() {
    contacts.forEach(contact => {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.dataset.contact = contact.name;
        div.innerHTML = `
    <div class="contact-avatar">${contact.name[0]}</div>
    <div class="contact-info">
      <div class="contact-name">${contact.name}</div>
      <div class="contact-status">${'is online?'}</div>
    </div>
  `;
        sidebar.appendChild(div);
    });

    sidebar.addEventListener('click', (e) => {
        const item = e.target.closest('.contact-item');
        if (!item) return;
        // Remove active from all, set on clicked
        //sidebar.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
        //item.classList.add('active');
        document.querySelector('.chat-info h3').textContent = item.dataset.contact;
        document.querySelector('.chat-avatar').textContent = item.dataset.contact[0]; // first letter of new name

        // 2 chats cant have the same name, currently its using that to identify who you clicked on
        // IT DOESNT EVEN WORK
        const chatterId = contacts.find(contact => contact.name === 'item.dataset.contact').id
        changeChatter(chatterId);
    });
}