// app/api/reports/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// هم برای GET و هم برای POST کار کند
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportType,
      timeRange,
      selectedContainer,
      selectedVendor,
      stats,
      containerReports,
      revenueData,
      containerBenefits,
      summary
    } = body;

    // ایجاد PDF جدید
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    
    // فونت‌ها
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = height - 50;

    // عنوان شرکت - وسط صفحه
    const companyText = 'Al Raya Used Auto Spare Trading LLC';
    const companyTextWidth = titleFont.widthOfTextAtSize(companyText, 16);
    const companyTextX = (width - companyTextWidth) / 2;
    
    page.drawText(companyText, {
      x: companyTextX,
      y: yPosition,
      size: 16,
      font: titleFont,
      color: rgb(0, 0, 0.8),
    });

    yPosition -= 40;

    // عنوان گزارش - وسط صفحه
    const reportTitle = 'COMPLETE FINANCIAL REPORT';
    const reportTitleWidth = boldFont.widthOfTextAtSize(reportTitle, 18);
    const reportTitleX = (width - reportTitleWidth) / 2;
    
    page.drawText(reportTitle, {
      x: reportTitleX,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0.8),
    });

    yPosition -= 60;

    // اطلاعات گزارش
    const infoX = 50;
    
    page.drawText(`Report Type: ${reportType.toUpperCase()}`, {
      x: infoX,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;
    page.drawText(`Time Range: ${timeRange}`, {
      x: infoX,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;
    page.drawText(`Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, {
      x: infoX,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    // خلاصه آمار
    yPosition -= 40;
    page.drawText('FINANCIAL SUMMARY', {
      x: infoX,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0.5),
    });

    yPosition -= 25;
    page.drawText(`Total Users: ${stats.totalUsers}`, {
      x: 70,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;
    page.drawText(`Total Containers: ${stats.totalContainers}`, {
      x: 70,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;
    page.drawText(`Total USA Cost: $${stats.totalUSACostUSD.toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.8, 0, 0),
    });

    yPosition -= 20;
    page.drawText(`Total UAE Sales: AED ${stats.totalUAESalesAED.toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0.6, 0),
    });

    yPosition -= 20;
    page.drawText(`Total Costs: AED ${stats.totalCostsAED.toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.8, 0, 0),
    });

    yPosition -= 20;
    page.drawText(`Total Benefits: AED ${stats.totalBenefitsAED.toLocaleString()}`, {
      x: 70,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: stats.totalBenefitsAED >= 0 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0),
    });

    // جدول Container Reports
    if (containerReports && containerReports.length > 0) {
      yPosition -= 40;
      page.drawText('CONTAINER FINANCIAL REPORTS', {
        x: infoX,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0.5),
      });

      // هدر جدول
      yPosition -= 25;
      page.drawText('Container', {
        x: 50,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText('USA Cost(USD)', {
        x: 150,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText('UAE Sales(AED)', {
        x: 250,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText('Benefits(AED)', {
        x: 350,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // خط جداکننده
      yPosition -= 5;
      page.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: 500, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      // داده‌های جدول
      containerReports.forEach((container: any, index: number) => {
        if (yPosition < 100) {
          // صفحه جدید اگر فضای کافی نباشد
          const newPage = pdfDoc.addPage([600, 800]);
          page = newPage;
          yPosition = height - 50;
          
          // اضافه کردن هدر برای صفحات جدید
          const companyTextWidth = titleFont.widthOfTextAtSize(companyText, 16);
          const companyTextX = (width - companyTextWidth) / 2;
          
          page.drawText(companyText, {
            x: companyTextX,
            y: height - 50,
            size: 16,
            font: titleFont,
            color: rgb(0, 0, 0.8),
          });

          const reportTitleWidth = boldFont.widthOfTextAtSize(reportTitle, 18);
          const reportTitleX = (width - reportTitleWidth) / 2;
          
          page.drawText(reportTitle, {
            x: reportTitleX,
            y: height - 90,
            size: 18,
            font: boldFont,
            color: rgb(0, 0, 0.8),
          });

          yPosition = height - 140;
        }

        yPosition -= 20;
        page.drawText(container.containerName.substring(0, 15), {
          x: 50,
          y: yPosition,
          size: 9,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`$${Math.round(container.usaCostUSD).toLocaleString()}`, {
          x: 150,
          y: yPosition,
          size: 9,
          font: font,
          color: rgb(0.8, 0, 0),
        });

        page.drawText(`AED ${Math.round(container.uaeSalesAED).toLocaleString()}`, {
          x: 250,
          y: yPosition,
          size: 9,
          font: font,
          color: rgb(0, 0.6, 0),
        });

        page.drawText(`AED ${Math.round(container.totalBenefitsAED).toLocaleString()}`, {
          x: 350,
          y: yPosition,
          size: 9,
          font: boldFont,
          color: container.totalBenefitsAED >= 0 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0),
        });
      });

      // خلاصه کل
      yPosition -= 30;
      page.drawText('TOTAL SUMMARY:', {
        x: 50,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;
      page.drawText(`Total Containers: ${containerReports.length}`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPosition -= 15;
      page.drawText(`Total USA Cost: $${stats.totalUSACostUSD.toLocaleString()}`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0.8, 0, 0),
      });

      yPosition -= 15;
      page.drawText(`Total UAE Sales: AED ${stats.totalUAESalesAED.toLocaleString()}`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0.6, 0),
      });

      yPosition -= 15;
      page.drawText(`Total Benefits: AED ${stats.totalBenefitsAED.toLocaleString()}`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: stats.totalBenefitsAED >= 0 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0),
      });
    }

    // اطلاعات ماهانه
    if (revenueData && revenueData.length > 0) {
      yPosition -= 40;
      page.drawText('MONTHLY REVENUE DATA', {
        x: 50,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0.5),
      });

      revenueData.forEach((month: any, index: number) => {
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([600, 800]);
          page = newPage;
          yPosition = height - 50;
          
          // اضافه کردن هدر برای صفحات جدید
          const companyTextWidth = titleFont.widthOfTextAtSize(companyText, 16);
          const companyTextX = (width - companyTextWidth) / 2;
          
          page.drawText(companyText, {
            x: companyTextX,
            y: height - 50,
            size: 16,
            font: titleFont,
            color: rgb(0, 0, 0.8),
          });

          const reportTitleWidth = boldFont.widthOfTextAtSize(reportTitle, 18);
          const reportTitleX = (width - reportTitleWidth) / 2;
          
          page.drawText(reportTitle, {
            x: reportTitleX,
            y: height - 90,
            size: 18,
            font: boldFont,
            color: rgb(0, 0, 0.8),
          });

          yPosition = height - 140;
        }

        yPosition -= 20;
        page.drawText(`${month.month}:`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Revenue: AED ${Math.round(month.revenue || 0).toLocaleString()}`, {
          x: 150,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0.6, 0),
        });

        page.drawText(`Profit: AED ${Math.round(month.profit || 0).toLocaleString()}`, {
          x: 300,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0, 0.8),
        });
      });
    }

    // پاورقی
    const finalPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    const footerText = 'Confidential - Auto-generated Financial Report - Al Raya Used Auto Spare Trading LLC';
    const footerTextWidth = font.widthOfTextAtSize(footerText, 9);
    const footerTextX = (width - footerTextWidth) / 2;
    
    finalPage.drawText(footerText, {
      x: footerTextX,
      y: 30,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="financial-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'PDF generation failed: ' + (error instanceof Error ? error.message : 'Unknown error') 
      },
      { status: 500 }
    );
  }
}

// برای backward compatibility با GET requests قدیمی
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'general';
    const range = searchParams.get('range') || 'year';
    
    // ایجاد یک PDF ساده برای GET requests
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // عنوان شرکت - وسط صفحه
    const companyText = 'Al Raya Used Auto Spare Trading LLC';
    const companyTextWidth = boldFont.widthOfTextAtSize(companyText, 16);
    const companyTextX = (width - companyTextWidth) / 2;
    
    page.drawText(companyText, {
      x: companyTextX,
      y: height - 50,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0.8),
    });

    // عنوان گزارش - وسط صفحه
    const reportTitle = 'COMPLETE FINANCIAL REPORT';
    const reportTitleWidth = boldFont.widthOfTextAtSize(reportTitle, 18);
    const reportTitleX = (width - reportTitleWidth) / 2;
    
    page.drawText(reportTitle, {
      x: reportTitleX,
      y: height - 90,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0.8),
    });

    page.drawText(`Report Type: ${type.toUpperCase()}`, {
      x: 50,
      y: height - 140,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Time Range: ${range}`, {
      x: 50,
      y: height - 160,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText('Please use POST method for complete data report', {
      x: 50,
      y: height - 200,
      size: 10,
      font: font,
      color: rgb(0.8, 0, 0),
    });

    // پاورقی وسط
    const footerText = 'Confidential - Auto-generated Financial Report - Al Raya Used Auto Spare Trading LLC';
    const footerTextWidth = font.widthOfTextAtSize(footerText, 9);
    const footerTextX = (width - footerTextWidth) / 2;
    
    page.drawText(footerText, {
      x: footerTextX,
      y: 30,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="financial-report-${type}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'PDF generation failed' },
      { status: 500 }
    );
  }
}