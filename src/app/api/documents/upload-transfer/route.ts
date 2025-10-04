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
    const session = await getServerSession(authOptions);
    
    console.log('Session data:', session);
    
    if (!session?.user?.id) {
      console.error('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transferId = formData.get('transferId') as string;
    const type = formData.get('type') as string;

    console.log('Transfer upload request received:', {
      fileName: file?.name,
      transferId,
      type,
      userId: session.user.id
    });

    // اعتبارسنجی فایل
    if (!file || file.size === 0) {
      console.error('No file provided in the request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // اعتبارسنجی transferId
    if (!transferId) {
      return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 });
    }

    // بررسی وجود transfer
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId }
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    // بررسی دسترسی کاربر به این ترانسفر
    if (session.user.role !== 'manager' && transfer.senderId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied to this transfer' }, { status: 403 });
    }

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // ایجاد پوشه‌ها اگر وجود نداشته باشند
      const uploadsDir = join(process.cwd(), 'public/uploads');
      const documentsDir = join(uploadsDir, 'documents');
      const transfersDir = join(documentsDir, 'transfers');
      
      await mkdir(uploadsDir, { recursive: true });
      await mkdir(documentsDir, { recursive: true });
      await mkdir(transfersDir, { recursive: true });

      // تولید نام فایل منحصر به فرد
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'bin';
      const uniqueFilename = `transfer_${timestamp}_${randomString}.${fileExtension}`;
      const filePath = join(transfersDir, uniqueFilename);

      // ذخیره فایل
      await writeFile(filePath, buffer);

      // ایجاد رکورد در دیتابیس
      const document = await prisma.document.create({
        data: {
          filename: uniqueFilename,
          originalName: file.name,
          path: `/uploads/documents/transfers/${uniqueFilename}`,
          type: type || 'transfer',
          transferId: transferId,
          userId: session.user.id,
          containerId: transfer.containerId // برای ارتباط با container مربوطه
        },
        include: {
          user: {
            select: {
              name: true,
              username: true
            }
          }
        }
      });

      console.log(`Transfer document uploaded successfully: ${file.name} -> ${uniqueFilename}`);

      const responseDocument = {
        id: document.id,
        name: document.originalName,
        url: document.path,
        type: document.type,
        transferId: document.transferId,
        createdAt: document.createdAt,
        user: document.user
      };

      return NextResponse.json(responseDocument, { status: 201 });

    } catch (fileError) {
      console.error(`Error processing file ${file.name}:`, fileError);
      return NextResponse.json(
        { error: `File processing failed: ${fileError instanceof Error ? fileError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Transfer document upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}