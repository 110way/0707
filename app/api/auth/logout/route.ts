import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ data: { success: true } });
    
    // Clear the wb_token cookie
    response.cookies.set('wb_token', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
