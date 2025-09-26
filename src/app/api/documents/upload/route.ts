import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import prisma from '../../../../lib/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // استفاده از authOptions برای getServerSession
    const session = await getServerSession(authOptions);
    
    console.log('Session data:', session);
    
    if (!session?.user?.id) {
      console.error('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const containerId = formData.get('containerId') as string;
    const type = formData.get('type') as string;

    console.log('Upload request received:', {
      filesCount: files?.length || 0,
      containerId,
      type,
      userId: session.user.id
    });

    // اعتبارسنجی فایل‌ها
    if (!files || files.length === 0) {
      console.error('No files provided in the request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // اعتبارسنجی containerId
    if (!containerId) {
      return NextResponse.json({ error: 'Container ID is required' }, { status: 400 });
    }

    // بررسی وجود container
    const container = await prisma.purchaseContainer.findUnique({
      where: { id: containerId }
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    const uploadedDocuments = [];

    for (const file of files) {
      if (!file || file.size === 0) {
        console.warn('Skipping empty file');
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // ایجاد پوشه‌ها اگر وجود نداشته باشند
        const uploadsDir = join(process.cwd(), 'public/uploads');
        const documentsDir = join(uploadsDir, 'documents');
        
        await mkdir(uploadsDir, { recursive: true });
        await mkdir(documentsDir, { recursive: true });

        // تولید نام فایل منحصر به فرد
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop() || 'bin';
        const uniqueFilename = `${timestamp}_${randomString}.${fileExtension}`;
        const filePath = join(documentsDir, uniqueFilename);

        // ذخیره فایل
        await writeFile(filePath, buffer);

        // ایجاد رکورد در دیتابیس
        const document = await prisma.document.create({
          data: {
            filename: uniqueFilename,
            originalName: file.name,
            path: `/uploads/documents/${uniqueFilename}`,
            type: type || 'purchase',
            containerId: containerId,
            userId: session.user.id
          }
        });

        uploadedDocuments.push({
          id: document.id,
          name: document.originalName,
          url: document.path,
          createdAt: document.createdAt
        });

        console.log(`File uploaded successfully: ${file.name} -> ${uniqueFilename}`);

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        continue;
      }
    }

    if (uploadedDocuments.length === 0) {
      return NextResponse.json({ error: 'No files were successfully uploaded' }, { status: 400 });
    }

    return NextResponse.json(uploadedDocuments, { status: 201 });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}