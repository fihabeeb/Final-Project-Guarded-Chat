// End-to-end encryption using ECDH key exchange + AES-GCM
// Key exchange happens when a friend request is accepted.
// The server never sees plaintext — only encrypted ciphertext.

const PRIVATE_KEY_STORAGE = 'ecdhPrivateKey';
const PUBLIC_KEY_STORAGE = 'ecdhPublicKey';

// Generate an ECDH P-256 key pair on first use, or load the existing one.
export async function initECDHKeyPair() {
  if (localStorage.getItem(PRIVATE_KEY_STORAGE) && localStorage.getItem(PUBLIC_KEY_STORAGE)) {
    console.log('[Crypto] ECDH key pair already exists');
    return;
  }
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  const privateJWK = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  localStorage.setItem(PRIVATE_KEY_STORAGE, JSON.stringify(privateJWK));
  localStorage.setItem(PUBLIC_KEY_STORAGE, JSON.stringify(publicJWK));
  console.log('[Crypto] Generated new ECDH key pair');
}

// Returns the user's ECDH public key as a JWK object (safe to send to server/peer).
export async function getMyPublicKeyJWK() {
  const stored = localStorage.getItem(PUBLIC_KEY_STORAGE);
  if (!stored) throw new Error('[Crypto] No ECDH public key found. Call initECDHKeyPair() first.');
  return JSON.parse(stored);
}

// Perform ECDH with the friend's public key and store the resulting AES-GCM key.
// Both peers derive the same key independently — the server is never involved.
export async function deriveAndStoreSharedKey(friendId, theirPublicKeyJWK) {
  const myPrivateJWK = JSON.parse(localStorage.getItem(PRIVATE_KEY_STORAGE));
  if (!myPrivateJWK) throw new Error('[Crypto] No ECDH private key found');

  const myPrivateKey = await crypto.subtle.importKey(
    'jwk', myPrivateJWK,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );
  const theirPublicKey = await crypto.subtle.importKey(
    'jwk', theirPublicKeyJWK,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const aesJWK = await crypto.subtle.exportKey('jwk', aesKey);
  localStorage.setItem(`encKey_${friendId}`, JSON.stringify(aesJWK));
  console.log(`[Crypto] Shared AES-256-GCM key derived and stored for ${friendId}`);
}

export function hasKeyForFriend(friendId) {
  return localStorage.getItem(`encKey_${friendId}`) !== null;
}

async function getKeyForFriend(friendId) {
  const stored = localStorage.getItem(`encKey_${friendId}`);
  if (!stored) return null;
  return crypto.subtle.importKey(
    'jwk', JSON.parse(stored),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypts plaintext with AES-256-GCM. Returns a base64 string: [12-byte IV | ciphertext].
export async function encryptMessage(plaintext, friendId) {
  const key = await getKeyForFriend(friendId);
  if (!key) throw new Error(`[Crypto] No encryption key for ${friendId}`);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);

  let binary = '';
  combined.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

// Decrypts a base64 string produced by encryptMessage.
export async function decryptMessage(encryptedBase64, friendId) {
  const key = await getKeyForFriend(friendId);
  if (!key) throw new Error(`[Crypto] No encryption key for ${friendId}`);

  const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: combined.slice(0, 12) },
    key,
    combined.slice(12)
  );
  return new TextDecoder().decode(decrypted);
}
