// src/app/usa/purchase/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import USAPurchaseClient from './USAPurchaseClient';

export default async function USAPurchasePage() {
  const session = await getServerSession(authOptions);
  
  // فقط اگر کاربر لاگین نکرده باشد به login هدایت شود
  if (!session) {
    redirect('/login');
  }

  // مدیران و کاربران عادی هر دو می‌توانند وارد صفحه purchase شوند
  // حذف شرط ریدایرکت برای مدیران
  console.log('🎯 USAPurchasePage - User:', session.user.name, 'Role:', session.user.role);
  
  return <USAPurchaseClient session={session} />;
}