import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import prisma from '../../../../../lib/database';



export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔵 Update request received for container:', params.id);
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    // دریافت و اعتبارسنجی داده‌ها
    const { 
      containerId, 
      status, 
      city, 
      date, 
      vendorId, 
      rent, 
      grandTotal, 
      contents 
    } = await request.json();

    // اعتبارسنجی داده‌های ضروری
    if (!containerId || !vendorId) {
      return NextResponse.json(
        { error: 'Container ID and Vendor ID are required' },
        { status: 400 }
      );
    }

    console.log('📦 Request data:', {
      containerId,
      status,
      city,
      date,
      vendorId,
      rent,
      grandTotal,
      contentsCount: contents?.length || 0
    });

    // بررسی وجود کانتینر
    const container = await prisma.purchaseContainer.findUnique({
      where: { id },
      include: { contents: true, vendor: true }
    });

    if (!container) {
      console.log('❌ Container not found:', id);
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // بررسی مالکیت
    if (container.userId !== session.user.id) {
      console.log('❌ Forbidden: User', session.user.id, 'tried to update container', id, 'owned by', container.userId);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // بررسی وجود vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      console.log('❌ Vendor not found:', vendorId);
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // شروع تراکنش
    const result = await prisma.$transaction(async (tx) => {
      // 1. اپدیت اطلاعات کانتینر
      const updatedContainer = await tx.purchaseContainer.update({
        where: { id },
        data: {
          containerId: containerId,
          status: status || 'pending',
          city: city || '',
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          vendorId: vendorId,
          rent: parseFloat(rent) || 0,
          grandTotal: parseFloat(grandTotal) || 0
        }
      });

      // 2. حذف محتویات قدیمی
      await tx.purchaseContent.deleteMany({
        where: { containerId: id }
      });

      // 3. ایجاد محتویات جدید (اگر وجود دارند)
      if (contents && contents.length > 0) {
        const contentsData = contents.map((content: any) => ({
          containerId: id,
          number: parseInt(content.number) || 0,
          item: content.item || '',
          model: content.model || '',
          year: content.year || '',
          lotNumber: content.lotNumber || '',
          price: parseFloat(content.price) || 0,
          recovery: parseFloat(content.recovery) || 0,
          cutting: parseFloat(content.cutting) || 0,
          total: parseFloat(content.total) || 0
        }));

        await tx.purchaseContent.createMany({
          data: contentsData
        });
      }

      // 4. بازگرداندن کانتینر با محتویات و اطلاعات vendor
      return await tx.purchaseContainer.findUnique({
        where: { id },
        include: { 
          contents: true,
          vendor: true 
        }
      });
    });

    console.log('✅ Container updated successfully:', result?.containerId);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error updating container:', error);
    
    // مدیریت خطاهای خاص Prisma
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Container ID already exists' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid vendor ID' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// اضافه کردن endpointهای دیگر مورد نیاز

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔴 Delete request received for container:', params.id);
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // بررسی وجود کانتینر
    const container = await prisma.purchaseContainer.findUnique({
      where: { id },
      include: { contents: true }
    });

    if (!container) {
      console.log('❌ Container not found for deletion:', id);
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // بررسی مالکیت
    if (container.userId !== session.user.id) {
      console.log('❌ Forbidden: User', session.user.id, 'tried to delete container', id, 'owned by', container.userId);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // شروع تراکنش برای حذف
    await prisma.$transaction(async (tx) => {
      // 1. حذف محتویات
      await tx.purchaseContent.deleteMany({
        where: { containerId: id }
      });

      // 2. حذف اسناد مرتبط (اگر وجود دارند)
      // await tx.document.deleteMany({
      //   where: { containerId: id }
      // });

      // 3. حذف کانتینر
      await tx.purchaseContainer.delete({
        where: { id }
      });
    });

    console.log('✅ Container deleted successfully:', id);
    return NextResponse.json({ 
      message: 'Container deleted successfully',
      deletedId: id 
    });

  } catch (error) {
    console.error('❌ Error deleting container:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🟡 Status update request received for container:', params.id);
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { status } = await request.json();

    // اعتبارسنجی وضعیت
    const validStatuses = ['pending', 'shipped', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, shipped, completed' },
        { status: 400 }
      );
    }

    // بررسی وجود کانتینر
    const container = await prisma.purchaseContainer.findUnique({
      where: { id }
    });

    if (!container) {
      console.log('❌ Container not found for status update:', id);
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // بررسی مالکیت
    if (container.userId !== session.user.id) {
      console.log('❌ Forbidden: User', session.user.id, 'tried to update status of container', id, 'owned by', container.userId);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // به‌روزرسانی وضعیت
    const updatedContainer = await prisma.purchaseContainer.update({
      where: { id },
      data: { status },
      include: {
        contents: true,
        vendor: true
      }
    });

    console.log('✅ Container status updated successfully:', updatedContainer.containerId, '->', status);
    return NextResponse.json(updatedContainer);

  } catch (error) {
    console.error('❌ Error updating container status:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}