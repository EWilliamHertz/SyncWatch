import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Helper to get the logged-in user from the database
async function getUser() {
  // Pass authOptions so NextAuth knows how to decrypt the cookie!
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Fetch shows they have accepted
  const activeDbShows = await prisma.trackedShow.findMany({
    where: { coWatchers: { some: { id: user.id } } },
    include: { coWatchers: { select: { username: true } }, pendingUsers: { select: { username: true } } },
    orderBy: { updatedAt: 'desc' }
  });

  // 2. Fetch shows they have been invited to
  const pendingDbInvites = await prisma.trackedShow.findMany({
    where: { pendingUsers: { some: { id: user.id } } },
    include: { coWatchers: { select: { username: true } } }
  });

  // Format the data perfectly for the frontend UI
  const activeShows = activeDbShows.map(show => ({
    ...show,
    coWatchers: show.coWatchers.map(u => u.username),
    pendingWatchers: show.pendingUsers.map(u => u.username)
  }));

  const pendingInvites = pendingDbInvites.map(show => ({
    id: show.id,
    showTitle: show.title,
    showPoster: show.poster,
    type: show.type,
    year: show.year, // Added year
    totalEpisodes: show.totalEpisodes,
    runtime: show.runtime,
    sender: show.coWatchers[0]?.username || "A friend"
  }));

  return NextResponse.json({ activeShows, pendingInvites });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  
  const show = await prisma.trackedShow.create({
    data: {
      tmdbId: data.tmdbId,
      title: data.title,
      type: data.type,
      poster: data.poster,
      year: data.year, // Save year to database
      status: data.status,
      currentSeason: data.currentSeason,
      episodesWatched: data.episodesWatched,
      totalEpisodes: data.totalEpisodes,
      runtime: data.runtime,
      coWatchers: { connect: [{ id: user.id }] }, // The creator automatically joins
      pendingUsers: { connect: data.invitedUserIds.map((id: string) => ({ id })) } // Friends get an invite
    }
  });

  return NextResponse.json(show);
}

export async function PUT(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { showId, action, status, episodesWatched } = await req.json();

  if (action === 'increment') {
    await prisma.trackedShow.update({ where: { id: showId }, data: { episodesWatched: { increment: 1 } } });
  } else if (action === 'accept') {
    await prisma.trackedShow.update({
      where: { id: showId },
      data: { pendingUsers: { disconnect: [{ id: user.id }] }, coWatchers: { connect: [{ id: user.id }] } }
    });
  } else if (action === 'reject') {
    await prisma.trackedShow.update({
      where: { id: showId },
      data: { pendingUsers: { disconnect: [{ id: user.id }] } }
    });
  } else if (action === 'edit') {
    await prisma.trackedShow.update({
      where: { id: showId },
      data: { status, episodesWatched }
    });
  } else if (action === 'delete') {
    await prisma.trackedShow.delete({ where: { id: showId } });
  }

  return NextResponse.json({ success: true });
}