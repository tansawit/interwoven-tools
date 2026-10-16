// Minimal BCS encoders for Move view function arguments (base64-encoded, as the REST API expects).

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function uintLE(value: number | bigint, byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  let remaining = BigInt(value);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = Number(remaining & BigInt(0xff));
    remaining >>= BigInt(8);
  }
  return bytes;
}

function addressBytes(address: string): Uint8Array {
  const hex = address.replace(/^0x/, '').padStart(64, '0');
  return Uint8Array.from(hex.match(/.{2}/g)!, (byte) => parseInt(byte, 16));
}

export const bcs = {
  u16: (value: number) => toBase64(uintLE(value, 2)),
  u64: (value: number | bigint) => toBase64(uintLE(value, 8)),
  /** `address` and `Object<T>` share the same 32-byte encoding. */
  address: (address: string) => toBase64(addressBytes(address)),
  optionNone: () => toBase64(Uint8Array.of(0)),
};
