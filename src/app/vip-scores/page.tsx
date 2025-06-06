'use client';

import { useState, useEffect } from 'react';
import { convertEthToBech32, convertBech32ToEth } from '@/lib/address-utils';
import { useChains } from '@/lib/hooks/useChains';
import { ChainSelector } from '@/components/ChainSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Activity,
  Award,
  Database,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BridgeData {
  bridge_id: number;
  reward: number;
}

interface VIPStatus {
  stage: number;
  start_time: string;
  end_time: string;
  total_reward: number;
  data: BridgeData[];
}

interface VIPScoreEntry {
  address: string;
  score: string;
  rank: number;
}

export default function VIPScores() {
  // Use shared chains hook
  const {
    chains,
    selectedChain,
    setSelectedChain,
    loading: chainsLoading,
    error: chainsError,
  } = useChains({
    filter: (chain) =>
      !!(chain.chain_name.toLowerCase() !== 'initia' && chain.metadata?.minitia?.type),
    autoSelect: false,
  });

  const [vipStatus, setVipStatus] = useState<VIPStatus | null>(null);
  const [vipScores, setVipScores] = useState<VIPScoreEntry[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [scoresLoading, setScoresLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchAddress, setSearchAddress] = useState<string>('');

  // Combine errors
  const combinedError = chainsError || error;

  const SCORES_PER_PAGE = 20;

  const fetchVIPStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching VIP status...');
      const response = await fetch('https://vip-api.initia.xyz/vesting/status');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: VIPStatus = await response.json();
      console.log('VIP status received:', result);

      setVipStatus(result);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      console.error('Failed to fetch VIP status:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch VIP status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchVIPScores = async (chainName: string) => {
    if (!vipStatus) return;

    setScoresLoading(true);
    try {
      const selectedChainData = chains.find((c) => c.chain_name === chainName);
      if (!selectedChainData?.metadata?.op_bridge_id) {
        throw new Error('Bridge ID not found for selected chain');
      }

      const bridgeId = selectedChainData.metadata.op_bridge_id;
      console.log('Fetching VIP scores for bridge:', bridgeId);
      console.log('Selected chain data:', selectedChainData);

      // Fetch bridge info from VIP module
      const vipModuleAddr = '0x3a886b32a802582f2e446e74d4a24d1d7ed01adf46d2a8f65c5723887e708789';
      const mainnetRestUrl = 'https://rest.initia.xyz';

      const bridgeInfoResponse = await fetch(
        `${mainnetRestUrl}/initia/move/v1/accounts/${vipModuleAddr}/modules/vip/view_functions/get_bridge_infos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type_args: [], args: [] }),
        }
      );

      if (!bridgeInfoResponse.ok) {
        throw new Error(`Failed to fetch bridge info: ${bridgeInfoResponse.status}`);
      }

      const bridgeInfoData = await bridgeInfoResponse.json();
      console.log('Bridge info response:', bridgeInfoData);
      const bridgeInfos = JSON.parse(bridgeInfoData.data);
      console.log('Parsed bridge infos:', bridgeInfos);

      // Find the specific bridge info for our selected chain
      const bridgeInfo = bridgeInfos.find(
        (info: { bridge_id: string }) => info.bridge_id === bridgeId
      );
      console.log('Found bridge info:', bridgeInfo);
      if (!bridgeInfo) {
        console.error(
          'Available bridge IDs:',
          bridgeInfos.map((info: { bridge_id: string }) => info.bridge_id)
        );
        throw new Error(`Bridge info not found for bridge ID: ${bridgeId}`);
      }

      const restEndpoint = selectedChainData.apis?.rest?.[0]?.address;
      if (!restEndpoint) {
        throw new Error('REST endpoint not found for selected chain');
      }

      const vmType = bridgeInfo.vm_type;
      const contractAddr = bridgeInfo.vip_l2_score_contract;
      const stage = vipStatus.stage;

      console.log(
        `Fetching scores for VM type: ${vmType}, contract: ${contractAddr}, stage: ${stage}`
      );

      let scoresData: Record<string, bigint> = {};

      console.log(
        `Calling ${vmType === '0' ? 'Move' : vmType === '1' ? 'WASM' : 'EVM'} scores function`
      );

      if (vmType === '0') {
        // Move VM
        scoresData = await getMoveScores(restEndpoint, contractAddr, stage);
      } else if (vmType === '1') {
        // WASM VM
        scoresData = await getWasmScores(restEndpoint, contractAddr, stage);
      } else {
        // EVM VM
        scoresData = await getEvmScores(chainName, contractAddr, stage);
      }

      console.log('Raw scores data:', scoresData);
      console.log('Number of scores found:', Object.keys(scoresData).length);

      // Convert to VIPScoreEntry format and sort by score
      const scoreEntries: VIPScoreEntry[] = Object.entries(scoresData)
        .map(([address, score]) => ({
          address,
          score: score.toString(),
          rank: 0, // Will be set after sorting
        }))
        .sort((a, b) => Number(BigInt(b.score) - BigInt(a.score)))
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      console.log('Processed score entries:', scoreEntries);
      setVipScores(scoreEntries);
      setCurrentPage(1);
    } catch (e: unknown) {
      console.error('Failed to fetch VIP scores:', e);
      setVipScores([]);
    } finally {
      setScoresLoading(false);
    }
  };

  // VM-specific score fetching functions
  const getMoveScores = async (
    restEndpoint: string,
    address: string,
    stage: number
  ): Promise<Record<string, bigint>> => {
    const res: Record<string, bigint> = {};
    let nextKey = '';
    const limit = 1000;

    while (true) {
      // Correct encoding for Move VM parameters to match expected format
      const encodeU64 = (value: number): string => {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setBigUint64(0, BigInt(value), true); // little-endian
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
      };

      const encodeU16 = (value: number): string => {
        const buffer = new ArrayBuffer(2);
        const view = new DataView(buffer);
        view.setUint16(0, value, true); // little-endian
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
      };

      const encodeOptionalString = (str: string): string => {
        if (str === '') {
          // Empty/None: single zero byte
          return btoa(String.fromCharCode(0));
        } else {
          // Non-empty string: encode the string content directly
          const encoder = new TextEncoder();
          const strBytes = encoder.encode(str);
          return btoa(String.fromCharCode(...strBytes));
        }
      };

      const args = [
        encodeU64(stage), // u64 stage
        encodeU16(limit), // u16 limit
        encodeOptionalString(nextKey), // optional string start_after
      ];

      const response = await fetch(
        `${restEndpoint}/initia/move/v1/accounts/${address}/modules/vip_score/view_functions/get_scores`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type_args: [], args }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Move scores: ${response.status}`);
      }

      const result = await response.json();
      const data = JSON.parse(result.data);

      for (const score of data.scores) {
        res[score.addr] = BigInt(score.score);
      }

      if (data.scores.length !== limit) break;
      nextKey = data.scores[limit - 1].addr;
    }

    return res;
  };

  const getWasmScores = async (
    restEndpoint: string,
    address: string,
    stage: number
  ): Promise<Record<string, bigint>> => {
    console.log(
      `WASM getScores called with: restEndpoint=${restEndpoint}, address=${address}, stage=${stage}`
    );
    const res: Record<string, bigint> = {};
    let nextKey = '';
    const limit = 200;

    while (true) {
      const queryData = JSON.stringify({
        get_scores: {
          stage: Number(stage),
          limit,
          start_after: nextKey !== '' ? nextKey : undefined,
        },
      });

      const encodedQuery = btoa(queryData);
      const url = `${restEndpoint}/cosmwasm/wasm/v1/contract/${address}/smart/${encodedQuery}`;
      console.log(`WASM query URL: ${url}`);
      console.log(`WASM query data: ${queryData}`);

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`WASM fetch failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('WASM error response:', errorText);
        throw new Error(`Failed to fetch WASM scores: ${response.status}`);
      }

      const result = await response.json();
      console.log('WASM API response:', result);
      const data = result.data;

      if (!data || !data.scores) {
        console.log('No scores data in WASM response');
        break;
      }

      console.log(`WASM batch: ${data.scores.length} scores`);
      for (const score of data.scores) {
        res[score.addr] = BigInt(score.score);
      }

      if (data.scores.length !== limit) break;
      nextKey = data.scores[limit - 1].addr;
    }

    console.log(`WASM getScores returning ${Object.keys(res).length} scores`);
    return res;
  };

  const getEvmScores = async (
    chainName: string,
    contractAddr: string,
    stage: number
  ): Promise<Record<string, bigint>> => {
    const res: Record<string, bigint> = {};
    const limit = 500;
    let offset = 0;

    // Get the selected chain data to find the JSON RPC endpoint
    const selectedChainData = chains.find((c) => c.chain_name === chainName);
    if (!selectedChainData) {
      throw new Error(`Chain data not found for: ${chainName}`);
    }

    // Get the JSON RPC endpoint from the chain's API configuration
    const jsonRpcEndpoint = selectedChainData.apis?.['json-rpc']?.[0]?.address;

    if (!jsonRpcEndpoint) {
      throw new Error(
        `No JSON RPC endpoint found for chain: ${chainName}. Expected in apis["json-rpc"] field.`
      );
    }

    console.log(`EVM JSON RPC endpoint from registry: ${jsonRpcEndpoint}`);

    // Function selector from the working example
    // 0x990357e5 corresponds to getScores(uint256,uint256,uint256)
    const functionSelector = '0x990357e5';

    console.log(`EVM contract address: ${contractAddr}`);
    console.log(`EVM function selector: ${functionSelector}`);
    console.log(`EVM parameters: stage=${stage}, offset=${offset}, limit=${limit}`);

    const encodeCall = (stage: number, offset: number, limit: number) => {
      // Encode parameters as 256-bit values (32 bytes each) to match the working example
      const paddedStage = stage.toString(16).padStart(64, '0');
      const paddedOffset = offset.toString(16).padStart(64, '0');
      const paddedLimit = limit.toString(16).padStart(64, '0');
      return `${functionSelector}${paddedStage}${paddedOffset}${paddedLimit}`;
    };

    while (true) {
      const callData = encodeCall(stage, offset, limit);

      console.log(`EVM call data: ${callData}`);

      const jsonRpcPayload = {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: contractAddr,
            data: callData,
          },
          'latest',
        ],
        id: 1,
      };

      console.log(`EVM JSON RPC payload:`, jsonRpcPayload);

      const response = await fetch(jsonRpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonRpcPayload),
      });

      if (!response.ok) {
        console.error(`EVM JSON RPC request failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('EVM error response:', errorText);
        throw new Error(`Failed to fetch EVM scores: ${response.status}`);
      }

      const result = await response.json();
      console.log('EVM JSON RPC response:', result);

      if (result.error) {
        console.error('EVM JSON RPC error:', result.error);
        console.error('Call data that failed:', callData);
        console.error('Contract address:', contractAddr);
        console.error('JSON RPC endpoint:', jsonRpcEndpoint);

        // Check if it's a revert error and provide helpful info
        if (
          result.error.message?.includes('revert') ||
          result.error.message?.includes('EVMCall failed')
        ) {
          throw new Error(`EVM contract call reverted. This usually means:
1. Wrong contract address: ${contractAddr}
2. Function doesn't exist or has different parameters
3. Contract has access restrictions
4. Invalid parameters: stage=${stage}, offset=${offset}, limit=${limit}

Original error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        throw new Error(
          `EVM JSON RPC error: ${result.error.message || JSON.stringify(result.error)}`
        );
      }

      const responseData = result.result;

      // Decode the response data
      // The response should be in the format of encoded array of structs
      // For now, we'll implement a basic decoder
      if (!responseData || responseData === '0x' || responseData.length <= 2) {
        console.log('No more EVM scores data');
        break;
      }

      try {
        // Basic ABI decoding for array of structs with (address, uint256) pairs
        // This is a simplified decoder - in production you'd use a proper ABI decoder
        console.log('EVM: Starting decode of response data...');
        const decoded = decodeEvmScoresResponse(responseData);
        console.log(`EVM decoded: ${decoded.length} scores`);

        if (decoded.length === 0) {
          console.log('EVM: No scores decoded from response, stopping pagination');
          break;
        }

        for (const score of decoded) {
          res[score.addr] = BigInt(score.score);
        }

        console.log(
          `EVM: Added ${decoded.length} scores to results. Total so far: ${Object.keys(res).length}`
        );

        if (decoded.length < limit) {
          console.log('EVM: Received fewer scores than limit, stopping pagination');
          break;
        }

        offset += limit;
      } catch (decodeError) {
        console.error('Failed to decode EVM response:', decodeError);
        break;
      }
    }

    console.log(`EVM getScores returning ${Object.keys(res).length} scores`);
    return res;
  };

  // Helper function to decode EVM response data
  const decodeEvmScoresResponse = (data: string): Array<{ addr: string; score: string }> => {
    // Remove 0x prefix
    const hex = data.slice(2);

    // Basic ABI decoding for dynamic array of structs
    // This is simplified - in production use ethers.js or similar library
    try {
      // First 32 bytes: offset to array data
      const arrayOffset = parseInt(hex.slice(0, 64), 16) * 2;

      // At array offset: array length
      const arrayLengthHex = hex.slice(arrayOffset, arrayOffset + 64);
      const arrayLength = parseInt(arrayLengthHex, 16);

      console.log(`EVM decode: Array offset=${arrayOffset / 2}, Array length=${arrayLength}`);
      console.log(`EVM decode: Array length hex=${arrayLengthHex}`);

      // If array length is 0, return empty array
      if (arrayLength === 0) {
        console.log('EVM decode: Array length is 0, no scores to decode');
        return [];
      }

      const scores: Array<{ addr: string; score: string }> = [];

      // The response format is ScoreResponse[] where each struct has:
      // - address addr (32 bytes padded)
      // - uint64 amount (32 bytes padded) - this is the score
      // - uint64 index (32 bytes padded) - this is the index/rank
      const dataStart = arrayOffset + 64; // Start after array length

      for (let i = 0; i < arrayLength; i++) {
        // Each ScoreResponse struct is 96 bytes (192 hex chars): address + amount + index
        const entryOffset = dataStart + i * 192;

        // Check if we have enough data for this element
        if (entryOffset + 192 > hex.length) {
          console.log(
            `EVM decode: Not enough data for ScoreResponse ${i}, stopping at offset ${entryOffset}`
          );
          break;
        }

        // Address is the first 32 bytes, but address is only 20 bytes, so take the last 20 bytes (40 hex chars)
        const addrHex = hex.slice(entryOffset + 24, entryOffset + 64);
        const addr = '0x' + addrHex;

        // Amount (score) is the next 32 bytes
        const amountHex = hex.slice(entryOffset + 64, entryOffset + 128);
        const amount = BigInt('0x' + amountHex).toString();

        // Index is the next 32 bytes (we don't need it for now)
        const indexHex = hex.slice(entryOffset + 128, entryOffset + 192);

        const score = amount; // amount is the actual score

        console.log(`EVM decode element ${i}: addr=${addr}, score=${score}`);

        // Analysis of address validity - let's be less strict and log everything for debugging
        const zeroCount = (addr.match(/0/g) || []).length;
        const nonZeroCount = addr.length - 2 - zeroCount; // subtract 2 for "0x"
        const hasScore = score !== '0';

        // Log detailed analysis for first 15 entries to understand the pattern
        if (i < 15) {
          console.log(
            `EVM decode detail ${i}: 
            Raw addrHex: ${addrHex}
            Raw amountHex: ${amountHex}
            Raw indexHex: ${indexHex}
            Parsed addr: ${addr}
            Parsed score: ${score}
            Zero count in addr: ${zeroCount}
            Non-zero count in addr: ${nonZeroCount}
            Has score: ${hasScore}`
          );
        }

        // Include entries with meaningful addresses (at least some non-zero content) and scores
        if (nonZeroCount >= 4 && hasScore) {
          // Very lenient - just need 4+ non-zero chars and a score
          scores.push({ addr, score });
          console.log(`EVM decode: Added entry ${i}: ${addr} = ${score}`);
        } else {
          console.log(`EVM decode: Skipping entry ${i}: nonZeros=${nonZeroCount}, score=${score}`);
        }
      }

      console.log(
        `EVM decode: Successfully decoded ${scores.length} valid scores out of ${arrayLength} total entries`
      );

      // Log a few sample decoded scores
      if (scores.length > 0) {
        console.log('EVM decode: Sample scores:', scores.slice(0, 3));
      }

      return scores;
    } catch (error) {
      console.error('Error decoding EVM response:', error);
      console.error('Raw hex data length:', hex.length);
      console.error('First 200 chars of hex:', hex.slice(0, 200));
      return [];
    }
  };

  // Address conversion utilities
  const bech32ToHex = (bech32Address: string): string | null => {
    try {
      if (!bech32Address.startsWith('init')) return null;
      return convertBech32ToEth(bech32Address);
    } catch {
      return null;
    }
  };

  const hexToBech32 = (hexAddress: string): string | null => {
    try {
      if (!hexAddress.startsWith('0x')) return null;
      return convertEthToBech32(hexAddress, 'init');
    } catch {
      return null;
    }
  };

  // Enhanced filtering that handles both address formats
  const filteredScores = vipScores.filter((score) => {
    const searchTerm = searchAddress.toLowerCase();
    const originalAddress = score.address.toLowerCase();

    // Direct match
    if (originalAddress.includes(searchTerm)) {
      return true;
    }

    // If search term looks like bech32 (starts with init), try converting stored address to bech32
    if (searchTerm.startsWith('init')) {
      const convertedAddress = hexToBech32(score.address);
      if (convertedAddress && convertedAddress.toLowerCase().includes(searchTerm)) {
        return true;
      }
    }

    // If search term looks like hex (starts with 0x), try converting stored address to hex
    if (searchTerm.startsWith('0x')) {
      const convertedAddress = bech32ToHex(score.address);
      if (convertedAddress && convertedAddress.toLowerCase().includes(searchTerm)) {
        return true;
      }
    }

    // Try converting search term and comparing with original address
    if (searchTerm.startsWith('init')) {
      const convertedSearchTerm = bech32ToHex(searchAddress);
      if (convertedSearchTerm && originalAddress.includes(convertedSearchTerm.toLowerCase())) {
        return true;
      }
    }

    if (searchTerm.startsWith('0x')) {
      const convertedSearchTerm = hexToBech32(searchAddress);
      if (convertedSearchTerm && originalAddress.includes(convertedSearchTerm.toLowerCase())) {
        return true;
      }
    }

    return false;
  });

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchAddress]);

  useEffect(() => {
    fetchVIPStatus();
  }, []);

  useEffect(() => {
    if (selectedChain && vipStatus) {
      fetchVIPScores(selectedChain);
    }
  }, [selectedChain, vipStatus]);

  const formatLargeNumber = (value: number) => {
    if (value >= 1e9) {
      return (value / 1e9).toFixed(1) + 'B';
    }
    if (value >= 1e6) {
      return (value / 1e6).toFixed(1) + 'M';
    }
    if (value >= 1e3) {
      return (value / 1e3).toFixed(1) + 'K';
    }
    return value.toFixed(0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateProgress = () => {
    if (!vipStatus) return 0;

    const start = new Date(vipStatus.start_time).getTime();
    const end = new Date(vipStatus.end_time).getTime();
    const now = Date.now();

    if (now < start) return 0;
    if (now > end) return 100;

    return ((now - start) / (end - start)) * 100;
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4 max-w-7xl">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight mb-2 sm:mb-4">
            VIP Scores
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm lg:text-base max-w-2xl mx-auto px-2">
            Track and monitor VIP scores across the Interwoven ecosystem
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>
              {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Never updated'}
            </span>
          </div>
          <Button
            onClick={fetchVIPStatus}
            disabled={loading}
            size="sm"
            variant="outline"
            className="w-fit text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {combinedError && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="text-xs sm:text-sm">⚠️ Error: {combinedError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {loading ? (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-center py-6 sm:py-8">
                <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mr-2" />
                <span className="text-xs sm:text-sm">Loading VIP status...</span>
              </div>
            </CardContent>
          </Card>
        ) : vipStatus ? (
          <div className="grid gap-6">
            {/* Current Vesting Stage & Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                  Current Vesting Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  {/* Stage Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Stage</p>
                      <p className="text-xl sm:text-2xl font-bold">{vipStatus.stage}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Reward</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {formatLargeNumber(vipStatus.total_reward / 1e6)}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Start Time</p>
                        <p className="font-medium text-xs sm:text-sm break-all">
                          {formatDate(vipStatus.start_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">End Time</p>
                        <p className="font-medium text-xs sm:text-sm break-all">
                          {formatDate(vipStatus.end_time)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-2">
                        <span>Progress</span>
                        <span>{calculateProgress().toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calculateProgress()}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VIP Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="truncate">
                    {selectedChain
                      ? `VIP Scores - ${
                          chains.find((c) => c.chain_name === selectedChain)?.pretty_name ||
                          selectedChain
                        }`
                      : 'VIP Scores'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                      Select a chain to view current VIP scores for this stage
                    </p>
                    <ChainSelector
                      chains={chains}
                      selectedChain={selectedChain}
                      onChainChange={setSelectedChain}
                      loading={chainsLoading}
                      placeholder="Select a chain"
                    />
                  </div>

                  {selectedChain && (
                    <>
                      {scoresLoading ? (
                        <div className="flex items-center justify-center py-6 sm:py-8">
                          <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin mr-2" />
                          <span className="text-xs sm:text-sm">Loading VIP scores...</span>
                        </div>
                      ) : vipScores.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              placeholder="Search by address..."
                              value={searchAddress}
                              onChange={(e) => setSearchAddress(e.target.value)}
                              className="pl-8 sm:pl-10 text-xs sm:text-sm"
                            />
                          </div>

                          {filteredScores.length > 0 ? (
                            <>
                              {/* Mobile Cards View */}
                              <div className="block sm:hidden space-y-2">
                                {filteredScores
                                  .slice(
                                    (currentPage - 1) * SCORES_PER_PAGE,
                                    currentPage * SCORES_PER_PAGE
                                  )
                                  .map((entry) => (
                                    <Card key={entry.address} className="p-3">
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-medium text-muted-foreground">
                                            Rank #{entry.rank}
                                          </span>
                                          <span className="text-sm font-bold">
                                            {parseInt(entry.score).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="text-xs font-mono break-all leading-relaxed">
                                          {entry.address}
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                              </div>

                              {/* Desktop Table View */}
                              <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2 px-3 sm:px-4 font-medium w-16 sm:w-20 text-xs sm:text-sm">
                                        Rank
                                      </th>
                                      <th className="text-left py-2 px-3 sm:px-4 font-medium text-xs sm:text-sm">
                                        Address
                                      </th>
                                      <th className="text-right py-2 px-3 sm:px-4 font-medium w-24 sm:w-32 text-xs sm:text-sm">
                                        Score
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredScores
                                      .slice(
                                        (currentPage - 1) * SCORES_PER_PAGE,
                                        currentPage * SCORES_PER_PAGE
                                      )
                                      .map((entry) => (
                                        <tr
                                          key={entry.address}
                                          className="border-b hover:bg-gray-800"
                                        >
                                          <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm w-16 sm:w-20">
                                            {entry.rank}
                                          </td>
                                          <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-mono break-all">
                                            {entry.address}
                                          </td>
                                          <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm text-right font-bold w-24 sm:w-32">
                                            {parseInt(entry.score).toLocaleString()}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Pagination */}
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 sm:pt-4">
                                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                  Showing {(currentPage - 1) * SCORES_PER_PAGE + 1} to{' '}
                                  {Math.min(currentPage * SCORES_PER_PAGE, filteredScores.length)}{' '}
                                  of {filteredScores.length} entries
                                  {searchAddress && (
                                    <span className="block sm:inline">
                                      {' '}
                                      (filtered from {vipScores.length} total)
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="text-xs"
                                  >
                                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                    <span className="sm:hidden">Prev</span>
                                  </Button>

                                  <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                                    {currentPage} of{' '}
                                    {Math.ceil(filteredScores.length / SCORES_PER_PAGE)}
                                  </span>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setCurrentPage((prev) =>
                                        Math.min(
                                          Math.ceil(filteredScores.length / SCORES_PER_PAGE),
                                          prev + 1
                                        )
                                      )
                                    }
                                    disabled={
                                      currentPage ===
                                      Math.ceil(filteredScores.length / SCORES_PER_PAGE)
                                    }
                                    className="text-xs"
                                  >
                                    <span className="hidden sm:inline">Next</span>
                                    <span className="sm:hidden">Next</span>
                                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-6 sm:py-8 text-muted-foreground">
                              <p className="text-xs sm:text-sm">
                                No addresses found matching &quot;{searchAddress}&quot;.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8 text-muted-foreground">
                          <p className="text-xs sm:text-sm">No VIP scores found for this chain.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
