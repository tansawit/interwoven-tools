export interface Chain {
  chain_name: string;
  chain_id: string;
  pretty_name: string;
  logo_URIs: {
    svg?: string;
    png?: string;
  };
  metadata: {
    assetlist: string;
  };
  apis: {
    rest: { address: string }[];
  };
}

export interface DenomUnit {
  denom: string;
  exponent: number;
}

export interface Asset {
  chain_name: string;
  denom: string;
  symbol: string;
  logo_URIs: {
    svg?: string;
    png?: string;
  };
  decimals: number;
  base: string;
  display: string;
  denom_units: DenomUnit[];
}

export interface Balance {
  denom: string;
  amount: string;
}

export interface BalanceResponse {
  balances: Balance[];
  pagination: {
    next_key: string | null;
    total: string;
  };
}

export interface AddressAmount {
  address: string;
  amount: string;
}
