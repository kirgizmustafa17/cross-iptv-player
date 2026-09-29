export type MainTab = 'live' | 'movies' | 'series';

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface XtreamUserInfo {
  username: string;
  password?: string;
  message?: string;
  auth?: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  max_connections: string;
  allowed_output_formats: string[];
}

export interface XtreamServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  timezone: string;
  panel?: string;
  version?: string;
}

export interface XtreamAuthResponse {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id?: number;
  is_adult?: number;
  stream_count?: number;
}

export interface LiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  category_id: string;
  added?: string;
  custom_sid?: string;
}

export interface MovieItem {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating?: string;
  rating_5based?: number;
  added?: string;
  container_extension: string;
  category_id: string;
}

export interface SeriesItem {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating?: string;
  rating_5based?: number;
  backdrop_path?: string[];
  category_id: string;
}

export interface EpisodeItem {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  season: number;
  info?: {
    plot?: string;
    duration_secs?: number;
    duration?: string;
    movie_image?: string;
  };
}

export interface SeriesInfoResponse {
  seasons?: Array<{
    season_number: number;
    name: string;
    episode_count: number;
  }>;
  info?: {
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    backdrop_path?: string[];
  };
  episodes: Record<string, EpisodeItem[]>;
}

export interface PlayableMedia {
  id: string | number;
  title: string;
  type: 'live' | 'movie' | 'series';
  streamUrl: string;
  streamType: 'hls' | 'mp4';
  poster?: string;
  subTitle?: string;
}

export type FocusSection = 'header' | 'sidebar' | 'content' | 'player' | 'modal';
