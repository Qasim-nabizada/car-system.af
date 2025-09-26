// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/database';

export async function GET() {
  try {
    // Get counts
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
      // Calculate total sales revenue
      prisma.uAESale.aggregate({
        _sum: { salePrice: true }
      }),
      // Calculate total expenses
      prisma.uAEExpend.aggregate({
        _sum: { amount: true }
      })
    ]);

    // Calculate total USA purchase costs (grandTotal from containers)
    const usaPurchaseCosts = await prisma.purchaseContainer.aggregate({
      _sum: { grandTotal: true }
    });

    const totalRevenue = totalSales._sum.salePrice || 0;
    const totalUAEExpenses = totalExpends._sum.amount || 0;
    const totalUSACosts = usaPurchaseCosts._sum.grandTotal || 0;
    
    // Convert USD to AED (assuming 1 USD = 3.67 AED)
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
    return NextResponse.json({ error: 'Failed to load dashboard stats' }, { status: 500 });
  }
}