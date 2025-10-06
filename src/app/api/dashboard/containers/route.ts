// app/api/dashboard/containers/route.ts
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/database';

export async function GET() {
  try {
    const containerStatus = await prisma.purchaseContainer.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const totalContainers = containerStatus.reduce((sum, item) => sum + item._count.id, 0);

    const containerData = containerStatus.map(item => ({
      status: item.status,
      count: item._count.id,
      percentage: totalContainers > 0 ? Math.round((item._count.id / totalContainers) * 100) : 0
    }));

    console.log('📊 Container Status Data:', containerData);

    return NextResponse.json(containerData);
  } catch (error) {
    console.error('❌ Container data error:', error);
    return NextResponse.json([]);
  }
}