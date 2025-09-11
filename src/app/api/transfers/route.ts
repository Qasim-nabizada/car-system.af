import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transfers = await prisma.transfer.findMany({
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
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { senderId, receiverId, amount, containerId, type, date, description } = body;

    // Validate required fields
    if (!receiverId || !amount || !containerId || !type || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if container exists
    const container = await prisma.purchaseContainer.findUnique({
      where: { id: containerId }
    });

    if (!container) {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }

    const transfer = await prisma.transfer.create({
      data: {
        senderId,
        receiverId,
        amount: parseFloat(amount),
        containerId,
        type,
        date,
        description: description || null
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

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}