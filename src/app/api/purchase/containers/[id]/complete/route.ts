// راه حل جایگزین
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../../../lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // استفاده از getToken به جای getServerSession
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const containerId = params.id;

    const updatedContainer = await prisma.purchaseContainer.update({
      where: { id: containerId },
      data: {
        status: 'completed',
        updatedAt: new Date(),
      },
      include: {
        vendor: true,
        contents: true,
        documents: true,
        user: true,
      },
    });

    return NextResponse.json(updatedContainer);
  } catch (error: any) {
    console.error('Error marking container complete:', error);
    
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to mark container complete' },
      { status: 500 }
    );
  }
}