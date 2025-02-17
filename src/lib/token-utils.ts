// Types
export interface TokenMetadata {
  symbol: string;
  icon: string;
  name: string;
}

// Constants
export const TOKEN_METADATA: Readonly<Record<string, TokenMetadata>> = {
  AAVE: {
    symbol: 'AAVE',
    icon: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
    name: 'Aave',
  },
  ADA: {
    symbol: 'ADA',
    icon: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    name: 'Cardano',
  },
  AEVO: {
    symbol: 'AEVO',
    icon: 'https://assets.coingecko.com/coins/images/35893/small/aevo.png',
    name: 'AEVO',
  },
  AGIX: {
    symbol: 'AGIX',
    icon: 'https://assets.coingecko.com/coins/images/2138/small/singularitynet.png',
    name: 'SingularityNET',
  },
  ALGO: {
    symbol: 'ALGO',
    icon: 'https://assets.coingecko.com/coins/images/4380/small/download.png',
    name: 'Algorand',
  },
  APE: {
    symbol: 'APE',
    icon: 'https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg',
    name: 'ApeCoin',
  },
  APT: {
    symbol: 'APT',
    icon: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
    name: 'Aptos',
  },
  ARB: {
    symbol: 'ARB',
    icon: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    name: 'Arbitrum',
  },
  ARKM: {
    symbol: 'ARKM',
    icon: 'https://assets.coingecko.com/coins/images/30929/small/Arkham_Logo_CG.png',
    name: 'Arkham',
  },
  ASTR: {
    symbol: 'ASTR',
    icon: 'https://assets.coingecko.com/coins/images/22617/small/astr.png',
    name: 'Astar',
  },
  ATOM: {
    symbol: 'ATOM',
    icon: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
    name: 'Cosmos Hub',
  },
  AVAX: {
    symbol: 'AVAX',
    icon: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    name: 'Avalanche',
  },
  AXL: {
    symbol: 'AXL',
    icon: 'https://assets.coingecko.com/coins/images/27277/small/V-65_xQ1_400x400.jpeg',
    name: 'Axelar',
  },
  BCH: {
    symbol: 'BCH',
    icon: 'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png',
    name: 'Bitcoin Cash',
  },
  BLUR: {
    symbol: 'BLUR',
    icon: 'https://assets.coingecko.com/coins/images/28453/small/blur.png',
    name: 'Blur',
  },
  BNB: {
    symbol: 'BNB',
    icon: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    name: 'BNB',
  },
  BONK: {
    symbol: 'BONK',
    icon: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
    name: 'Bonk',
  },
  BTC: {
    symbol: 'BTC',
    icon: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    name: 'Bitcoin',
  },
  COMP: {
    symbol: 'COMP',
    icon: 'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
    name: 'Compound',
  },
  CRV: {
    symbol: 'CRV',
    icon: 'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
    name: 'Curve DAO',
  },
  DOGE: {
    symbol: 'DOGE',
    icon: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    name: 'Dogecoin',
  },
  DOT: {
    symbol: 'DOT',
    icon: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
    name: 'Polkadot',
  },
  DYDX: {
    symbol: 'DYDX',
    icon: 'https://assets.coingecko.com/coins/images/17500/small/hjnIm9bV.jpg',
    name: 'dYdX',
  },
  DYM: {
    symbol: 'DYM',
    icon: 'https://assets.coingecko.com/coins/images/34182/small/dym.png',
    name: 'Dymension',
  },
  EOS: {
    symbol: 'EOS',
    icon: 'https://assets.coingecko.com/coins/images/738/small/eos-eos-logo.png',
    name: 'EOS',
  },
  ETC: {
    symbol: 'ETC',
    icon: 'https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png',
    name: 'Ethereum Classic',
  },
  ETH: {
    symbol: 'ETH',
    icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    name: 'Ethereum',
  },
  FET: {
    symbol: 'FET',
    icon: 'https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg',
    name: 'Fetch.ai',
  },
  FIL: {
    symbol: 'FIL',
    icon: 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
    name: 'Filecoin',
  },
  GRT: {
    symbol: 'GRT',
    icon: 'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png',
    name: 'The Graph',
  },
  HBAR: {
    symbol: 'HBAR',
    icon: 'https://assets.coingecko.com/coins/images/3688/small/hbar.png',
    name: 'Hedera',
  },
  ICP: {
    symbol: 'ICP',
    icon: 'https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png',
    name: 'Internet Computer',
  },
  IMX: {
    symbol: 'IMX',
    icon: 'https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png',
    name: 'Immutable',
  },
  INJ: {
    symbol: 'INJ',
    icon: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
    name: 'Injective',
  },
  JTO: {
    symbol: 'JTO',
    icon: 'https://assets.coingecko.com/coins/images/33228/standard/jto.png',
    name: 'Jito',
  },
  JUP: {
    symbol: 'JUP',
    icon: 'https://assets.coingecko.com/coins/images/34188/small/jup.png',
    name: 'Jupiter',
  },
  LDO: {
    symbol: 'LDO',
    icon: 'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
    name: 'Lido DAO',
  },
  LINK: {
    symbol: 'LINK',
    icon: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    name: 'Chainlink',
  },
  LTC: {
    symbol: 'LTC',
    icon: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
    name: 'Litecoin',
  },
  MANA: {
    symbol: 'MANA',
    icon: 'https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png',
    name: 'Decentraland',
  },
  MATIC: {
    symbol: 'MATIC',
    icon: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    name: 'Polygon',
  },
  MKR: {
    symbol: 'MKR',
    icon: 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
    name: 'Maker',
  },
  NEAR: {
    symbol: 'NEAR',
    icon: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
    name: 'NEAR Protocol',
  },
  NTRN: {
    symbol: 'NTRN',
    icon: 'https://assets.coingecko.com/coins/images/30813/small/ntrn.png?',
    name: 'Neutron',
  },
  OP: {
    symbol: 'OP',
    icon: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
    name: 'Optimism',
  },
  ORDI: {
    symbol: 'ORDI',
    icon: 'https://assets.coingecko.com/coins/images/30162/small/ordi.png',
    name: 'ORDI',
  },
  PEPE: {
    symbol: 'PEPE',
    icon: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
    name: 'Pepe',
  },
  PYTH: {
    symbol: 'PYTH',
    icon: 'https://assets.coingecko.com/coins/images/31924/small/pyth.png',
    name: 'Pyth Network',
  },
  RNDR: {
    symbol: 'RNDR',
    icon: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
    name: 'Render',
  },
  RUNE: {
    symbol: 'RUNE',
    icon: 'https://assets.coingecko.com/coins/images/6595/small/Rune200x200.png',
    name: 'THORChain',
  },
  SEI: {
    symbol: 'SEI',
    icon: 'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
    name: 'Sei',
  },
  SHIB: {
    symbol: 'SHIB',
    icon: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
    name: 'Shiba Inu',
  },
  SNX: {
    symbol: 'SNX',
    icon: 'https://assets.coingecko.com/coins/images/3406/small/SNX.png',
    name: 'Synthetix',
  },
  SOL: {
    symbol: 'SOL',
    icon: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    name: 'Solana',
  },
  STRK: {
    symbol: 'STRK',
    icon: 'https://assets.coingecko.com/coins/images/26433/small/starknet.png',
    name: 'Strike',
  },
  STX: {
    symbol: 'STX',
    icon: 'https://assets.coingecko.com/coins/images/2069/small/Stacks_Logo_png.png',
    name: 'Stacks',
  },
  SUI: {
    symbol: 'SUI',
    icon: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
    name: 'Sui',
  },
  TIA: {
    symbol: 'TIA',
    icon: 'https://assets.coingecko.com/coins/images/31967/small/tia.jpg',
    name: 'Celestia',
  },
  TRX: {
    symbol: 'TRX',
    icon: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
    name: 'TRON',
  },
  UNI: {
    symbol: 'UNI',
    icon: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
    name: 'Uniswap',
  },
  USDT: {
    symbol: 'USDT',
    icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    name: 'Tether',
  },
  WLD: {
    symbol: 'WLD',
    icon: 'https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg',
    name: 'Worldcoin',
  },
  WOO: {
    symbol: 'WOO',
    icon: 'https://assets.coingecko.com/coins/images/12921/small/WOO_Logos_2023_Profile_Pic_WOO.png',
    name: 'WOO Network',
  },
  XLM: {
    symbol: 'XLM',
    icon: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
    name: 'Stellar',
  },
  XRP: {
    symbol: 'XRP',
    icon: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    name: 'XRP',
  },
} as const;

