import { NextResponse } from 'next/server';
import prisma from '../../../../lib/database';

export async function GET() {
  try {
    // Get counts - فقط داده‌های واقعی
    const [
      totalVendors,
      totalUsers,
      totalContainers,
      pendingContainers,
      shippedContainers,
      completedContainers,
      totalSales,
      totalExpends
    ] = await Promise.all([
      prisma.vendor.count(),
      prisma.user.count({ where: { 
        role: { not: 'admin' },
        isActive: true 
      }}),
      prisma.purchaseContainer.count(),
      prisma.purchaseContainer.count({ where: { status: 'pending' } }),
      prisma.purchaseContainer.count({ where: { status: 'shipped' } }),
      prisma.purchaseContainer.count({ where: { status: 'completed' } }),
      prisma.uAESale.aggregate({
        _sum: { salePrice: true }
      }),
      prisma.uAEExpend.aggregate({
        _sum: { amount: true }
      })
    ]);

    // Calculate total USA purchase costs
    const usaPurchaseCosts = await prisma.purchaseContainer.aggregate({
      _sum: { grandTotal: true }
    });

    const totalRevenue = totalSales._sum.salePrice || 0;
    const totalUAEExpenses = totalExpends._sum.amount || 0;
    const totalUSACosts = usaPurchaseCosts._sum.grandTotal || 0;
    
    // Convert USD to AED (1 USD = 3.67 AED)
    const totalUSACostsAED = totalUSACosts * 3.67;
    
    const totalCosts = totalUAEExpenses + totalUSACostsAED;
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // Calculate monthly revenue (current month)
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const monthlySales = await prisma.uAESale.aggregate({
      _sum: { salePrice: true },
      where: {
        createdAt: {
          gte: firstDayOfMonth
        }
      }
    });

    const monthlyRevenue = monthlySales._sum.salePrice || 0;

    return NextResponse.json({
      totalVendors,
      totalUsers,
      totalContainers,
      pendingContainers,
      shippedContainers,
      completedContainers,
      totalRevenue,
      totalCosts: Math.round(totalCosts),
      netProfit: Math.round(netProfit),
      profitMargin,
      monthlyRevenue: Math.round(monthlyRevenue)
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    // در صورت خطا، مقادیر صفر برگردانید
    return NextResponse.json({
      totalVendors: 0,
      totalUsers: 0,
      totalContainers: 0,
      pendingContainers: 0,
      shippedContainers: 0,
      completedContainers: 0,
      totalRevenue: 0,
      totalCosts: 0,
      netProfit: 0,
      profitMargin: 0,
      monthlyRevenue: 0
    });
  }
}