'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  convertEthToBech32,
  convertBech32ToEth,
  isValidEthAddress,
  isValidBech32Address,
} from '@/lib/address-utils';

export default function AddressConverterPage() {
  const [ethAddress, setEthAddress] = useState('');
  const [bech32Address, setBech32Address] = useState('');
  const [activeTab, setActiveTab] = useState('eth-to-bech32');
  const [error, setError] = useState('');
  const prefix = 'init'; // Fixed prefix

  const handleEthToBech32Conversion = () => {
    setError('');
    if (!ethAddress) {
      setError('Please enter an Ethereum address');
      return;
    }

    try {
      // Add 0x prefix if missing
      const formattedEthAddress = ethAddress.startsWith('0x') ? ethAddress : `0x${ethAddress}`;

      if (!isValidEthAddress(formattedEthAddress)) {
        setError('Invalid Ethereum address format');
        return;
      }

      const result = convertEthToBech32(formattedEthAddress, prefix);
      setBech32Address(result);
    } catch (err) {
      setError(`Conversion error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleBech32ToEthConversion = () => {
    setError('');
    if (!bech32Address) {
      setError('Please enter a bech32 address');
      return;
    }

    try {
      if (!isValidBech32Address(bech32Address, prefix)) {
        setError(`Invalid bech32 address format or wrong prefix (expected: ${prefix})`);
        return;
      }

      const result = convertBech32ToEth(bech32Address);
      setEthAddress(result);
    } catch (err) {
      setError(`Conversion error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setError('');
    setBech32Address('');
    setEthAddress('');
  };

  return (
    <div className="container mx-auto py-12 sm:py-20 px-4 max-w-3xl">
      <div className="space-y-8 sm:space-y-12">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 sm:mb-6">
            Address Converter
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto px-4">
            Convert between Ethereum (0x) addresses and bech32 (init) addresses
          </p>
        </div>

        <Card className="border border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl">Conversion Tool</CardTitle>
            <CardDescription className="text-muted-foreground mt-2 text-sm sm:text-base">
              Select the conversion direction and enter the address
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 tabs-list">
                <TabsTrigger value="eth-to-bech32" className="tab text-xs sm:text-sm">
                  0x → bech32
                </TabsTrigger>
                <TabsTrigger value="bech32-to-eth" className="tab text-xs sm:text-sm">
                  bech32 → 0x
                </TabsTrigger>
              </TabsList>
              <TabsContent value="eth-to-bech32" className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Ethereum Address
                  </label>
                  <Input
                    value={ethAddress}
                    onChange={(e) => setEthAddress(e.target.value)}
                    placeholder="0x..."
                    className="font-mono bg-background border-border text-sm"
                  />
                </div>

                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    {prefix} Address
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={bech32Address}
                      readOnly
                      disabled={!bech32Address}
                      placeholder={`${prefix}1...`}
                      className="font-mono bg-background border-border text-sm"
                    />
                    {bech32Address && (
                      <Button
                        variant="outline"
                        className="button button-outline text-xs sm:text-sm whitespace-nowrap"
                        onClick={() => {
                          navigator.clipboard.writeText(bech32Address);
                        }}
                      >
                        Copy
                      </Button>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleEthToBech32Conversion}
                  className="w-full button button-primary mt-4 sm:mt-6 text-sm"
                  variant="outline"
                >
                  Convert to {prefix} Address
                </Button>
              </TabsContent>

              <TabsContent value="bech32-to-eth" className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    {prefix} Address
                  </label>
                  <Input
                    value={bech32Address}
                    onChange={(e) => setBech32Address(e.target.value)}
                    placeholder={`${prefix}1...`}
                    className="font-mono bg-background border-border text-sm"
                  />
                </div>

                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border">
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Ethereum Address
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={ethAddress}
                      readOnly
                      disabled={!ethAddress}
                      placeholder="0x..."
                      className="font-mono bg-background border-border text-sm"
                    />
                    {ethAddress && (
                      <Button
                        variant="outline"
                        className="button button-outline text-xs sm:text-sm whitespace-nowrap"
                        onClick={() => {
                          navigator.clipboard.writeText(ethAddress);
                        }}
                      >
                        Copy
                      </Button>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleBech32ToEthConversion}
                  className="w-full button button-primary mt-4 sm:mt-6 text-sm"
                  variant="outline"
                >
                  Convert to Ethereum Address
                </Button>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 border border-destructive/50 bg-destructive/10 text-destructive text-xs sm:text-sm rounded">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
