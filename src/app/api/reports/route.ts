import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import prisma from '../../../lib/database';

export const dynamic = 'force-dynamic';


export const revalidate = 0;

const USD_TO_AED_RATE = 3.67;

interface ContainerWithDetails {
  id: string;
  grandTotal: number | null;
  uaeSales: { salePrice: number | null }[];
  uaeExpends: { amount: number | null }[];
  contents: any[];
}

interface UserReport {
  userId: string;
  userName: string | null;
  totalContainers: number;
  totalUSACostUSD: number;
  totalUAESalesAED: number;
  totalUAEExpensesAED: number;
  totalProfitAED: number;
}

interface MonthlyReport {
  month: string;
  salesAED: number;
  expensesAED: number;
  profitAED: number;
}

interface SummaryReport {
  totalUsers: number;
  totalContainers: number;
  totalUSACostUSD: number;
  totalUAESalesAED: number;
  totalUAEExpensesAED: number;
  totalNetProfitAED: number;
}

// تعریف نوع برای کاربر Prisma
interface UserWithContainers {
  id: string;
  name: string | null;
  role: string;
  purchaseContainers: ContainerWithDetails[];
}


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
    const formattedUserReports: UserReport[] = userReports.map((user: UserWithContainers) => {
      const userContainers: ContainerWithDetails[] = user.purchaseContainers;

      // محاسبه هزینه‌های آمریکا (USD)
      const totalUSACostUSD = userContainers.reduce((sum: number, container: ContainerWithDetails) => {
        return sum + (container.grandTotal || 0);
      }, 0);

      // محاسبه فروش امارات (AED)
      const totalUAESalesAED = userContainers.reduce((sum: number, container: ContainerWithDetails) => {
        const salesTotal = container.uaeSales.reduce((salesSum: number, sale: { salePrice: number | null }) => 
          salesSum + (sale.salePrice || 0), 0);
        return sum + salesTotal;
      }, 0);

      // محاسبه هزینه‌های امارات (AED)
      const totalUAEExpensesAED = userContainers.reduce((sum: number, container: ContainerWithDetails) => {
        const expensesTotal = container.uaeExpends.reduce((expenseSum: number, expend: { amount: number | null }) => 
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
    const monthlyReports: MonthlyReport[] = [
      { month: 'Jan', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Feb', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Mar', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Apr', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'May', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Jun', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Jul', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Aug', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Sep', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Oct', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Nov', salesAED: 0, expensesAED: 0, profitAED: 0 },
      { month: 'Dec', salesAED: 0, expensesAED: 0, profitAED: 0 }
    ];

    // 4. خلاصه کلی - تعریف نوع برای reduce
    const summary: SummaryReport = {
      totalUsers: userReports.length,
      totalContainers: userReports.reduce((sum: number, user: UserWithContainers) => sum + user.purchaseContainers.length, 0),
      totalUSACostUSD: formattedUserReports.reduce((sum: number, report: UserReport) => sum + report.totalUSACostUSD, 0),
      totalUAESalesAED: formattedUserReports.reduce((sum: number, report: UserReport) => sum + report.totalUAESalesAED, 0),
      totalUAEExpensesAED: formattedUserReports.reduce((sum: number, report: UserReport) => sum + report.totalUAEExpensesAED, 0),
      totalNetProfitAED: formattedUserReports.reduce((sum: number, report: UserReport) => sum + report.totalProfitAED, 0)
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