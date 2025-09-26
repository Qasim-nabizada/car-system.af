import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { unlink } from 'fs/promises';
import { join } from 'path';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteParams {
  params: {
    id: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // پیدا کردن سند
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // حذف فایل فیزیکی
    try {
      const filePath = join(process.cwd(), 'public', document.path);
      await unlink(filePath);
      console.log(`File deleted: ${filePath}`);
    } catch (fileError) {
      console.warn('Could not delete physical file, continuing with database deletion:', fileError);
    }

    // حذف رکورد از دیتابیس
    await prisma.document.delete({
      where: { id: documentId }
    });

    return NextResponse.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id
      },
      include: {
        container: {
          select: {
            containerId: true,
            vendor: {
              select: {
                companyName: true
              }
            }
          }
        },
        transfer: {
          select: {
            container: {
              select: {
                containerId: true
              }
            },
            vendor: {
              select: {
                companyName: true
              }
            }
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);

  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}