import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/database';
import { getServerSession } from 'next-auth';
import { unlink } from 'fs/promises';
import { join } from 'path';

export const dynamic = "force-dynamic";

export const revalidate = 0;



export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentIds } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'Document IDs array is required' }, { status: 400 });
    }

    // پیدا کردن اسناد کاربر
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        userId: session.user.id
      }
    });

    if (documents.length === 0) {
      return NextResponse.json({ error: 'No documents found' }, { status: 404 });
    }

    const deletionResults = [];

    for (const document of documents) {
      try {
        // حذف فایل فیزیکی
        try {
          const filePath = join(process.cwd(), 'public', document.path);
          await unlink(filePath);
        } catch (fileError) {
          console.warn(`Could not delete physical file for document ${document.id}:`, fileError);
        }

        // حذف از دیتابیس
        await prisma.document.delete({
          where: { id: document.id }
        });

        deletionResults.push({
          id: document.id,
          status: 'success',
          filename: document.originalName
        });

      } catch (error) {
        deletionResults.push({
          id: document.id,
          status: 'error',
          filename: document.originalName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulDeletions = deletionResults.filter(result => result.status === 'success');
    const failedDeletions = deletionResults.filter(result => result.status === 'error');

    return NextResponse.json({
      message: `Deleted ${successfulDeletions.length} documents successfully`,
      successful: successfulDeletions,
      failed: failedDeletions
    });

  } catch (error) {
    console.error('Error in bulk document deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}