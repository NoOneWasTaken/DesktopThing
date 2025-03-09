import { BrowserWindow } from 'electron';
import path from 'node:path';

export const createFrameWindow = (
  width: number,
  appPath: string
): BrowserWindow => {
  return new BrowserWindow({
    width: 360,
    height: 120,
    x: width - 360 - 40,
    y: 40,
    autoHideMenuBar: true,
    movable: true,
    title: 'DesktopThing',
    icon: path.join(appPath, 'assets/windows/icon.ico'),
    closable: false,
    frame: false,
    titleBarStyle: 'hidden',
    hasShadow: false,
    backgroundColor: '#101010',
    titleBarOverlay: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(appPath, 'dist_desktop/preload.cjs'),
      webSecurity: true,
      plugins: true
    },
  });
};
