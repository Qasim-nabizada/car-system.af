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

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');

    console.log('👤 Session user role:', session.user.role);
    console.log('🔍 All parameter:', all);
    console.log('🔍 User ID:', session.user.id);

    let whereCondition = {};
    
    // Check if all parameter is 'true' and user is manager
    if (all === 'true' && session.user.role === 'manager') {
      whereCondition = {};
      console.log('📋 Loading ALL containers for manager');
    } else {
      whereCondition = { userId: session.user.id };
      console.log('📋 Loading user-specific containers for user:', session.user.id);
    }

    const containers = await prisma.purchaseContainer.findMany({
      where: whereCondition,
      include: { 
        contents: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        uaeSales: true, // Include UAE sales data
        uaeExpends: true // Include UAE expenses data
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Found containers:', containers.length);
    containers.forEach(container => {
      console.log(`📦 Container: ${container.containerId}, User: ${container.user?.name || 'Unknown'}, Status: ${container.status}`);
      console.log(`   UAE Sales: ${container.uaeSales?.length || 0} items`);
      console.log(`   UAE Expenses: ${container.uaeExpends?.length || 0} items`);
    });

    return NextResponse.json(containers);
  } catch (error) {
    console.error('❌ Error fetching containers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
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

    const body = await request.json();
    const { containerId, status, city, date, rent, grandTotal, contents } = body;

    // Create new container
    const newContainer = await prisma.purchaseContainer.create({
      data: {
        containerId,
        status: status || 'pending',
        city,
        date,
        rent: rent || 0,
        grandTotal: grandTotal || 0,
        userId: session.user.id,
        contents: {
          create: contents?.map((content: any) => ({
            number: content.number,
            item: content.item,
            model: content.model,
            lotNumber: content.lotNumber,
            price: content.price,
            recovery: content.recovery,
            cutting: content.cutting,
            total: content.total
          })) || []
        }
      },
      include: {
        contents: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        uaeSales: true,
        uaeExpends: true
      }
    });

    return NextResponse.json(newContainer);
  } catch (error) {
    console.error('Error creating container:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}