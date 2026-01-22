-- Allow public read access to Muzyczki bucket for listing files
CREATE POLICY "Allow public read access to Muzyczki bucket" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'Muzyczki');