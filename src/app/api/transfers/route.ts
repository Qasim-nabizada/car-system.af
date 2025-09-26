// در /api/transfers/route.ts
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
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    let where: any = { senderId: session.user.id };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, username: true } },
        receiver: { select: { id: true, name: true, username: true } },
        vendor: { select: { id: true, companyName: true, representativeName: true } },
        container: { select: { containerId: true } },
        documents: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
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

    console.log('👤 Session user:', { 
      id: session.user.id, 
      name: session.user.name,
      role: session.user.role 
    });

    const body = await request.json();
    console.log('📦 Request body:', body);

    const { receiverId, amount, containerId, type, date, description } = body;

    // اعتبارسنجی
    if (!receiverId || !amount || !containerId || !type || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // منطق دقیقاً مانند vendors API شما
    let vendor;
    if (session.user.role === 'manager') {
      // مدیران به همه vendors دسترسی دارند
      vendor = await prisma.vendor.findUnique({
        where: { id: receiverId }
      });
      console.log('👑 Manager accessing vendor:', vendor);
    } else {
      // کاربران عادی فقط vendors خودشان
      vendor = await prisma.vendor.findFirst({
        where: { 
          id: receiverId,
          userId: session.user.id
        }
      });
      console.log('👤 User vendor check:', vendor);
    }

    if (!vendor) {
      console.log('🔴 Vendor not found');
      return NextResponse.json(
        { error: 'Vendor not found or access denied' },
        { status: 404 }
      );
    }

    // بررسی container
    const container = await prisma.purchaseContainer.findUnique({
      where: { id: containerId }
    });

    if (!container) {
      return NextResponse.json(
        { error: 'Container not found' },
        { status: 404 }
      );
    }

    // ایجاد ترانسفر
    const transfer = await prisma.transfer.create({
      data: {
        senderId: session.user.id,
        receiverId: session.user.id, // به کاربر جاری
        vendorId: vendor.id, // به فروشنده
        amount: parseFloat(amount),
        containerId,
        type,
        date: new Date(date).toISOString().split('T')[0],
        description: description || '',
        createdAt: new Date()
      },
      include: {
        sender: { select: { id: true, name: true, username: true } },
        receiver: { select: { id: true, name: true, username: true } },
        vendor: { select: { id: true, companyName: true, representativeName: true } },
        container: { select: { containerId: true } }
      }
    });

    console.log('✅ Transfer created successfully:', transfer.id);
    
    return NextResponse.json(transfer, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to create transfer' },
      { status: 500 }
    );
  }
}