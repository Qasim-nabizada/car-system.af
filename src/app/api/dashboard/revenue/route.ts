import { NextResponse } from 'next/server';
import prisma from '../../../../lib/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'month';
  
  try {
    let dateFilter: Date;
    const now = new Date();
    
    switch (range) {
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'quarter':
        dateFilter = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default: // month
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get sales data grouped by month
    const salesData = await prisma.uAESale.groupBy({
      by: ['createdAt'],
      _sum: {
        salePrice: true
      },
      where: {
        createdAt: {
          gte: dateFilter
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // اگر داده‌ای وجود ندارد، آرایه خالی برگردانید
    if (salesData.length === 0) {
      return NextResponse.json([]);
    }

    // بقیه محاسبات...
    const expensesData = await prisma.uAEExpend.groupBy({
      by: ['createdAt'],
      _sum: {
        amount: true
      },
      where: {
        createdAt: {
          gte: dateFilter
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const purchaseData = await prisma.purchaseContainer.findMany({
      where: {
        createdAt: {
          gte: dateFilter
        }
      },
      select: {
        grandTotal: true,
        createdAt: true
      }
    });

    // Group data by month and calculate totals
    const monthlyData: { [key: string]: { revenue: number; cost: number } } = {};

    // Process sales data
    salesData.forEach(sale => {
      const monthKey = sale.createdAt.toISOString().slice(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, cost: 0 };
      }
      monthlyData[monthKey].revenue += sale._sum.salePrice || 0;
    });

    // Process UAE expenses
    expensesData.forEach(expense => {
      const monthKey = expense.createdAt.toISOString().slice(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, cost: 0 };
      }
      monthlyData[monthKey].cost += expense._sum.amount || 0;
    });

    // Process USA purchase costs
    purchaseData.forEach(purchase => {
      const monthKey = purchase.createdAt.toISOString().slice(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, cost: 0 };
      }
      monthlyData[monthKey].cost += (purchase.grandTotal || 0) * 3.67;
    });

    // Format data for chart
    const chartData = Object.entries(monthlyData).map(([month, data]) => {
      const profit = data.revenue - data.cost;
      return {
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Math.round(data.revenue),
        profit: Math.round(profit),
        cost: Math.round(data.cost)
      };
    });

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Revenue data error:', error);
    // در صورت خطا، آرایه خالی برگردانید
    return NextResponse.json([]);
  }
}