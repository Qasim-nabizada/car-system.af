// app/api/purchase/containers/[id]/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../../lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const containerId = params.id;
    const body = await request.json();

    console.log('📥 Received update request for container:', containerId);
    console.log('📋 Update data:', body);

    // آپدیت container بدون permission check
    const updatedContainer = await prisma.purchaseContainer.update({
      where: { id: containerId },
      data: {
        containerId: body.containerId,
        status: body.status,
        city: body.city,
        date: body.date,
        vendorId: body.vendorId,
        rent: body.rent,
        grandTotal: body.grandTotal,
        updatedAt: new Date(),
      },
      include: {
        vendor: true,
        contents: {
          orderBy: { number: 'asc' }
        },
        documents: true,
        user: true,
      },
    });

    // آپدیت contents
    if (body.contents && body.contents.length > 0) {
      // حذف contents قدیمی
      await prisma.purchaseContent.deleteMany({
        where: { containerId: containerId }
      });

      // اضافه کردن contents جدید
      const contentsData = body.contents.map((content: any) => ({
        number: content.number,
        item: content.item,
        model: content.model,
        year: content.year,
        lotNumber: content.lotNumber,
        price: content.price,
        recovery: content.recovery,
        cutting: content.cutting,
        total: content.total,
        containerId: containerId,
      }));

      await prisma.purchaseContent.createMany({
        data: contentsData
      });

      // گرفتن contents آپدیت شده
      updatedContainer.contents = await prisma.purchaseContent.findMany({
        where: { containerId: containerId },
        orderBy: { number: 'asc' }
      });
    }

    console.log('✅ Container updated successfully');
    return NextResponse.json(updatedContainer);

  } catch (error: any) {
    console.error('❌ Error updating container:', error);
    
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update container' },
      { status: 500 }
    );
  }
}