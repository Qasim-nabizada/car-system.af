// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('🔍 Starting dashboard stats calculation for ALL containers...');

    // Get ALL UAE sales data from ALL containers
    const allSales = await prisma.uAESale.findMany({
      select: {
        salePrice: true,
        containerId: true
      }
    });

    // Get ALL UAE expenses data from ALL containers
    const allExpenses = await prisma.uAEExpend.findMany({
      select: {
        amount: true,
        containerId: true
      }
    });

    // Get ALL containers with their USA purchase costs
    const allContainers = await prisma.purchaseContainer.findMany({
      select: {
        id: true,
        containerId: true,
        grandTotal: true,
        status: true
      }
    });

    console.log('📊 Total data found:');
    console.log('  - Sales records:', allSales.length);
    console.log('  - Expense records:', allExpenses.length);
    console.log('  - Containers:', allContainers.length);

    // Calculate totals from ALL containers
    let totalSalesUAE = 0;
    let totalExpendUAE = 0;
    let totalBuyUSA = 0;

    // Calculate UAE sales total
    allSales.forEach(sale => {
      totalSalesUAE += sale.salePrice || 0;
    });

    // Calculate UAE expenses total
    allExpenses.forEach(expense => {
      totalExpendUAE += expense.amount || 0;
    });

    // Calculate USA purchase costs (convert USD to AED)
    allContainers.forEach(container => {
      totalBuyUSA += (container.grandTotal || 0) * 3.67;
    });

    // Calculate benefits according to your formula: Total Sale UAE - (Total Buy USA + Total Expend UAE)
    const totalBenefits = totalSalesUAE - (totalBuyUSA + totalExpendUAE);
    const totalCosts = totalBuyUSA + totalExpendUAE;

    console.log('💰 Financial Calculations:');
    console.log('  - Total UAE Sales:', totalSalesUAE);
    console.log('  - Total UAE Expenses:', totalExpendUAE);
    console.log('  - Total USA Buy (AED):', totalBuyUSA);
    console.log('  - Total Costs:', totalCosts);
    console.log('  - Total Benefits:', totalBenefits);

    // Calculate profit margin
    const profitMargin = totalSalesUAE > 0 ? Math.round((totalBenefits / totalSalesUAE) * 100) : 0;

    // Get other statistics
    const totalVendors = await prisma.vendor.count();
    const totalUsers = await prisma.user.count();
    const totalContainersCount = allContainers.length;
    
    // Count containers by status
    const pendingContainers = allContainers.filter(c => c.status === 'pending').length;
    const shippedContainers = allContainers.filter(c => c.status === 'shipped').length;
    const completedContainers = allContainers.filter(c => c.status === 'completed').length;

    // Monthly benefits (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = await prisma.uAESale.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        salePrice: true
      }
    });

    const recentExpenses = await prisma.uAEExpend.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
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

    const monthlySales = recentSales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
    const monthlyExpenses = recentExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
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
      netProfit: Math.round(totalBenefits),
      profitMargin,
      monthlyBenefits: Math.round(monthlyBenefits)
    };

    console.log('🎯 Final Dashboard Stats:', stats);

    // Set headers to prevent caching
    const headers = new Headers();
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(JSON.stringify(stats), {
      status: 200,
      headers: headers
    });

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