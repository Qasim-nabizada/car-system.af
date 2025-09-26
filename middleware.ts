// src/middleware.ts (ایجاد کن اگر نیست)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('x-vercel-cache', 'no-cache')
  }
  return response
}

export const config = {
  matcher: '/api/:path*',
}