import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';

// تعریف نوع Container با توجه به داده‌های Prisma
type Container = {
  containerId: string;
  status: string;
  user?: {
    id: string;
    username: string;
    name: string;
  } | null;
  uaeSales?: any[];    // در صورت امکان نوع دقیق‌تری بدهید
  uaeExpends?: any[];
  contents?: any[];
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');

    let whereCondition = {};
    if (all === 'true' && session.user.role === 'manager') {
      whereCondition = {};
    } else {
      whereCondition = { userId: session.user.id };
    }

    const containers = await prisma.purchaseContainer.findMany({
      where: whereCondition,
      include: {
        contents: true,
        user: { select: { id: true, username: true, name: true } },
        uaeSales: true,
        uaeExpends: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Found containers:', containers.length);
    containers.forEach((container: Container) => {
      console.log(`📦 Container: ${container.containerId}, User: ${container.user?.name || 'Unknown'}, Status: ${container.status}`);
      console.log(`   UAE Sales: ${container.uaeSales?.length || 0} items`);
      console.log(`   UAE Expenses: ${container.uaeExpends?.length || 0} items`);
    });

    return NextResponse.json(containers);
  } catch (error) {
    console.error('❌ Error fetching containers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
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
        user: { select: { id: true, username: true, name: true } },
        uaeSales: true,
        uaeExpends: true
      }
    });

    return NextResponse.json(newContainer);
  } catch (error) {
    console.error('❌ Error creating container:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
