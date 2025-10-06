// app/api/purchase/contents/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../../lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contentId = params.id;
    const body = await request.json();
    const containerId = body.containerId;

    console.log('🗑️ Deleting content item:', contentId, 'from container:', containerId);

    // حذف content item بدون permission check
    await prisma.purchaseContent.delete({
      where: { id: contentId }
    });

    console.log('✅ Content item deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error deleting content item:', error);
    
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Content item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete content item' },
      { status: 500 }
    );
  }
}