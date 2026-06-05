import { NextResponse, type NextRequest } from 'next/server'

// Auth is handled client-side. Middleware just passes all requests through.
export async function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/dashboard/:path*'],
}
