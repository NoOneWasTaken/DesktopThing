module.exports = {
  appId: 'com.no0ne.desktop-thing',
  productName: 'DesktopThing',
  directories: {
    output: 'release-builds',
  },
  files: [
    'dist_desktop/**',
    'dist_ui/**',
    'assets/**',
    'dist_desktop/preload.cjs',
  ],
  mac: {
    target: 'dmg',
    icon: 'assets/mac/icon.icns',
  },
  linux: {
    target: 'AppImage',
    category: 'Utility',
    icon: 'assets/linux/icon.png',
  },
  win: {
    target: ['msi', 'portable'],
    icon: 'assets/windows/icon.ico',
  },
};