// Create a Map for O(1) lookups
const TOKEN_MAP = new Map(Object.entries(TOKEN_METADATA));
const TOKEN_ARRAY = Object.values(TOKEN_METADATA);

// Memoized search index for faster searching
const SEARCH_INDEX = new Map<string, TokenMetadata[]>();

// Utility functions with improved performance
export const getTokenMetadata = (symbol: string): TokenMetadata | undefined => {
  const upperSymbol = symbol.toUpperCase();
  return TOKEN_MAP.get(upperSymbol);
};

// Memoized token icon getter
const iconCache = new Map<string, string>();
export const getTokenIcon = (symbol: string): string => {
  const cacheKey = symbol.toUpperCase();
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const metadata = getTokenMetadata(cacheKey);
  const icon =
    metadata?.icon ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(symbol)}&background=random`;
  iconCache.set(cacheKey, icon);
  return icon;
};

// Memoized token name getter
const nameCache = new Map<string, string>();
export const getTokenName = (symbol: string): string => {
  const cacheKey = symbol.toUpperCase();
  if (nameCache.has(cacheKey)) {
    return nameCache.get(cacheKey)!;
  }

  const metadata = getTokenMetadata(cacheKey);
  const name = metadata?.name ?? symbol;
  nameCache.set(cacheKey, name);
  return name;
};

export const isTokenSupported = (symbol: string): boolean => {
  return TOKEN_MAP.has(symbol.toUpperCase());
};

// Return cached array instead of creating new one each time
export const getAllSupportedTokens = (): readonly TokenMetadata[] => {
  return TOKEN_ARRAY;
};

// Memoized search function with normalized queries
export const searchTokens = (query: string): TokenMetadata[] => {
  const normalizedQuery = query.toLowerCase().trim();

  // Return all tokens for empty query
  if (!normalizedQuery) {
    return TOKEN_ARRAY;
  }

  // Check cache first
  if (SEARCH_INDEX.has(normalizedQuery)) {
    return SEARCH_INDEX.get(normalizedQuery)!;
  }

  const results = TOKEN_ARRAY.filter(
    (token) =>
      token.symbol.toLowerCase().includes(normalizedQuery) ||
      token.name.toLowerCase().includes(normalizedQuery)
  );

  // Cache results for future searches
  SEARCH_INDEX.set(normalizedQuery, results);
  return results;
};
