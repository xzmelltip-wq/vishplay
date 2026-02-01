-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  video_url TEXT DEFAULT '',
  is_playing BOOLEAN DEFAULT false,
  playback_time DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_users table for presence
CREATE TABLE IF NOT EXISTS public.room_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_users ENABLE ROW LEVEL SECURITY;

-- Rooms policies - allow anyone to read and write (public rooms)
CREATE POLICY "Anyone can view rooms" ON public.rooms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create rooms" ON public.rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update rooms" ON public.rooms
  FOR UPDATE USING (true);

-- Room users policies
CREATE POLICY "Anyone can view room users" ON public.room_users
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join rooms" ON public.room_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can leave rooms" ON public.room_users
  FOR DELETE USING (true);

CREATE POLICY "Anyone can update their presence" ON public.room_users
  FOR UPDATE USING (true);

-- Enable realtime for rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_users;
