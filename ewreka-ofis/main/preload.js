'use strict';
// Ewreka Ofis — güvenli köprü (renderer <-> main)
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const listeners = new Set();
ipcRenderer.on('ewreka:command', (_e, cmd) => { for (const fn of listeners) { try { fn(cmd); } catch (err) { console.error(err); } } });

let platform = 'unknown';
try { const a = (process.argv || []).find(x => x.startsWith('--ewreka-platform=')); if (a) platform = a.split('=')[1]; } catch (_) {}

contextBridge.exposeInMainWorld('ewreka', {
  isDesktop: true,
  platform,
  info: () => ipcRenderer.invoke('ewreka:info'),
  getLaunchFile: () => ipcRenderer.invoke('ewreka:launch-file'),
  openDialog: (opts) => ipcRenderer.invoke('ewreka:open-dialog', opts || {}),
  openInApp: (opts) => ipcRenderer.invoke('ewreka:open-in-app', opts || {}),
  readFile: (p) => ipcRenderer.invoke('ewreka:read-file', p),
  save: (opts) => ipcRenderer.invoke('ewreka:save', opts),
  setState: (s) => ipcRenderer.send('ewreka:set-state', s),
  closeWindow: () => ipcRenderer.send('ewreka:close-window'),
  openWindow: (module, path) => ipcRenderer.invoke('ewreka:open-window', { module, path }),
  recent: () => ipcRenderer.invoke('ewreka:recent'),
  removeRecent: (p) => ipcRenderer.invoke('ewreka:recent-remove', p),
  openExternal: (url) => ipcRenderer.invoke('ewreka:open-external', url),
  showInFolder: (p) => ipcRenderer.invoke('ewreka:show-in-folder', p),
  confirm: (o) => ipcRenderer.invoke('ewreka:confirm', o),
  printToPDF: (o) => ipcRenderer.invoke('ewreka:print-to-pdf', o || {}),
  getPathForFile: (f) => { try { return webUtils.getPathForFile(f) || null; } catch (_) { return null; } },
  onCommand: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
});
