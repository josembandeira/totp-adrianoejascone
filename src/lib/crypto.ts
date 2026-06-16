type Sodium = typeof import('libsodium-wrappers-sumo')

let sodium: Sodium | null = null

async function getSodium() {
  if (!sodium) {
    const mod = await import('libsodium-wrappers-sumo')
    // the dynamic import's namespace only has a few static exports; the
    // crypto_*/randombytes_* functions are attached to the default export
    // object once `ready` resolves, so we must use `.default`, not the namespace.
    sodium = (mod.default ?? mod) as unknown as Sodium
    await sodium.ready
  }
  return sodium
}

export async function encryptSeed(seed: string, masterKey: Uint8Array): Promise<string> {
  const na = await getSodium()
  const nonce = na.randombytes_buf(na.crypto_secretbox_NONCEBYTES)
  const message = na.from_string(seed)
  const cipher = na.crypto_secretbox_easy(message, nonce, masterKey)
  const combined = new Uint8Array(nonce.length + cipher.length)
  combined.set(nonce)
  combined.set(cipher, nonce.length)
  return na.to_base64(combined)
}

export async function decryptSeed(encryptedSeed: string, masterKey: Uint8Array): Promise<string> {
  const na = await getSodium()
  const combined = na.from_base64(encryptedSeed)
  const nonce = combined.slice(0, na.crypto_secretbox_NONCEBYTES)
  const cipher = combined.slice(na.crypto_secretbox_NONCEBYTES)
  const message = na.crypto_secretbox_open_easy(cipher, nonce, masterKey)
  return na.to_string(message)
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const na = await getSodium()
  const passwordBytes = na.from_string(password)
  return na.crypto_pwhash(
    na.crypto_secretbox_KEYBYTES,
    passwordBytes,
    salt,
    na.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    na.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    na.crypto_pwhash_ALG_DEFAULT,
  )
}

export async function generateSalt(): Promise<string> {
  const na = await getSodium()
  const salt = na.randombytes_buf(na.crypto_pwhash_SALTBYTES)
  return na.to_base64(salt)
}

export async function saltFromBase64(base64: string): Promise<Uint8Array> {
  const na = await getSodium()
  return na.from_base64(base64)
}

export interface KeyPair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

// Par de chaves assimétricas do usuário, usado para "selar" (envelopar) a
// chave simétrica de uma equipe para ele sem que o servidor jamais veja a
// chave da equipe em claro.
export async function generateKeyPair(): Promise<KeyPair> {
  const na = await getSodium()
  const pair = na.crypto_box_keypair()
  return { publicKey: pair.publicKey, privateKey: pair.privateKey }
}

export async function encryptPrivateKey(privateKey: Uint8Array, masterKey: Uint8Array): Promise<string> {
  const na = await getSodium()
  const nonce = na.randombytes_buf(na.crypto_secretbox_NONCEBYTES)
  const cipher = na.crypto_secretbox_easy(privateKey, nonce, masterKey)
  const combined = new Uint8Array(nonce.length + cipher.length)
  combined.set(nonce)
  combined.set(cipher, nonce.length)
  return na.to_base64(combined)
}

export async function decryptPrivateKey(
  encryptedPrivateKey: string,
  masterKey: Uint8Array,
): Promise<Uint8Array> {
  const na = await getSodium()
  const combined = na.from_base64(encryptedPrivateKey)
  const nonce = combined.slice(0, na.crypto_secretbox_NONCEBYTES)
  const cipher = combined.slice(na.crypto_secretbox_NONCEBYTES)
  return na.crypto_secretbox_open_easy(cipher, nonce, masterKey)
}

// Chave simétrica de uma equipe, compartilhada entre membros via envelopes
// selados (uma cópia por membro, cifrada com a chave pública dele).
export async function generateTeamKey(): Promise<Uint8Array> {
  const na = await getSodium()
  return na.randombytes_buf(na.crypto_secretbox_KEYBYTES)
}

export async function sealForMember(teamKey: Uint8Array, recipientPublicKey: Uint8Array): Promise<string> {
  const na = await getSodium()
  const sealed = na.crypto_box_seal(teamKey, recipientPublicKey)
  return na.to_base64(sealed)
}

export async function openSealedKey(wrappedKey: string, keyPair: KeyPair): Promise<Uint8Array> {
  const na = await getSodium()
  const sealed = na.from_base64(wrappedKey)
  return na.crypto_box_seal_open(sealed, keyPair.publicKey, keyPair.privateKey)
}

export async function publicKeyToBase64(publicKey: Uint8Array): Promise<string> {
  const na = await getSodium()
  return na.to_base64(publicKey)
}

export async function publicKeyFromBase64(base64: string): Promise<Uint8Array> {
  const na = await getSodium()
  return na.from_base64(base64)
}
