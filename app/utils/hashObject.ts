const textEncoder = new TextEncoder;

export async function hashObject (result: object) {
  return await window.crypto.subtle.digest('SHA-256', textEncoder.encode(JSON.stringify(result)))
    .then((hash) => Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''));
}
