import {
  app,
  screen,
  ipcMain,
  session,
  shell,
  BrowserWindow,
  globalShortcut,
} from 'electron';
import dotenv from 'dotenv';
import axios from 'axios';
import Store from 'electron-store';
import * as path from 'node:path';

import { createFrameWindow } from './helpers/framewindow.js';
import {
  IpcChannelGetCurrentPlayerData,
  IpcChannelsPlayPause,
  IpcChannelsRepeat,
  IpcChannelSeekTo,
  IpcChannelSetVolume,
  IpcChannelsShuffle,
  IpcChannelsSkipSong,
} from '../../types.js';

dotenv.config({
  path: path.join(app.getAppPath(), './src/electron/electron-builder.env'),
});
const store = new Store();

let mainWindow: BrowserWindow | null = null;
// let refreshInterval: NodeJS.Timeout | null = null;
let isWindowDraggable: boolean = false;

async function setupTokenRefresh() {
  const refreshToken = store.get('refresh_token') as string | undefined;
  const expiresAt = store.get('expires_in') as number | undefined;

  if (!refreshToken || !expiresAt) return;

  const timeLeft = expiresAt - Date.now();

  if (timeLeft <= 0) {
    console.log('Token expired. Refreshing...');
    await refreshAccessAndSchedule();
  } else {
    console.log('Token expires in', timeLeft / 1000 / 60, 'minutes.');
    setTimeout(refreshAccessAndSchedule, timeLeft);
  }
}

async function refreshAccessAndSchedule() {
  const refreshToken = store.get('refresh_token') as string | undefined;
  if (!refreshToken) return;

  // const tokens = await refreshAccessToken({
  //   refreshToken,
  //   clientId,
  //   clientSecret,
  // });
  // if (tokens) {
  //   store.set('access_token', tokens.access_token);
  //   store.set('expires_in', Date.now() + tokens.expires_in * 1000);
  //
  //   if (refreshInterval) clearInterval(refreshInterval);
  //   refreshInterval = setInterval(refreshAccessAndSchedule, 59 * 60 * 1000);
  //
  //   console.log('Token refreshed.');
  //   mainWindow?.webContents.send('auth-success');
  // } else {
  //   console.error('Token refresh failed.');
  // }
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('displaything', process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient('displaything');
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', async (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith('displaything://'));
    if (url) {
      const eventUrl = new URL(url);
      const accessToken = eventUrl.searchParams.get('access_token');
      const refreshToken = eventUrl.searchParams.get('refresh_token');
      const expiresIn = eventUrl.searchParams.get('expires_in');
      const userId = eventUrl.searchParams.get('user_id');

      if (accessToken && refreshToken && expiresIn && userId) {
        store.set('access_token', accessToken);
        store.set('refresh_token', refreshToken);
        store.set('expires_in', Number(expiresIn));
        store.set('user_id', userId);

        mainWindow?.webContents.send('auth-success');
      }
    }

    if (mainWindow) {
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    mainWindow = createFrameWindow(width, app.getAppPath());

    mainWindow.setResizable(false);
    mainWindow.setAlwaysOnTop(true, 'floating', 100);

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; https://i.scdn.co;" +
              "script-src 'self' 'unsafe-inline' https://*.spotify.com https://sdk.scdn.co/spotify-player.js;" +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
              "font-src 'self' https://fonts.gstatic.com;" +
              "media-src 'self' blob:;" +
              "connect-src 'self' wss://*.spotify.com https://*.spotify.com https://*.spotifycdn.com https://*.scdn.co;" +
              "frame-src 'self' https://*.spotify.com https://sdk.scdn.co;" +
              "img-src 'self' data: https://*.spotify.com https://*.scdn.co https://*.spotifycdn.com;",
          ],
        },
      });
    });

    mainWindow.on('blur', () => {
      if (mainWindow && mainWindow.isMinimized()) {
        mainWindow.restore();
      }
    });

    globalShortcut.register('Alt+P', async () => {
      if (mainWindow) {
        if (isWindowDraggable) {
          await mainWindow.webContents.insertCSS(`
          html {
            -webkit-app-region: drag;
          }
          
          .lucide-pin-off {
            display: block !important;
          }
          
          .lucide-pin {
            display: none;
          }
        `);

          isWindowDraggable = false;
        } else {
          await mainWindow.webContents.insertCSS(`
          html {
            -webkit-app-region: no-drag;
          }
          
          .lucide-pin-off {
            display: none !important;
          }
          
          .lucide-pin {
            display: block;
          }
        `);

          isWindowDraggable = true;
        }
      }
    });

    await mainWindow.loadFile(
      path.join(app.getAppPath(), './dist_ui/index.html')
    );

    if (!store.get('access_token')) {
      console.log('No access token found. Starting authentication...');
      await shell.openExternal(
        'http://localhost:8080/api/spotify-authenticate'
      );
    } else {
      await setupTokenRefresh();
      mainWindow.webContents.send('auth-success');
    }
  });
}

