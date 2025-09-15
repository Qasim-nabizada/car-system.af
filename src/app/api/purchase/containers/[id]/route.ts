import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import prisma from '../../../../../lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ لاگ برای دیباگ - اینجا قرار دهید
    console.log('🔵 Update request received for container:', params.id);
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();
    
    // ✅ لاگ داده‌های دریافتی - اینجا قرار دهید
    console.log('📦 Request data:', JSON.stringify(data, null, 2));

    const container = await prisma.purchaseContainer.findUnique({
      where: { id },
      include: { contents: true }
    });

    if (!container) {
      console.log('❌ Container not found:', id);
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    if (container.userId !== session.user.id) {
      console.log('❌ Forbidden: User', session.user.id, 'tried to update container', id, 'owned by', container.userId);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // بقیه کد...
    // شروع تراکنش برای اپدیت کانتینر و محتویات
    const result = await prisma.$transaction(async (tx) => {
      // 1. اپدیت اطلاعات کانتینر
      const updatedContainer = await tx.purchaseContainer.update({
        where: { id },
        data: {
          containerId: data.containerId,
          status: data.status,
          city: data.city,
          date: data.date,
          rent: data.rent,
          grandTotal: data.grandTotal
        }
      });

      // 2. حذف محتویات قدیمی
      await tx.purchaseContent.deleteMany({
        where: { containerId: id }
      });

      // 3. ایجاد محتویات جدید
      if (data.contents && data.contents.length > 0) {
        const contentsData = data.contents.map((content: any) => ({
          containerId: id,
          number: content.number,
          item: content.item,
          model: content.model,
          lotNumber: content.lotNumber,
          price: content.price,
          recovery: content.recovery,
          cutting: content.cutting,
          total: content.total
        }));

        await tx.purchaseContent.createMany({
          data: contentsData
        });
      }

      // 4. بازگرداندن کانتینر با محتویات جدید
      return await tx.purchaseContainer.findUnique({
        where: { id },
        include: { contents: true }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error updating container:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}