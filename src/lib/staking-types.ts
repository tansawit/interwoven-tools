// Shapes returned by /api/staking and /api/staking/history. Amounts are in display units.

export interface AssetApr {
  staking: number;
  swapFee: number;
  total: number;
}

export interface StakingAsset {
  denom: string;
  name: string;
  /** USD price of one token */
  price: number;
  /** Bonded to active validators */
  staked: number;
  /** In the 21-day unbonding queue */
  unbonding: number;
  /** Delegated to validators outside the active set (not earning rewards) */
  inactive: number;
  /** Voting power per token, relative to INIT */
  votingPowerWeight: number;
  /** INIT represented by one token (1 for INIT, the INIT share of the pool for LP tokens) */
  initPerToken: number;
  apr: AssetApr | null;
}

export interface ValidatorSummary {
  operatorAddress: string;
  moniker: string;
  votingPower: number;
  commission: number;
}

export interface UnbondingAccount {
  /** Delegator address */
  address: string;
  amounts: Record<string, number>;
  /** Operator addresses the delegator is unbonding from that day */
  validators: string[];
}

export interface UnbondingDay {
  /** UTC date, YYYY-MM-DD */
  date: string;
  amounts: Record<string, number>;
  /** Every delegator whose unbonding completes that day */
  accounts: UnbondingAccount[];
}

export interface StakingResponse {
  assets: StakingAsset[];
  initSupply: number;
  unbondingDays: number;
  maxValidators: number;
  /** Active validators, by voting power (descending) */
  validators: ValidatorSummary[];
  /** Moniker for every validator operator address, active or not */
  validatorNames: Record<string, string>;
  unbondingSchedule: UnbondingDay[];
}

export type HistoryRange = '30d' | '90d' | '180d';

export interface HistoryPoint {
  /** Block time; estimated from the average block time for pruned blocks */
  time: string;
  height: number;
  staked: Record<string, number>;
  notBonded: Record<string, number>;
}
