export type GetAccessTokenRequest = {
  authCode: string | null;
  clientId: string;
  clientSecret: string;
};

export type AccessTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
} | null;

export type RefreshAccessTokenRequest = {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
};

export type AuthenticateRedirect = {
  clientId: string;
  redirectUrl: string;
};

type EpisodeObject = {
  duration_ms: number;
  images: Array<{
    height: number;
    width: number;
    url: string;
  }>;
  show: {
    name: string;
    publisher: string;
  };
};

type TrackObject = {
  device: {
    volume_percent: number;
  };
  item: {
    album: {
      images: Array<{
        height: number;
        width: number;
        url: string;
      }>;
    };
    artists: Array<{
      name: string;
    }>;
    name: string;
    uri: string;
    duration_ms: number;
  };
  progress_ms: number;
  shuffle_state: boolean;
  repeat_state: 'off' | 'context' | 'track';
  is_playing: boolean;
};

export type IpcChannelGetCurrentPlayerData =
  | {
      trackType: 'track';
      data: TrackObject;
      error: string | null;
      status: number;
    }
  | {
      trackType: 'episode';
      data: EpisodeObject;
      error: string | null;
      status: number;
    }
  | { trackType: null; data: null; error: string | null; status: number };

export type IpcChannelSetVolume = {
  error: string | null;
  status: number;
};

export type IpcChannelSeekTo = IpcChannelSetVolume;
export type IpcChannelsSkipSong = IpcChannelSetVolume;
export type IpcChannelsShuffle = IpcChannelSetVolume;
export type IpcChannelsPlayPause = IpcChannelSetVolume;
export type IpcChannelsRepeat = IpcChannelSetVolume;

export type IpcChannels = {
  'get-current-player-data': () => Promise<IpcChannelGetCurrentPlayerData>;
  'set-volume': (percent: number) => Promise<IpcChannelSetVolume>;
  'seek-to': (ms: number) => Promise<IpcChannelSeekTo>;
  skip: (direction: 'forward' | 'backward') => Promise<IpcChannelsSkipSong>;
  shuffle: (state: boolean) => Promise<IpcChannelsShuffle>;
  'play-pause': (
    state: boolean,
    currentMs: number
  ) => Promise<IpcChannelsPlayPause>;
  repeat: (state: 'off' | 'context' | 'track') => Promise<IpcChannelsRepeat>;
};

declare global {
  interface Window {
    electron: {
      onAuthSuccess: (callback: () => void) => () => void;
      invoke<T extends keyof IpcChannels>(
        channel: T,
        ...args: Parameters<IpcChannels[T]>
      ): ReturnType<IpcChannels[T]>;
    };
  }
}
