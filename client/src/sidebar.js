
const sidebar = document.querySelector('.sidebar-content');
const contacts = [
    { name: 'Alice', status: 'Online', key: 'alice' },
    { name: 'Bob', status: 'Away', key: 'bob' },
    { name: 'Charlie', status: 'Offline', key: 'charlie' },
    { name: 'Dan', status: 'Offline', key: 'dan' },
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
      <div class="contact-status">${contact.status}</div>
    </div>
  `;
        sidebar.appendChild(div);
    });

    sidebar.addEventListener('click', (e) => {
        const item = e.target.closest('.contact-item');
        if (!item) return;
        // Remove active from all, set on clicked
        sidebar.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        document.querySelector('.chat-info h3').textContent = item.dataset.contact;
        document.querySelector('.chat-avatar').textContent = item.dataset.contact[0]; // first letter of new name
        console.log('Selected:', item.dataset.contact);
    });
}