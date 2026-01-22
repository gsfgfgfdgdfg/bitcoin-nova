import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  source: string;
  category: string;
  image_url: string | null;
  external_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export const useArticles = (category?: string) => {
  return useQuery({
    queryKey: ['articles', category],
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false });

      if (category && category !== 'latest') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Article[];
    },
  });
};

export const useArticle = (id: string) => {
  return useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data as Article;
    },
    enabled: !!id,
  });
};
