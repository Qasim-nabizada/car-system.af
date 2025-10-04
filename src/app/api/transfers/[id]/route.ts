import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transferId = params.id;

    if (!transferId) {
      return NextResponse.json(
        { error: 'Transfer ID is required' },
        { status: 400 }
      );
    }

    // پیدا کردن ترانسفر
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        documents: true
      }
    });

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    // بررسی دسترسی کاربر
    if (session.user.role !== 'manager' && transfer.senderId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // حذف ترانسفر (به دلیل رابطه Cascade، داکیومنت‌های مرتبط هم حذف می‌شوند)
    await prisma.transfer.delete({
      where: { id: transferId }
    });

    console.log('✅ Transfer deleted successfully:', transferId);
    
    return NextResponse.json(
      { message: 'Transfer deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error deleting transfer:', error);
    
    return NextResponse.json(
      { error: `Failed to delete transfer: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// GET برای دریافت یک ترانسفر خاص (اختیاری)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transferId = params.id;

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        sender: { select: { id: true, name: true, username: true } },
        vendor: { select: { id: true, companyName: true, representativeName: true } },
        container: { select: { containerId: true } },
        documents: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            path: true,
            type: true,
            createdAt: true
          }
        }
      }
    });

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    // بررسی دسترسی کاربر
    if (session.user.role !== 'manager' && transfer.senderId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(transfer);
    
  } catch (error) {
    console.error('Error fetching transfer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfer' },
      { status: 500 }
    );
  }
}