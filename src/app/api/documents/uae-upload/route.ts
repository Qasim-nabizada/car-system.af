import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '../../../../lib/database';
import { authOptions } from '../../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const containerId = formData.get('containerId') as string;
    const type = formData.get('type') as string || 'uae-sales';

    if (!files || files.length === 0) {
      console.error("❌ No files received in formData");
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (!containerId) {
      console.error("❌ No containerId provided");
      return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    }

    console.log('🔄 Uploading to UAE documents API');
    console.log("✅ Files received:", files.length);
    console.log("📦 Container ID:", containerId);
    console.log("👤 User ID:", session.user.id);

    // بررسی وجود کانتینر
    const container = await prisma.purchaseContainer.findUnique({
      where: { id: containerId }
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // ایجاد دایرکتوری مخصوص کانتینر
    const containerUploadsDir = path.join(process.cwd(), 'public/uploads/uae-sales', containerId);
    await mkdir(containerUploadsDir, { recursive: true });

    const uploadedDocuments = [];

    for (const file of files) {
      // تبدیل File به Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // ایجاد نام فایل منحصر به فرد
      const timestamp = Date.now();
      const originalName = file.name;
      const extension = path.extname(originalName);
      const filename = `${timestamp}-${Math.random().toString(36).substring(2, 15)}${extension}`;
      const filepath = path.join(containerUploadsDir, filename);

      // ذخیره فایل
      await writeFile(filepath, buffer);

      // ذخیره در دیتابیس مطابق مدل موجود
      const document = await prisma.document.create({
        data: {
          filename: filename,
          originalName: originalName,
          path: `/uploads/uae-sales/${containerId}/${filename}`,
          type: type,
          containerId: containerId,
          userId: session.user.id,
        }
      });

      uploadedDocuments.push(document);
      console.log(`✅ File uploaded: ${originalName}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${uploadedDocuments.length} file(s) uploaded successfully`,
      documents: uploadedDocuments
    });
    
  } catch (error) {
    console.error('❌ Error uploading UAE documents:', error);
    return NextResponse.json(
      { error: 'Failed to upload documents', details: String(error) }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const containerId = searchParams.get('containerId');

    if (!containerId) {
      return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    }

    // بررسی دسترسی به کانتینر
    const container = await prisma.purchaseContainer.findUnique({
      where: { id: containerId },
      include: { user: true }
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // مدیران به همه فایل‌ها دسترسی دارند، کاربران عادی فقط به فایل‌های خودشان
    if (session.user.role !== 'manager' && container.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // دریافت فایل‌های مربوط به UAE sales این کانتینر
    const documents = await prisma.document.findMany({
      where: { 
        containerId,
        type: 'uae-sales'
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true,
      documents 
    });

  } catch (error) {
    console.error('❌ Error fetching UAE documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}