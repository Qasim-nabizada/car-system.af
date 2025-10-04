// app/api/purchase/containers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '../../../../lib/database';
import { authOptions } from '../../../../lib/auth';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const include = searchParams.get('include');

     let where = {};
    if (!all && session.user.role !== 'manager') {
      where = { userId: session.user.id };
    }

    // اصلاح بخش includeRelations
    let includeRelations: any = {
      vendor: true, // همیشه vendor را شامل شود
    };
    
    if (include) {
      const relations = include.split(',');
      if (relations.includes('user')) includeRelations.user = true;
      if (relations.includes('vendor')) includeRelations.vendor = true;
      if (relations.includes('contents')) {
        includeRelations.contents = {
          orderBy: { number: 'asc' }
        };
      }
    } else {
      // به طور پیش‌فرض contents را هم شامل شود
      includeRelations.contents = {
        orderBy: { number: 'asc' }
      };
    }

    const containers = await prisma.purchaseContainer.findMany({
      where,
      include: includeRelations,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(containers);
  } catch (error) {
    console.error('Error fetching containers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch containers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { containerId, status, city, date, vendorId, rent, grandTotal, contents } = body;

    // Validation
    if (!containerId || !vendorId) {
      return NextResponse.json(
        { error: 'Container ID and Vendor are required' },
        { status: 400 }
      );
    }

    // Check if container already exists
    const existingContainer = await prisma.purchaseContainer.findFirst({
      where: {
        containerId,
        userId: session.user.id
      }
    });

    if (existingContainer) {
      return NextResponse.json(
        { error: 'Container with this ID already exists' },
        { status: 409 }
      );
    }

    // Create new container with contents (با فیلد year)
    const container = await prisma.purchaseContainer.create({
      data: {
        containerId,
        status: status || 'pending',
        city,
        date,
        rent: rent || 0,
        grandTotal: grandTotal || 0,
        userId: session.user.id,
        vendorId,
        contents: {
          create: contents.map((content: any) => ({
            number: content.number,
            item: content.item,
            model: content.model,
            year: content.year || '', // اضافه کردن فیلد year
            lotNumber: content.lotNumber,
            price: content.price || 0,
            recovery: content.recovery || 0,
            cutting: content.cutting || 0,
            total: content.total || 0
          }))
        }
      },
      include: {
        vendor: true,
        contents: true
      }
    });

    return NextResponse.json(container);
  } catch (error) {
    console.error('Error creating container:', error);
    return NextResponse.json(
      { error: 'Failed to create container' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Container ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { containerId, status, city, date, vendorId, rent, grandTotal, contents } = body;

    // Update container and its contents (با فیلد year)
    const container = await prisma.purchaseContainer.update({
      where: {
        id,
        userId: session.user.id
      },
      data: {
        containerId,
        status,
        city,
        date,
        rent,
        grandTotal,
        vendorId,
        contents: {
          deleteMany: {},
          create: contents.map((content: any) => ({
            number: content.number,
            item: content.item,
            model: content.model,
            year: content.year || '', // اضافه کردن فیلد year
            lotNumber: content.lotNumber,
            price: content.price || 0,
            recovery: content.recovery || 0,
            cutting: content.cutting || 0,
            total: content.total || 0
          }))
        }
      },
      include: {
        vendor: true,
        contents: true
      }
    });

    return NextResponse.json(container);
  } catch (error) {
    console.error('Error updating container:', error);
    return NextResponse.json(
      { error: 'Failed to update container' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Container ID is required' },
        { status: 400 }
      );
    }

    await prisma.purchaseContainer.delete({
      where: {
        id,
        userId: session.user.id
      }
    });

    return NextResponse.json({ message: 'Container deleted successfully' });
  } catch (error) {
    console.error('Error deleting container:', error);
    return NextResponse.json(
      { error: 'Failed to delete container' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Container ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { status } = body;

    const container = await prisma.purchaseContainer.update({
      where: {
        id,
        userId: session.user.id
      },
      data: {
        status
      },
      include: {
        vendor: true,
        contents: true
      }
    });

    return NextResponse.json(container);
  } catch (error) {
    console.error('Error updating container status:', error);
    return NextResponse.json(
      { error: 'Failed to update container status' },
      { status: 500 }
    );
  }
}