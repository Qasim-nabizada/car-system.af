// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import prisma from '../../../lib/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

export const dynamic = "force-dynamic";

export const revalidate = 0;


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get('containerId');

    console.log('📄 Documents API called with containerId:', containerId);

    if (!containerId) {
      return NextResponse.json(
        { error: 'Container ID is required' },
        { status: 400 }
      );
    }

    // اول همه containers را برای دیباگ لاگ کنید
    const allContainers = await prisma.purchaseContainer.findMany({
      select: { id: true, containerId: true }
    });
    console.log('📋 All containers in DB:', allContainers);

    // بررسی وجود container با روش مختلف
    const container = await prisma.purchaseContainer.findFirst({
      where: {
        OR: [
          { id: containerId },
          { containerId: containerId } // اگر با containerId اصلی می‌فرستید
        ]
      }
    });

    if (!container) {
      console.log('❌ Container not found. Looking for:', containerId);
      console.log('Available containers:', allContainers.map(c => c.id));
      return NextResponse.json(
        { 
          error: 'Container not found',
          requestedId: containerId,
          availableContainers: allContainers.map(c => ({ id: c.id, containerId: c.containerId }))
        },
        { status: 404 }
      );
    }

    console.log('✅ Container found:', container.id, container.containerId);

    // دریافت اسناد
    const documents = await prisma.document.findMany({
      where: {
        containerId: container.id // با id دیتابیس جستجو کنید
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📄 Found ${documents.length} documents`);

    return NextResponse.json(documents);

  } catch (error) {
    console.error('❌ Documents API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}