ipcMain.handle(
  'set-volume',
  async (_event, percent: number): Promise<IpcChannelSetVolume> => {
    const accessToken = store.get('access_token') as string | undefined;
    if (!accessToken) {
      return {
        error: 'Failed to log in!',
        status: 401,
      };
    }

    try {
      const response = await axios.put(
        `https://api.spotify.com/v1/me/player/volume?volume_percent=${percent}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 204) {
        return {
          error: null,
          status: 204,
        };
      } else {
        return {
          error: 'Unexpected response from Spotify API.',
          status: 500,
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.data);
          return {
            error: error.response.data.error.message,
            status: error.response.status,
          };
        }
      }

      console.error(error);
      return {
        error: 'An error occurred while setting volume.',
        status: 500,
      };
    }
  }
);

ipcMain.handle(
  'seek-to',
  async (_event, ms: number): Promise<IpcChannelSeekTo> => {
    const accessToken = store.get('access_token') as string | undefined;
    if (!accessToken) {
      return {
        error: 'Failed to log in!',
        status: 401,
      };
    }

    try {
      const response = await axios.put(
        `https://api.spotify.com/v1/me/player/seek?position_ms=${ms}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 204 || response.status === 200) {
        return {
          error: null,
          status: 204,
        };
      } else {
        return {
          error: 'Unexpected response from Spotify API.',
          status: 500,
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.data);
          return {
            error: error.response.data.error.message,
            status: error.response.status,
          };
        }
      }

      console.error(error);
      return {
        error: 'An error occurred while seeking.',
        status: 500,
      };
    }
  }
);

ipcMain.handle(
  'get-current-player-data',
  async (): Promise<IpcChannelGetCurrentPlayerData> => {
    try {
      const accessToken = store.get('access_token') as string | undefined;
      if (!accessToken) {
        return {
          error: 'Failed to log in!',
          data: null,
          trackType: null,
          status: 401,
        };
      }

      const response = await axios.get('https://api.spotify.com/v1/me/player', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        return {
          error: 'No available playback found.',
          data: null,
          trackType: null,
          status: 204,
        };
      }

      if (response.data) {
        if (response.data?.currently_playing_type === 'track') {
          return {
            trackType: 'track',
            data: response.data,
            error: null,
            status: 200,
          };
        } else if (response.data?.currently_playing_type === 'episode') {
          return {
            trackType: 'episode',
            data: response.data,
            error: null,
            status: 200,
          };
        }
      }

      return {
        error: 'Unexpected response from Spotify API.',
        data: null,
        trackType: null,
        status: 500,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.data);
          return {
            error: error.response.data.error.message,
            data: null,
            trackType: null,
            status: error.response.status,
          };
        }
      }

      console.error(error);
      return {
        error: 'An error occurred while fetching current player data.',
        data: null,
        trackType: null,
        status: 500,
      };
    }
  }
);

ipcMain.handle(
  'skip',
  async (
    _event,
    direction: 'forward' | 'backward'
  ): Promise<IpcChannelsSkipSong> => {
    const accessToken = store.get('access_token') as string | undefined;
    if (!accessToken) {
      return {
        error: 'Failed to log in!',
        status: 401,
      };
    }

    try {
      const response = await axios.post(
        `https://api.spotify.com/v1/me/player/${direction === 'forward' ? 'next' : 'previous'}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 204 || response.status === 200) {
        return {
          error: null,
          status: 204,
        };
      } else {
        return {
          error: 'Unexpected response from Spotify API.',
          status: 500,
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.data);
          return {
            error: error.response.data.error.message,
            status: error.response.status,
          };
        }
      }

      console.error(error);
      return {
        error: 'An error occurred while skipping.',
        status: 500,
      };
    }
  }
);

ipcMain.handle(
  'shuffle',
  async (_event, state: boolean): Promise<IpcChannelsShuffle> => {
    const accessToken = store.get('access_token') as string | undefined;
    if (!accessToken) {
      return {
        error: 'Failed to log in!',
        status: 401,
      };
    }

    try {
      const response = await axios.put(
        `https://api.spotify.com/v1/me/player/shuffle?state=${state}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 204 || response.status === 200) {
        return {
          error: null,
          status: 204,
        };
      } else {
        return {
          error: 'Unexpected response from Spotify API.',
          status: 500,
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.data);
          return {
            error: error.response.data.error.message,
            status: error.response.status,
          };
        }
      }

      console.error(error);
      return {
        error: 'An error occurred while shuffling.',
        status: 500,
      };
    }
  }
);

ipcMain.handle(
  'play-pause',
  async (
    _event,
    state: boolean,
    currentMs: number
  ): Promise<IpcChannelsPlayPause> => {
    const accessToken = store.get('access_token') as string | undefined;
    if (!accessToken) {
      return {
        error: 'Failed to log in!',
        status: 401,
      };
    }

    try {
      const response = await axios.put(
        `https://api.spotify.com/v1/me/player/${state ? 'play' : 'pause'}`,
        {
          position_ms: currentMs,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 204 || response.status === 200) {
        return {
          error: null,
          status: 204,
        };
      } else {
        return {
          error: 'Unexpected response from Spotify API.',
          status: 500,
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.data);
          return {
            error: error.response.data.error.message,
            status: error.response.status,
          };
        }
      }

      console.error(error);
      return {
        error: 'An error occurred while toggling playback.',
        status: 500,
      };
    }
  }
);

ipcMain.handle(
  'repeat',
  async (
    _event,
    state: 'off' | 'context' | 'track'
  ): Promise<IpcChannelsRepeat> => {
    const accessToken = store.get('access_token') as string | undefined;
    if (!accessToken) {
      return {
        error: 'Failed to log in!',
        status: 401,
      };
    }

    try {
      const response = await axios.put(
        `https://api.spotify.com/v1/me/player/repeat?state=${state}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 204 || response.status === 200) {
        return {
          error: null,
          status: 204,
        };
      } else {
        return {
          error: 'Unexpected response from Spotify API.',
          status: 500,
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Error response:', error.response.data);
          return {
            error: error.response.data.error.message,
            status: error.response.status,
          };
        }
      }

      console.error(error);
      return {
        error: 'An error occurred while setting repeat state.',
        status: 500,
      };
    }
  }
);
