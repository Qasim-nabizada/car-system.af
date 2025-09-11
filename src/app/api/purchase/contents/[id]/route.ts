import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // گرفتن ID از URL
    const contentId = request.nextUrl.pathname.split('/').pop();

    if (!contentId) {
      return NextResponse.json({ error: 'Missing content ID' }, { status: 400 });
    }

    const content = await prisma.purchaseContent.findUnique({
      where: { id: contentId },
      include: { container: true }
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.container.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.purchaseContent.delete({
      where: { id: contentId }
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
