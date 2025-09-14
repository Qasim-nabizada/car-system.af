import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
// این فایل احتمالاً 3 نقطه نیاز دارد:
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get('containerId');

    console.log('🔄 Fetching UAE data for container:', containerId);
    console.log('👤 User role:', session.user.role);
    console.log('👤 User ID:', session.user.id);

    if (!containerId) {
      return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    }

    // بررسی وجود کانتینر
    const container = await prisma.purchaseContainer.findUnique({
      where: { id: containerId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    if (!container) {
      console.log('❌ Container not found:', containerId);
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    console.log('📦 Container found:', container.containerId);
    console.log('📦 Container user ID:', container.userId);

    // مدیران به همه داده‌ها دسترسی دارند، کاربران عادی فقط به داده‌های خودشان
    if (session.user.role !== 'manager' && container.userId !== session.user.id) {
      console.log('❌ Access denied for user:', session.user.id);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // دریافت داده‌های فروش و هزینه‌ها
    const [sales, expends] = await Promise.all([
      prisma.uAESale.findMany({
        where: { containerId },
        orderBy: { number: 'asc' }
      }),
      prisma.uAEExpend.findMany({
        where: { containerId },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    console.log('✅ Sales found:', sales.length);
    console.log('✅ Expends found:', expends.length);

    return NextResponse.json({ 
      success: true,
      sales: sales || [],
      expends: expends || [],
      container
    });

  } catch (error) {
    console.error('❌ Error fetching UAE data:', error);
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

    const body = await request.json();
    const { containerId, sales, expends } = body;

    console.log('💾 Saving UAE data for container:', containerId);
    console.log('👤 User role:', session.user.role);

    if (!containerId) {
      return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    }

    // بررسی دسترسی کاربر
    const container = await prisma.purchaseContainer.findUnique({
      where: { id: containerId }
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // فقط مدیران می‌توانند داده‌های فروش امارات را ذخیره کنند
    if (session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can save UAE sales data' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // حذف داده‌های قبلی
      await tx.uAESale.deleteMany({ where: { containerId } });
      await tx.uAEExpend.deleteMany({ where: { containerId } });

      // ذخیره داده‌های جدید
      if (sales?.length > 0) {
        await tx.uAESale.createMany({
          data: sales.map((sale: any) => ({
            containerId,
            userId: session.user.id,
            number: sale.number,
            item: sale.item,
            salePrice: sale.salePrice,
            lotNumber: sale.lotNumber,
            note: sale.note
          }))
        });
      }

      if (expends?.length > 0) {
        await tx.uAEExpend.createMany({
          data: expends.map((expend: any) => ({
            containerId,
            userId: session.user.id,
            category: expend.category,
            amount: expend.amount,
            description: expend.description
          }))
        });
      }
    });

    console.log('✅ UAE data saved successfully for container:', containerId);

    return NextResponse.json({ 
      success: true,
      message: 'Data saved successfully' 
    });

  } catch (error) {
    console.error('❌ Error saving UAE data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}