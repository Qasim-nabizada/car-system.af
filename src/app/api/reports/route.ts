import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/database';

const USD_TO_AED_RATE = 3.67;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'year';

    // 1. دریافت گزارش کاربران
    const userReports = await prisma.user.findMany({
      where: {
        role: 'user' // فقط کاربران عادی، نه مدیران
      },
      include: {
        purchaseContainers: {
          include: {
            contents: true,
            uaeSales: true,
            uaeExpends: true
          }
        }
      }
    });

    // 2. تبدیل داده‌ها به فرمت گزارش
    const formattedUserReports = userReports.map(user => {
      const userContainers = user.purchaseContainers;

      // محاسبه هزینه‌های آمریکا (USD)
      const totalUSACostUSD = userContainers.reduce((sum, container) => {
        return sum + (container.grandTotal || 0);
      }, 0);

      // محاسبه فروش امارات (AED)
      const totalUAESalesAED = userContainers.reduce((sum, container) => {
        const salesTotal = container.uaeSales.reduce((salesSum, sale) => 
          salesSum + (sale.salePrice || 0), 0);
        return sum + salesTotal;
      }, 0);

      // محاسبه هزینه‌های امارات (AED)
      const totalUAEExpensesAED = userContainers.reduce((sum, container) => {
        const expensesTotal = container.uaeExpends.reduce((expenseSum, expend) => 
          expenseSum + (expend.amount || 0), 0);
        return sum + expensesTotal;
      }, 0);

      // محاسبه سود نهایی (AED)
      const totalProfitAED = totalUAESalesAED - totalUAEExpensesAED - (totalUSACostUSD * USD_TO_AED_RATE);

      return {
        userId: user.id,
        userName: user.name,
        totalContainers: userContainers.length,
        totalUSACostUSD,
        totalUAESalesAED,
        totalUAEExpensesAED,
        totalProfitAED
      };
    });

    // 3. گزارش ماهانه (نمونه ساده)
    const monthlyReports = [
      { month: 'Jan', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Feb', salesAED: 0, expensesAED: 0, profitAED: 0 },
      // ... می‌توانید با داده واقعی پر کنید
    ];

    // 4. خلاصه کلی
    const summary = {
      totalUsers: userReports.length,
      totalContainers: userReports.reduce((sum, user) => sum + user.purchaseContainers.length, 0),
      totalUSACostUSD: formattedUserReports.reduce((sum, report) => sum + report.totalUSACostUSD, 0),
      totalUAESalesAED: formattedUserReports.reduce((sum, report) => sum + report.totalUAESalesAED, 0),
      totalUAEExpensesAED: formattedUserReports.reduce((sum, report) => sum + report.totalUAEExpensesAED, 0),
      totalNetProfitAED: formattedUserReports.reduce((sum, report) => sum + report.totalProfitAED, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        userReports: formattedUserReports,
        monthlyReports,
        summary
      }
    });

  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}