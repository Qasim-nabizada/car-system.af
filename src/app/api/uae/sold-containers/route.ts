import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/database';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Fetching sold containers with UAE data');

    // گرفتن همه کانتینرهایی که فروش UAE دارند
    const soldContainers = await prisma.purchaseContainer.findMany({
      where: {
        uaeSales: {
          some: {} // حداقل یک فروش UAE داشته باشد
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        uaeSales: true,
        uaeExpends: true,
        contents: true,
        // گرفتن همه فایل‌های مربوط به container (بدون فیلتر)
        documents: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('✅ Sold containers found:', soldContainers.length);
    
    // لاگ کردن اطلاعات فایل‌ها برای دیباگ
    soldContainers.forEach(container => {
      console.log(`📦 Container ${container.containerId}:`, {
        salesCount: container.uaeSales.length,
        filesCount: container.documents.length,
        files: container.documents.map(f => ({
          id: f.id,
          name: f.originalName,
          type: f.type,
          containerId: f.containerId,
          transferId: f.transferId
        }))
      });
    });

    return NextResponse.json(soldContainers);

  } catch (error) {
    console.error('❌ Error fetching sold containers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}