import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import prisma from '../../../lib/database';
import bcrypt from 'bcrypt';



export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // فقط اطلاعات basic کانتینرها را برگردان
    const containers = await prisma.purchaseContainer.findMany({
      where: whereCondition,
      select: {
        id: true,
        containerId: true,
        status: true,
        city: true,
        date: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(containers);
  } catch (error) {
    console.error('Error fetching containers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}