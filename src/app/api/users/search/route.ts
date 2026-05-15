import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      },
      // We only return id and username so we don't leak passwords/emails!
      select: { id: true, username: true },
      take: 5 
    });
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}