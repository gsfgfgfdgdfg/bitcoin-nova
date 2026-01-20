import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  url: string;
  thumbnail?: string;
}

const parseFileName = (fileName: string): { title: string; artist: string } => {
  // Remove .mp3 extension and version numbers like (1), (2), etc.
  const cleanName = fileName
    .replace(/\.mp3$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
  
  return {
    title: cleanName,
    artist: 'Bitcoin Nasza Siła'
  };
};

export const useMusicFromStorage = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: files, error: listError } = await supabase
          .storage
          .from('Muzyczki')
          .list('', {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (listError) {
          throw listError;
        }

        if (!files || files.length === 0) {
          setTracks([]);
          return;
        }

        // Filter only mp3 files and create track objects
        const mp3Files = files.filter(file => file.name.toLowerCase().endsWith('.mp3'));
        
        const trackList: Track[] = mp3Files.map((file, index) => {
          const { title, artist } = parseFileName(file.name);
          const { data: urlData } = supabase
            .storage
            .from('Muzyczki')
            .getPublicUrl(file.name);

          return {
            id: `track-${index + 1}`,
            title,
            artist,
            duration: '3:30', // Placeholder - would need audio metadata parsing
            url: urlData.publicUrl,
            thumbnail: ''
          };
        });

        // Remove duplicates based on title
        const uniqueTracks = trackList.reduce((acc, track) => {
          const exists = acc.find(t => t.title === track.title);
          if (!exists) {
            acc.push(track);
          }
          return acc;
        }, [] as Track[]);

        setTracks(uniqueTracks);
      } catch (err) {
        console.error('Error fetching tracks from storage:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować muzyki');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, []);

  return { tracks, isLoading, error };
};
