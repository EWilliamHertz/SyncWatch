import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const shows = await prisma.trackedShow.findMany({
      where: { type: { not: 'Movie' } }
    });

    let updatedCount = 0;
    const failedShows: string[] = [];

    for (const show of shows) {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${show.tmdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
        
        if (!res.ok) {
          failedShows.push(`${show.title} (Fetch Failed)`);
          continue; 
        }
        
        const details = await res.json();
        
        let remaining = show.episodesWatched;
        let cSeason = 1;
        let cEpisode = remaining;

        // Do the math to convert total watched into S:E
        if (details.seasons) {
          const validSeasons = details.seasons
            .filter((s: any) => s.season_number > 0)
            .sort((a: any, b: any) => a.season_number - b.season_number);
            
          for (const season of validSeasons) {
            if (remaining > season.episode_count && season.episode_count > 0) {
              remaining -= season.episode_count;
              cSeason = season.season_number + 1;
              cEpisode = remaining;
            } else {
              cSeason = season.season_number;
              cEpisode = remaining;
              break;
            }
          }
        }

        await prisma.trackedShow.update({
          where: { id: show.id },
          data: { 
            currentSeason: cSeason, 
            currentEpisode: cEpisode 
          }
        });
        
        updatedCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Be nice to TMDB
        
      } catch (innerError) {
        failedShows.push(`${show.title} (Crash)`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Math complete! Successfully fixed ${updatedCount} shows.`,
      failed: failedShows
    });

  } catch (error) {
    return NextResponse.json({ error: "Migration crashed completely." }, { status: 500 });
  }
}