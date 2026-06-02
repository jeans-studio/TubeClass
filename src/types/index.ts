export interface MainCategory {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
  sub_categories?: SubCategory[]
}

export interface SubCategory {
  id: string
  main_category_id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
  playlists?: Playlist[]
  videos?: Video[]
  main_category?: MainCategory
}

export interface Playlist {
  id: string
  sub_category_id: string
  name: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
  videos?: Video[]
  sub_category?: SubCategory
}

export interface Video {
  id: string
  sub_category_id: string
  playlist_id: string | null
  title: string
  description: string | null
  youtube_url: string
  youtube_id: string
  thumbnail_url: string | null
  duration: string | null
  youtube_published_at: string | null
  youtube_channel_name: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
  playlist?: Playlist
  sub_category?: SubCategory
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface WatchHistory {
  id: string
  user_id: string
  video_id: string
  watched_at: string
  video?: Video
}

export interface VideoProgress {
  id: string
  user_id: string
  video_id: string
  status: 'learning' | 'completed'
  updated_at: string
}
