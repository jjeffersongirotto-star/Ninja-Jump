// Characters (skins): same sprite, different palette. `price` in coins (0 = owned from the start).
const SKINS = [
  { id: 'white', name: 'Ninja Branco', price: 0,
    out: '#1b1b26', rim: 'rgba(160,215,255,0.95)',
    body: ['#ffffff', '#e9edf3', '#a4adbf'], head: ['#ffffff', '#eef1f6', '#bfc6d4', '#939cb0'],
    limb: '#f4f5f8', limbBack: '#d9dce4', foot: '#e3e6ee', footBack: '#cfd3dc', hand: '#e3e6ee',
    limbShade: 'rgba(110,120,150,0.45)', limbHi: 'rgba(255,255,255,0.85)', spec: 'rgba(255,255,255,0.95)',
    band: '#15151c', bandGrad: ['#3d4052', '#17171f', '#07070b'], visor: ['#363c55', '#0e1018'], eye: '#ffffff',
    occl: 'rgba(40,45,75,0.2)' },
  { id: 'black', name: 'Ninja Sombra', price: 500,
    out: '#05050a', rim: 'rgba(150,170,220,0.75)',
    body: ['#6b7080', '#383b46', '#17181e'], head: ['#737888', '#454956', '#272a33', '#141519'],
    limb: '#3c3f4a', limbBack: '#2b2d36', foot: '#34363f', footBack: '#25272f', hand: '#3c3f4a',
    limbShade: 'rgba(0,0,0,0.45)', limbHi: 'rgba(255,255,255,0.3)', spec: 'rgba(255,255,255,0.5)',
    band: '#0a0a0e', bandGrad: ['#4a4d5c', '#1c1d24', '#050507'], visor: ['#7c86a3', '#3a4157'], eye: '#ffffff',
    occl: 'rgba(0,0,0,0.3)' },
  { id: 'red', name: 'Ninja Rubro', price: 500,
    out: '#1a0a0c', rim: 'rgba(255,190,170,0.9)',
    body: ['#ff9a90', '#e3282e', '#8c0f15'], head: ['#ffa69d', '#ea3a40', '#b81c23', '#7a0b11'],
    limb: '#2c2c35', limbBack: '#202028', foot: '#26262e', footBack: '#1b1b22', hand: '#2c2c35',
    limbShade: 'rgba(0,0,0,0.45)', limbHi: 'rgba(255,255,255,0.32)', spec: 'rgba(255,255,255,0.85)',
    band: '#111116', bandGrad: ['#3d4052', '#17171f', '#07070b'], visor: ['#363c55', '#0e1018'], eye: '#ffffff',
    occl: 'rgba(60,0,0,0.25)' }
];
let skin = SKINS[0];
