import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import fs from 'fs';
import path from 'path';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const filePath = params.path.join('/');
    
    // مسیر کامل فایل در سیستم
    const fullPath = path.join(process.cwd(), 'uploads', filePath);
    
    console.log('📁 Attempting to serve file:', fullPath);

    // بررسی وجود فایل
    if (!fs.existsSync(fullPath)) {
      console.error('❌ File not found:', fullPath);
      return new NextResponse('File not found', { status: 404 });
    }

    // خواندن فایل
    const fileBuffer = fs.readFileSync(fullPath);
    const fileStats = fs.statSync(fullPath);

    // تشخیص نوع MIME بر اساس پسوند فایل
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // ایجاد response با فایل
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', contentType);
    response.headers.set('Content-Length', fileStats.size.toString());
    response.headers.set('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);

    console.log('✅ File served successfully:', fullPath);
    return response;

  } catch (error) {
    console.error('❌ Error serving file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}