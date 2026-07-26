import { $, sleep, pick, shuffle, toast, openModal, closeModal, bindTypeLevel, difficultyOptions, typeOptions, playerTypeLabel, clickTone, moveTone, boomTone, winTone, setThinking } from './core.js';

const N=9, TREASURE=[4,4], THEMES=['cyber','forest','candy'];
const key=(x,y)=>`${x},${y}`;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export class BombGame{
  constructor(prefs,onPrefs){
    this.onPrefs=onPrefs;
    this.config={theme:'cyber',players:[{name:'红方',type:'human',level:1},{name:'蓝方',type:'cpu',level:3}],...(prefs||{})};
    if(!Array.isArray(this.config.players))this.config.players=[{name:'红方',type:'human',level:1},{name:'蓝方',type:'cpu',level:3}];
    this.generation=0;this.boardEl=$('#bombBoard');this.frame=$('#bombFrame');this.bind();this.restart();
  }
  bind(){
    this.boardEl.addEventListener('click',e=>{const cell=e.target.closest('.bomb-cell');if(!cell||this.over||this.thinking||this.currentPlayer().type==='cpu')return;this.move(Number(cell.dataset.x),Number(cell.dataset.y));});
    $('#bScan').addEventListener('click',()=>this.scan());
    $('#bRestart').addEventListener('click',()=>this.restart());
    $('#bTheme').addEventListener('click',()=>{const i=THEMES.indexOf(this.config.theme);this.config.theme=THEMES[(i+1)%THEMES.length];this.frame.dataset.theme=this.config.theme;this.persist();});
    $('#bSettings').addEventListener('click',()=>this.openSettings());
  }
  persist(){this.onPrefs?.(this.config)}
  currentPlayer(){return this.config.players[this.turn]}
  show(){this.render();this.maybeCpuTurn()}

  restart(){
    const generation=++this.generation,initialTurn=0;this.turn=0;this.over=false;this.thinking=false;this.positions=[[0,0],[8,8]];this.lives=[3,3];this.scans=[1,1];this.revealed=new Set([key(0,0),key(8,8),key(...TREASURE)]);this.exploded=new Set();this.visited=[new Set([key(0,0)]),new Set([key(8,8)])];this.generateMap();this.frame.dataset.theme=this.config.theme;setThinking('bombThinking',false);this.render();setTimeout(()=>{if(generation===this.generation&&initialTurn===this.turn&&!this.over)this.maybeCpuTurn();},220);
  }

  randomSafePath(start){
    let [x,y]=start;const result=new Set([key(x,y)]);let guard=0;
    while((x!==4||y!==4)&&guard++<80){
      const choices=[];
      if(x<4)choices.push([x+1,y]);if(x>4)choices.push([x-1,y]);if(y<4)choices.push([x,y+1]);if(y>4)choices.push([x,y-1]);
      if(Math.random()<.28){const side=shuffle(DIRS).map(([dx,dy])=>[x+dx,y+dy]).find(([nx,ny])=>nx>=0&&ny>=0&&nx<N&&ny<N&&Math.abs(nx-4)+Math.abs(ny-4)<=Math.abs(x-4)+Math.abs(y-4)+1);if(side)choices.push(side);}
      [x,y]=pick(choices);result.add(key(x,y));
    }
    return result;
  }
  hasSafePath(start,bombs){
    const queue=[start],seen=new Set([key(...start)]);
    while(queue.length){const [x,y]=queue.shift();if(x===4&&y===4)return true;for(const[dx,dy]of DIRS){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(nx<0||ny<0||nx>=N||ny>=N||seen.has(k)||bombs.has(k))continue;seen.add(k);queue.push([nx,ny]);}}
    return false;
  }
  generateMap(){
    for(let tries=0;tries<200;tries++){
      const protectedCells=new Set([...this.randomSafePath([0,0]),...this.randomSafePath([8,8]),key(...TREASURE)]);
      const pool=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=key(x,y);if(!protectedCells.has(k)&&k!==key(0,0)&&k!==key(8,8))pool.push(k);}
      const bombs=new Set(shuffle(pool).slice(0,14));
      if(this.hasSafePath([0,0],bombs)&&this.hasSafePath([8,8],bombs)){this.bombs=bombs;return;}
    }
    this.bombs=new Set();
  }
  nearbyBombs(x,y){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&this.bombs.has(key(x+dx,y+dy)))n++;return n;}
  legalMoves(player=this.turn){const [x,y]=this.positions[player];const other=key(...this.positions[1-player]);return DIRS.map(([dx,dy])=>[x+dx,y+dy]).filter(([nx,ny])=>nx>=0&&ny>=0&&nx<N&&ny<N&&key(nx,ny)!==other);}
  move(x,y){
    if(this.over||this.thinking||!this.legalMoves().some(([a,b])=>a===x&&b===y))return false;
    const p=this.turn,k=key(x,y);this.positions[p]=[x,y];this.visited[p].add(k);this.revealed.add(k);clickTone();
    if(this.bombs.has(k)&&!this.exploded.has(k)){this.exploded.add(k);this.lives[p]--;boomTone();toast(`${this.config.players[p].name}踩中炸弹，剩余${this.lives[p]}条生命`);}
    if(this.lives[p]<=0){this.over=true;this.render();this.finish(1-p,`${this.config.players[p].name}生命耗尽`);return true;}
    if(x===4&&y===4){this.over=true;this.render();this.finish(p,`${this.config.players[p].name}抢先抵达宝藏`);return true;}
    this.turn=1-p;this.render();const generation=this.generation,turn=this.turn;setTimeout(()=>{if(generation===this.generation&&turn===this.turn&&!this.over)this.maybeCpuTurn();},150);return true;
  }
  finish(winner,reason){winTone();openModal(`<h2>💎 ${escapeHtml(this.config.players[winner].name)}获胜</h2><p>${escapeHtml(reason)}。</p><div class="modal-actions"><button class="secondary" data-close>关闭</button><button class="primary" data-again>新地图</button></div>`,root=>{root.querySelector('[data-close]').onclick=closeModal;root.querySelector('[data-again]').onclick=()=>{closeModal();this.restart();};});}
  scan(auto=false){
    if(this.over||this.thinking&&!auto)return;
    const p=this.turn;if(this.scans[p]<=0){if(!auto)toast('本局雷达已经使用过');return false;}
    const[x,y]=this.positions[p];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<N&&ny<N)this.revealed.add(key(nx,ny));}
    this.scans[p]--;moveTone();if(!auto)toast('已扫描当前位置周围');this.render();return true;
  }

  estimateRisk(x,y){
    const k=key(x,y);if(this.exploded.has(k))return 1;if(this.revealed.has(k)&&this.bombs.has(k))return 1;if(this.revealed.has(k)&&!this.bombs.has(k))return 0;
    const estimates=[];
    for(let cy=Math.max(0,y-1);cy<=Math.min(N-1,y+1);cy++)for(let cx=Math.max(0,x-1);cx<=Math.min(N-1,x+1);cx++){
      const ck=key(cx,cy);if(!this.revealed.has(ck)||this.bombs.has(ck))continue;
      const clue=this.nearbyBombs(cx,cy);let known=0,unknown=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nk=key(cx+dx,cy+dy);if(this.exploded.has(nk))known++;else if(!this.revealed.has(nk))unknown++;}
      if(unknown>0)estimates.push(Math.max(0,Math.min(1,(clue-known)/unknown)));
    }
    return estimates.length?estimates.reduce((a,b)=>a+b,0)/estimates.length:.17;
  }
  bestPathMove(level){
    const legal=this.legalMoves();if(level===1)return pick(legal);
    const scored=legal.map(([x,y])=>{const risk=this.estimateRisk(x,y),distance=Math.abs(x-4)+Math.abs(y-4),visited=this.visited[this.turn].has(key(x,y));let score=-distance*12-risk*(level===2?28:level===3?65:level===4?105:145)-(visited?10:0)+Math.random()*6;if(this.revealed.has(key(x,y)))score+=8;if(level>=4){const oppDist=Math.abs(this.positions[1-this.turn][0]-4)+Math.abs(this.positions[1-this.turn][1]-4);if(oppDist<=3)score+=(8-distance)*3;}return{x,y,risk,score};}).sort((a,b)=>b.score-a.score);
    if(level===2)return pick(scored.slice(0,Math.min(3,scored.length)));
    return scored[0];
  }
  async maybeCpuTurn(){
    if(this.over||this.thinking||this.currentPlayer().type!=='cpu')return;
    const generation=this.generation,turn=this.turn;this.thinking=true;this.render();setThinking('bombThinking',true,`${this.currentPlayer().name}分析线索中…`);await sleep(350+this.currentPlayer().level*90);
    if(generation!==this.generation||this.over||!this.thinking||turn!==this.turn||this.currentPlayer().type!=='cpu')return;
    const level=Number(this.currentPlayer().level),legal=this.legalMoves(),risks=legal.map(([x,y])=>this.estimateRisk(x,y));
    if(this.scans[this.turn]>0&&level>=3&&Math.min(...risks)>.20&&(level===5||Math.random()<.35)){this.scan(true);await sleep(350);if(generation!==this.generation||this.over||!this.thinking||turn!==this.turn||this.currentPlayer().type!=='cpu')return;}
    const m=this.bestPathMove(level);setThinking('bombThinking',false);this.thinking=false;if(m)this.move(m.x,m.y);
  }

  render(){
    this.boardEl.innerHTML='';const legal=new Set(this.over?[]:this.legalMoves().map(([x,y])=>key(x,y)));
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const k=key(x,y),cell=document.createElement('button');cell.className='bomb-cell';cell.dataset.x=x;cell.dataset.y=y;
      if(this.revealed.has(k))cell.classList.add('revealed');if(legal.has(k)&&this.currentPlayer().type==='human'&&!this.thinking)cell.classList.add('moveable');if(x===4&&y===4)cell.classList.add('treasure');if(this.exploded.has(k))cell.classList.add('exploded');
      if(x===4&&y===4){const i=document.createElement('span');i.className='cell-icon';i.textContent='💎';cell.append(i);}else if(this.exploded.has(k)){const i=document.createElement('span');i.className='cell-icon';i.textContent='💥';cell.append(i);}else if(this.revealed.has(k)&&this.bombs.has(k)){const i=document.createElement('span');i.className='cell-icon';i.textContent='💣';cell.append(i);}else if(this.revealed.has(k)){const clue=document.createElement('span');clue.className='clue-badge';clue.textContent=this.nearbyBombs(x,y);cell.append(clue);}
      this.positions.forEach((pos,p)=>{if(pos[0]===x&&pos[1]===y){const piece=document.createElement('span');piece.className=`bomb-piece ${p?'blue':'red'}`;piece.textContent=p+1;cell.append(piece);}});
      this.boardEl.append(cell);
    }
    for(let p=0;p<2;p++){const player=this.config.players[p];$(`#bPlayer${p}Name`).textContent=player.name;$(`#bPlayer${p}Meta`).textContent=`${playerTypeLabel(player.type,player.level)} · 雷达${this.scans[p]}`;$(`#bLife${p}`).textContent='♥'.repeat(this.lives[p])+'♡'.repeat(3-this.lives[p]);$(`#bPlayer${p}Chip`).classList.toggle('active',!this.over&&p===this.turn);}
    $('#bombStatus').textContent=this.over?'本局结束':`${this.currentPlayer().name}${this.thinking?'思考中':'行动'}`;$('#bScan').disabled=this.scans[this.turn]<=0||this.currentPlayer().type==='cpu'||this.thinking;
  }

  openSettings(){const p=this.config.players;openModal(`<h2>躲炸弹设置</h2><p>电脑只使用已揭示数字和雷达信息，不会读取隐藏炸弹位置。</p><div class="settings-grid">
    ${p.map((x,i)=>`<div class="settings-section"><h3>${i?'蓝方':'红方'}</h3><div class="setting-row"><label>名称<input data-name="${i}" maxlength="10" value="${escapeHtml(x.name)}"></label><label>类型<select class="player-type" data-player="${i}">${typeOptions(x.type)}</select></label><label>难度<select data-level-for="${i}">${difficultyOptions(x.level)}</select></label></div></div>`).join('')}
    <label class="full">棋盘主题<select id="bSetTheme">${THEMES.map(k=>`<option value="${k}" ${k===this.config.theme?'selected':''}>${({cyber:'深海科技',forest:'森林探险',candy:'糖果迷宫'})[k]}</option>`).join('')}</select></label>
    <div class="full difficulty-note">1级随机冒险；2级会避开明显危险；3级参考数字概率；4级计算风险路径；5级结合雷达、对手距离与概率图。</div>
    </div><div class="modal-actions"><button class="secondary" data-cancel>取消</button><button class="primary" data-save>保存并生成新地图</button></div>`,root=>{bindTypeLevel(root);root.querySelector('[data-cancel]').onclick=closeModal;root.querySelector('[data-save]').onclick=()=>{this.config.players=p.map((old,i)=>({name:root.querySelector(`[data-name="${i}"]`).value.trim()||`${i?'蓝':'红'}方`,type:root.querySelector(`[data-player="${i}"]`).value,level:Number(root.querySelector(`[data-level-for="${i}"]`).value)}));this.config.theme=$('#bSetTheme',root).value;this.persist();closeModal();this.restart();};});}
}
