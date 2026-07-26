import { $, $$, loadPrefs, savePrefs, getSound, setSound, clickTone, closeModal, toast } from './core.js';
import { GomokuGame } from './gomoku.js';
import { BombGame } from './bomb.js';
import { LudoGame } from './ludo.js';

const prefs=loadPrefs();
const persistSection=(key,value)=>{prefs[key]=value;prefs.soundEnabled=getSound();savePrefs(prefs);};
const games={
  gomoku:new GomokuGame(prefs.gomoku,v=>persistSection('gomoku',v)),
  bomb:new BombGame(prefs.bomb,v=>persistSection('bomb',v)),
  ludo:new LudoGame(prefs.ludo,v=>persistSection('ludo',v))
};
let current='lobby';
const screens={lobby:$('#lobbyScreen'),gomoku:$('#gomokuScreen'),bomb:$('#bombScreen'),ludo:$('#ludoScreen')};

function show(name){
  Object.values(screens).forEach(s=>s.classList.remove('active'));
  screens[name].classList.add('active');current=name;
  document.body.classList.toggle('game-open',name!=='lobby');
  window.scrollTo(0,0);clickTone();
  if(name!=='lobby')games[name].show();
}
$$('[data-open-game]').forEach(btn=>btn.addEventListener('click',()=>show(btn.dataset.openGame)));
$$('[data-back]').forEach(btn=>btn.addEventListener('click',()=>show('lobby')));

const soundBtn=$('#soundBtn');
function syncSound(){soundBtn.textContent=getSound()?'🔊':'🔇';soundBtn.setAttribute('aria-pressed',String(!getSound()));}
syncSound();
soundBtn.addEventListener('click',()=>{setSound(!getSound());prefs.soundEnabled=getSound();savePrefs(prefs);syncSound();if(getSound())clickTone();});

$('#modalClose').addEventListener('click',closeModal);
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#modal').classList.contains('show'))closeModal();else if(current!=='lobby')show('lobby');}});

$$('[data-fullscreen]').forEach(button=>button.addEventListener('click',async()=>{
  try{
    if(!document.fullscreenElement){const fn=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;if(fn)await fn.call(document.documentElement);else toast('Safari 请使用“添加到主屏幕”获得沉浸全屏');}
    else{const fn=document.exitFullscreen||document.webkitExitFullscreen;if(fn)await fn.call(document);}
  }catch{toast('浏览器限制了系统全屏，当前仍为最大化棋盘');}
}));

if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js?v=3.2.0').catch(()=>{}));}
