const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  plataforma: process.platform
});
