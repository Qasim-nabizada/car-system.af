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

  // اگر مدیر است به dashboard هدایت شود
  if (session.user.role === 'manager') {
    redirect('/dashboard');
  }

  // فقط کاربران معمولی می‌توانند بمانند
  return <USAPurchaseClient session={session} />;
}