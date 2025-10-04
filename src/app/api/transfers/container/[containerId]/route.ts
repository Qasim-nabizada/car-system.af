// در src/app/api/transfers/container/[containerId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import prisma from '../../../../../lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { containerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const containerId = params.containerId;

    let transfers;
    
    if (session.user.role === 'manager') {
      // مدیر همه ترانسفرهای این کانتینر را می‌بیند
      transfers = await prisma.transfer.findMany({
        where: {
          containerId: containerId
        },
        include: {
          sender: { 
            select: { id: true, name: true, username: true } 
          },
          receiver: { 
            select: { id: true, name: true, username: true } 
          },
          vendor: { 
            select: { id: true, companyName: true, representativeName: true } 
          },
          container: { 
            select: { containerId: true } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // کاربر فقط ترانسفرهای خودش برای این کانتینر را می‌بیند
      transfers = await prisma.transfer.findMany({
        where: {
          containerId: containerId,
          senderId: session.user.id
        },
        include: {
          sender: { 
            select: { id: true, name: true, username: true } 
          },
          receiver: { 
            select: { id: true, name: true, username: true } 
          },
          vendor: { 
            select: { id: true, companyName: true, representativeName: true } 
          },
          container: { 
            select: { containerId: true } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    console.log(`📊 Transfers for container ${containerId}:`, transfers.length);
    
    return NextResponse.json(transfers);
    
  } catch (error) {
    console.error('Error fetching container transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch container transfers' },
      { status: 500 }
    );
  }
}