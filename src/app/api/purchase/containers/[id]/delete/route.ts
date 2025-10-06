// app/api/purchase/containers/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../../lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const containerId = params.id;

    console.log('🗑️ Deleting container:', containerId);

    // حذف container و محتویات مرتبط بدون permission check
    await prisma.purchaseContainer.delete({
      where: { id: containerId }
    });

    console.log('✅ Container deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error deleting container:', error);
    
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete container' },
      { status: 500 }
    );
  }
}