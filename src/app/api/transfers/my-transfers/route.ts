import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    console.log('🟡 GET /api/transfers/my-transfers called');
    
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('🔴 No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 Session user:', { 
      id: session.user.id, 
      name: session.user.name 
    });

    // راه حل جایگزین: ابتدا vendors کاربر را پیدا کنیم
    const userVendors = await prisma.vendor.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true
      }
    });

    const vendorIds = userVendors.map(v => v.id);
    console.log('📋 User vendors:', vendorIds);

    // اگر کاربر vendors دارد، ترانسفرهای مربوطه را بگیریم
    let transfers;
    if (vendorIds.length > 0) {
      transfers = await prisma.transfer.findMany({
        where: {
          OR: [
            { senderId: session.user.id }, // ترانسفرهای ارسالی توسط کاربر
            { vendorId: { in: vendorIds } } // ترانسفرهای مربوط به vendors کاربر
          ]
        },
        include: {
          sender: { 
            select: { 
              id: true, 
              name: true, 
              username: true 
            } 
          },
          vendor: { 
            select: { 
              id: true, 
              companyName: true, 
              representativeName: true 
            } 
          },
          container: { 
            select: { 
              containerId: true 
            } 
          },
          documents: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              path: true,
              type: true,
              createdAt: true
            }
          }
        },
        orderBy: { 
          createdAt: 'desc' 
        }
      });
    } else {
      // اگر کاربر هیچ vendori ندارد، فقط ترانسفرهای ارسالی را نشان دهیم
      transfers = await prisma.transfer.findMany({
        where: {
          senderId: session.user.id
        },
        include: {
          sender: { 
            select: { 
              id: true, 
              name: true, 
              username: true 
            } 
          },
          vendor: { 
            select: { 
              id: true, 
              companyName: true, 
              representativeName: true 
            } 
          },
          container: { 
            select: { 
              containerId: true 
            } 
          },
          documents: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              path: true,
              type: true,
              createdAt: true
            }
          }
        },
        orderBy: { 
          createdAt: 'desc' 
        }
      });
    }

    console.log('✅ Transfers found:', transfers.length);
    console.log('📊 Transfers sample:', transfers.slice(0, 2));
    
    return NextResponse.json(transfers);
  } catch (error) {
    console.error('❌ Error in /api/transfers/my-transfers:', error);
    
    // خطای دقیق‌تر
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch transfers. Check server logs for details.' },
      { status: 500 }
    );
  }
}