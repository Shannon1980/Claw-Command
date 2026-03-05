import { NextRequest, NextResponse } from 'next/server';
import { dismissAlert } from '@/lib/mock-alerts';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: alertId } = await context.params;
  
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
