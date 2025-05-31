import { fromBech32, toBech32 } from '@cosmjs/encoding';

/**
 * Converts a 0x Ethereum address to a bech32 address with the given prefix
 * @param ethAddress Ethereum address (with or without 0x prefix)
 * @param prefix The bech32 prefix to use (e.g., 'init')
 * @returns The bech32 address with the given prefix
 */
export function convertEthToBech32(ethAddress: string, prefix: string = 'init'): string {
  try {
    // Remove 0x prefix if present
    const addressWithoutPrefix = ethAddress.startsWith('0x') 
      ? ethAddress.slice(2) 
      : ethAddress;
    
    // Convert hex to Uint8Array
    const bytes = new Uint8Array(
      addressWithoutPrefix.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    
    // Convert to bech32
    return toBech32(prefix, bytes);
  } catch (error) {
    throw new Error(`Failed to convert Ethereum address to bech32: ${error}`);
  }
}

/**
 * Converts a bech32 address to a 0x Ethereum address
 * @param bech32Address The bech32 address (e.g., 'init1...')
 * @returns The Ethereum address with 0x prefix
 */
export function convertBech32ToEth(bech32Address: string): string {
  try {
    // Decode bech32 address
    const { data } = fromBech32(bech32Address);
    
    // Convert to hex
    const hexAddress = Array.from(data)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    
    // Add 0x prefix
    return `0x${hexAddress}`;
  } catch (error) {
    throw new Error(`Failed to convert bech32 address to Ethereum: ${error}`);
  }
}

/**
 * Validates if the input is a valid Ethereum address
 * @param address The address to validate
 * @returns True if the address is a valid Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
  // Basic validation: 0x followed by 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates if the input is a valid bech32 address with the given prefix
 * @param address The address to validate
 * @param prefix The expected prefix (e.g., 'init')
 * @returns True if the address is a valid bech32 address with the given prefix
 */
export function isValidBech32Address(address: string, prefix: string = 'init'): boolean {
  try {
    const decoded = fromBech32(address);
    return decoded.prefix === prefix;
  } catch (_) {
    // We don't need to use the error, just return false for invalid addresses
    return false;
  }
}
