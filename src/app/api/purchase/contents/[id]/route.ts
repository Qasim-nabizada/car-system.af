import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import prisma from '../../../../../lib/database';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ اضافه کردن Promise
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params; // ✅ await اضافه کنید

    const content = await prisma.purchaseContent.findUnique({
      where: { id },
      include: { container: true }
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.container.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.purchaseContent.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Content item deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting content item:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}