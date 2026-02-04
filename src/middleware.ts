/**
 * Middleware: Basic Auth for Admin Routes
 * ========================================
 * 
 * Protects all /admin/* routes with HTTP Basic Authentication.
 * Credentials: username="admin", password=ADMIN_PASSWORD env var
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Only protect /admin routes
    if (!request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new NextResponse('Authentication required', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Admin Area"',
            },
        });
    }

    // Decode credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    // Validate credentials
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error('ADMIN_PASSWORD environment variable not set');
        return new NextResponse('Server configuration error', { status: 500 });
    }

    if (username !== 'admin' || password !== adminPassword) {
        return new NextResponse('Invalid credentials', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Admin Area"',
            },
        });
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
