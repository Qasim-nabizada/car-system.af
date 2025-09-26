import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '../../../lib/database';
import { authOptions } from '../../../lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// برای دریافت لیست فروشندگان
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user?.role === 'manager') {
      const vendors = await prisma.vendor.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              name: true
            }
          }
        }
      });
      return NextResponse.json(vendors);
    } else {
      const vendors = await prisma.vendor.findMany({
        where: {
          userId: session.user.id
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(vendors);
    }
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// برای ایجاد فروشنده جدید - این بخش را اضافه کنید
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyName, companyAddress, representativeName, email, phone, country } = body;

    // اعتبارسنجی
    if (!companyName || !representativeName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ایجاد فروشنده
    const newVendor = await prisma.vendor.create({
      data: {
        companyName,
        companyAddress: companyAddress || '',
        representativeName,
        email,
        phone,
        country: country || 'USA',
        userId: session.user.id
      }
    });

    return NextResponse.json(newVendor, { status: 201 });
    
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}