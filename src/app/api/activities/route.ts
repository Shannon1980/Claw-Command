import { NextRequest, NextResponse } from 'next/server';
import { getRecentActivities } from '@/lib/mock-activities';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  
  const activities = getRecentActivities(limit);
  
  return NextResponse.json(activities);
}
