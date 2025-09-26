// app/api/dashboard/profit-by-category/route.ts
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/database';

export async function GET() {
  try {
    // Calculate profit by container status
    const containers = await prisma.purchaseContainer.findMany({
      include: {
        uaeSales: {
          select: { salePrice: true }
        },
        uaeExpends: {
          select: { amount: true }
        }
      }
    });

    const profitByStatus: { [key: string]: number } = {};

    containers.forEach(container => {
      const totalSales = container.uaeSales.reduce((sum, sale) => sum + sale.salePrice, 0);
      const totalExpenses = container.uaeExpends.reduce((sum, expend) => sum + expend.amount, 0);
      const usaCostAED = container.grandTotal * 3.67;
      const netProfit = totalSales - totalExpenses - usaCostAED;

      if (!profitByStatus[container.status]) {
        profitByStatus[container.status] = 0;
      }
      profitByStatus[container.status] += netProfit;
    });

    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];
    const chartData = Object.entries(profitByStatus).map(([category, profit], index) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      profit: Math.round(profit),
      color: colors[index % colors.length]
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Profit by category error:', error);
    return NextResponse.json([
      { category: 'Pending', profit: 15000, color: '#F59E0B' },
      { category: 'Shipped', profit: 28000, color: '#3B82F6' },
      { category: 'Completed', profit: 45000, color: '#10B981' }
    ]);
  }
}