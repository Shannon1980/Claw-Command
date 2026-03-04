import { NextRequest, NextResponse } from 'next/server';
import { getActiveAlerts, mockAlerts } from '@/lib/mock-alerts';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get('active') === 'true';
  
  if (activeOnly) {
    const activeAlerts = getActiveAlerts();
    return NextResponse.json(activeAlerts);
  }
  
  return NextResponse.json(mockAlerts);
}
