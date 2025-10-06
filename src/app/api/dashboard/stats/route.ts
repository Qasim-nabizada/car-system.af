// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/database';

export async function GET() {
  try {
    console.log('🔍 Starting dashboard stats calculation...');

    // Get all UAE sales data
    const allSales = await prisma.uAESale.findMany({
      select: {
        salePrice: true
      }
    });

    // Get all UAE expenses data
    const allExpenses = await prisma.uAEExpend.findMany({
      select: {
        amount: true
      }
    });

    // Get all USA purchase data
    const allContainers = await prisma.purchaseContainer.findMany({
      select: {
        grandTotal: true
      }
    });

    console.log('📊 Data counts - Sales:', allSales.length, 'Expenses:', allExpenses.length, 'Containers:', allContainers.length);

    // Calculate totals
    const totalSalesUAE = allSales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
    const totalExpendUAE = allExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalBuyUSA = allContainers.reduce((sum, container) => sum + ((container.grandTotal || 0) * 3.67), 0);

    // Calculate benefits according to your formula: Total Sale UAE - (Total Buy USA + Total Expend UAE)
    const totalBenefits = totalSalesUAE - (totalBuyUSA + totalExpendUAE);
    const totalCosts = totalBuyUSA + totalExpendUAE;

    console.log('💰 Calculations:');
    console.log('  - Total UAE Sales:', totalSalesUAE);
    console.log('  - Total USA Buy (AED):', totalBuyUSA);
    console.log('  - Total UAE Expenses:', totalExpendUAE);
    console.log('  - Total Costs:', totalCosts);
    console.log('  - Total Benefits:', totalBenefits);

    // Calculate profit margin
    const profitMargin = totalSalesUAE > 0 ? Math.round((totalBenefits / totalSalesUAE) * 100) : 0;

    // Get other statistics
    const totalVendors = await prisma.vendor.count();
    const totalUsers = await prisma.user.count();
    const totalContainersCount = allContainers.length;
    
    // Get container status counts
    const containersWithStatus = await prisma.purchaseContainer.findMany({
      select: {
        status: true
      }
    });
    
    const pendingContainers = containersWithStatus.filter(c => c.status === 'pending').length;
    const shippedContainers = containersWithStatus.filter(c => c.status === 'shipped').length;
    const completedContainers = containersWithStatus.filter(c => c.status === 'completed').length;

    // Monthly benefits (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = await prisma.uAESale.aggregate({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        salePrice: true
      }
    });

    const recentExpenses = await prisma.uAEExpend.aggregate({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        amount: true
      }
    });

    const recentContainers = await prisma.purchaseContainer.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        grandTotal: true
      }
    });

    const monthlySales = recentSales._sum.salePrice || 0;
    const monthlyExpenses = recentExpenses._sum.amount || 0;
    const monthlyUSABuy = recentContainers.reduce((sum, container) => sum + ((container.grandTotal || 0) * 3.67), 0);
    const monthlyBenefits = monthlySales - (monthlyUSABuy + monthlyExpenses);

    const stats = {
      totalVendors,
      totalUsers,
      totalContainers: totalContainersCount,
      pendingContainers,
      shippedContainers,
      completedContainers,
      totalBenefits: Math.round(totalBenefits),
      totalCosts: Math.round(totalCosts),
      netProfit: Math.round(totalBenefits), // Same as totalBenefits
      profitMargin,
      monthlyBenefits: Math.round(monthlyBenefits)
    };

    console.log('🎯 Final Stats:', stats);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    
    // Return zero data for debugging
    return NextResponse.json({
      totalVendors: 0,
      totalUsers: 0,
      totalContainers: 0,
      pendingContainers: 0,
      shippedContainers: 0,
      completedContainers: 0,
      totalBenefits: 0,
      totalCosts: 0,
      netProfit: 0,
      profitMargin: 0,
      monthlyBenefits: 0
    });
  }
}