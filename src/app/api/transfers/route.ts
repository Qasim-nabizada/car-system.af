import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import prisma from '../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 Session user:', session.user);

    const body = await request.json();
    console.log('📦 Request body:', body);

    const { senderName, vendorId, amount, containerId, type, date, description } = body;

    // اعتبارسنجی
    if (!senderName || !vendorId || !amount || !containerId || !type || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // بررسی vendor
    let vendor;
    if (session.user.role === 'manager') {
      vendor = await prisma.vendor.findUnique({
        where: { id: vendorId }
      });
    } else {
      vendor = await prisma.vendor.findFirst({
        where: { 
          id: vendorId,
          userId: session.user.id
        }
      });
    }

    if (!vendor) {
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

    // 🔥 راه حل: استفاده از vendor.userId برای receiverId
    // چون در مدل شما receiverId باید به User اشاره کند
    const finalDescription = description 
      ? `Sender: ${senderName} | ${description}`
      : `Sender: ${senderName}`;

    const transfer = await prisma.transfer.create({
      data: {
        senderId: session.user.id, // کاربر جاری
        receiverId: vendor.userId, // استفاده از userId مربوط به vendor
        vendorId: vendor.id, // vendorId هم ذخیره می‌شود
        amount: parseFloat(amount),
        containerId: containerId,
        type: type,
        date: date, // به صورت string ذخیره می‌شود
        description: finalDescription,
      },
      include: {
        sender: { 
          select: { id: true, name: true, username: true } 
        },
        receiver: { 
          select: { id: true, name: true, username: true } 
        },
        vendor: { 
          select: { id: true, companyName: true, representativeName: true } 
        },
        container: { 
          select: { containerId: true } 
        }
      }
    });

    console.log('✅ Transfer created successfully:', transfer.id);
    
    return NextResponse.json(transfer, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating transfer:', error);
    
    // نمایش خطای دقیق‌تر
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { error: `Failed to create transfer: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// GET endpoint برای دریافت ترانسفرها
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let transfers;
    
    if (session.user.role === 'manager') {
      // مدیر همه ترانسفرها را می‌بیند
      transfers = await prisma.transfer.findMany({
        include: {
          sender: { 
            select: { id: true, name: true, username: true } 
          },
          receiver: { 
            select: { id: true, name: true, username: true } 
          },
          vendor: { 
            select: { id: true, companyName: true, representativeName: true } 
          },
          container: { 
            select: { containerId: true } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // کاربر فقط ترانسفرهای خودش را می‌بیند
      transfers = await prisma.transfer.findMany({
        where: {
          senderId: session.user.id
        },
        include: {
          sender: { 
            select: { id: true, name: true, username: true } 
          },
          receiver: { 
            select: { id: true, name: true, username: true } 
          },
          vendor: { 
            select: { id: true, companyName: true, representativeName: true } 
          },
          container: { 
            select: { containerId: true } 
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json(transfers);
    
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}