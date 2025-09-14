import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // گرفتن userId از query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // کاربر فقط می‌تواند transfers خودش را ببیند
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // دریافت transfers کاربر
    const transfers = await prisma.transfer.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        container: {
          select: {
            containerId: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error('❌ Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transferData = await request.json();

    // ایجاد transfer جدید
    const newTransfer = await prisma.transfer.create({
      data: {
        ...transferData,
        date: new Date().toISOString()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        container: {
          select: {
            containerId: true
          }
        }
      }
    });

    return NextResponse.json(newTransfer, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}