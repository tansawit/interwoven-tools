import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oracle | Interwoven Tools',
  description: 'Oracle tools for the Interwoven ecosystem',
};

export default function OracleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
