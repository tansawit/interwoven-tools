import { fetchJson } from './fetch-json';

export const REGISTRY_URL = 'https://registry.initia.xyz';
export const TESTNET_REGISTRY_URL = 'https://registry.testnet.initia.xyz';

export interface Chain {
  chain_name: string;
  pretty_name: string;
  chain_id: string;
  network_type: string;
  apis?: {
    rest?: Array<{ address: string }>;
    rpc?: Array<{ address: string }>;
    'json-rpc'?: Array<{ address: string }>;
  };
  metadata?: {
    op_bridge_id?: string;
    minitia?: {
      type: string;
      version: string;
    };
  };
  logo_URIs?: {
    png?: string;
  };
}

export interface DenomUnit {
  denom: string;
  exponent: number;
}

export interface RegistryAsset {
  base: string;
  display: string;
  symbol: string;
  denom_units: DenomUnit[];
  traces?: {
    type: string;
    counterparty?: {
      chain_name: string;
      base_denom: string;
      channel_id?: string;
    };
    chain?: {
      channel_id?: string;
      path?: string;
      bridge_id?: string;
    };
  }[];
}

export interface AssetList {
  chain_name: string;
  assets: RegistryAsset[];
}

export function getChains(registryUrl = REGISTRY_URL): Promise<Chain[]> {
  return fetchJson<Chain[]>(`${registryUrl}/chains.json`);
}

export function getAssetList(chainName: string, registryUrl = REGISTRY_URL): Promise<AssetList> {
  return fetchJson<AssetList>(`${registryUrl}/chains/${chainName}/assetlist.json`);
}
