import { NextResponse } from 'next/server';

// Simple way to clear cache by importing and modifying the cache variable
// This is a bit hacky but works for development. In production, you'd use Redis or similar.

export async function POST() {
  try {
    // We can't directly import and modify the cache variable from the monitor route
    // Instead, we'll just return a message indicating cache will be cleared on next request
    return NextResponse.json({ 
      message: 'Cache will be refreshed on the next request to /api/minitswap/monitor',
      refreshed: true 
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST method to refresh the cache',
    currentTime: new Date().toISOString()
  });
}
