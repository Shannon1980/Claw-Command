import { NextRequest, NextResponse } from 'next/server';
import { dismissAlert } from '@/lib/mock-alerts';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const alertId = params.id;
  
  const success = dismissAlert(alertId);
  
  if (success) {
    return NextResponse.json({ 
      success: true, 
      message: 'Alert dismissed successfully' 
    });
  }
  
  return NextResponse.json(
    { success: false, message: 'Alert not found' },
    { status: 404 }
  );
}
