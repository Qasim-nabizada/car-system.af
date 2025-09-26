// app/api/reports/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'general';
    const range = searchParams.get('range') || 'year';
    const containerId = searchParams.get('containerId');
    const vendorId = searchParams.get('vendorId');

    // ایجاد PDF جدید
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    
    // استفاده از فونت‌های استاندارد که در pdf-lib تعبیه شده‌اند
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // عنوان اصلی
    page.drawText('FINANCIAL REPORT', {
      x: 50,
      y: height - 50,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // اطلاعات گزارش
    let yPosition = height - 100;
    
    page.drawText(`Report Type: ${type.toUpperCase()}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 30;
    page.drawText(`Time Range: ${range}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 30;
    page.drawText(`Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    // اطلاعات اختیاری
    if (containerId) {
      yPosition -= 30;
      page.drawText(`Container ID: ${containerId}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    if (vendorId) {
      yPosition -= 30;
      page.drawText(`Vendor ID: ${vendorId}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // خلاصه مالی
    yPosition -= 60;
    page.drawText('FINANCIAL SUMMARY', {
      x: 50,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0.5),
    });

    yPosition -= 30;
    page.drawText('• Total Sales: AED 1,250,000', {
      x: 70,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0, 0.5, 0),
    });

    yPosition -= 25;
    page.drawText('• Total Expenses: AED 850,000', {
      x: 70,
      y: yPosition,
      size: 12,
      font: font,
      color: rgb(0.8, 0, 0),
    });

    yPosition -= 25;
    page.drawText('• Net Profit: AED 400,000', {
      x: 70,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0.8),
    });

    // پاورقی
    page.drawText('Confidential - For Internal Use Only', {
      x: 50,
      y: 30,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="financial-report-${type}-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: 'PDF generation failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}