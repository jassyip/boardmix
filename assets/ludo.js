import { $, sleep, pick, toast, openModal, closeModal, bindTypeLevel, difficultyOptions, typeOptions, playerTypeLabel, clickTone, moveTone, winTone, setThinking } from './core.js';

const COLORS=['red','blue','green','yellow'];
const COLOR_NAMES=['红方','蓝方','绿方','黄方'];
const START_INDEX=[0,13,26,39];
const SAFE_GLOBAL=new Set([0,8,13,21,26,34,39,47]);
const PATH=[
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
];
const HOME_LANES=[
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
];
const THEMES=['classic','candy','night'];

export class LudoGame{
  constructor(prefs,onPrefs){
    this.onPrefs=onPrefs;
    this.config={count:4,theme:'classic',players:[
      {name:'红方',type:'human',level:1},{name:'蓝方',type:'cpu',level:3},{name:'绿方',type:'cpu',level:2},{name:'黄方',type:'cpu',level:2}
    ],...(prefs||{})};
    if(!Array.isArray(this.config.players)||this.config.players.length!==4)this.config.players=COLOR_NAMES.map((name,i)=>({name,type:i?'cpu':'human',level:i?2:1}));
    this.board=$('#ludoBoard');this.frame=this.board.closest('.ludo-frame');this.cellMap=new Map();this.baseSlots=[];this.buildBoard();this.bind();this.restart();
  }
  bind(){
    $('#rollDice').addEventListener('click',()=>this.humanRoll());
    this.board.addEventListener('click',e=>{const piece=e.target.closest('.plane-piece.selectable');if(piece)this.selectPiece(Number(piece.dataset.piece));});
    $('#ludoRestart').addEventListener('click',()=>this.restart());
    $('#ludoTheme').addEventListener('click',()=>{const i=THEMES.indexOf(this.config.theme);this.config.theme=THEMES[(i+1)%THEMES.length];this.applyTheme();this.persist();});
    $('#ludoSettings').addEventListener('click',()=>this.openSettings());
  }
  persist(){this.onPrefs?.(this.config)}
  currentPlayer(){return this.config.players[this.turn]}
  activePlayers(){return [...Array(this.config.count).keys()]}
  applyTheme(){this.frame.dataset.theme=this.config.theme;}
  show(){this.render();this.maybeCpuTurn();}

  buildBoard(){
    this.board.innerHTML='';this.cellMap.clear();
    for(let r=0;r<15;r++)for(let c=0;c<15;c++){const cell=document.createElement('div');cell.className='ludo-cell';cell.style.gridRow=r+1;cell.style.gridColumn=c+1;cell.dataset.coord=`${r},${c}`;this.board.append(cell);this.cellMap.set(`${r},${c}`,cell);}
    PATH.forEach(([r,c],i)=>{const cell=this.cellMap.get(`${r},${c}`);cell.classList.add('path');if(SAFE_GLOBAL.has(i))cell.classList.add('safe');});
    START_INDEX.forEach((index,p)=>this.cellMap.get(PATH[index].join(',')).classList.add(`${COLORS[p]}-start`));
    HOME_LANES.forEach((lane,p)=>lane.forEach(coord=>this.cellMap.get(coord.join(',')).classList.add(`${COLORS[p]}-lane`)));
    this.baseSlots=[];
    COLORS.forEach((color,p)=>{const base=document.createElement('div');base.className=`ludo-base ${color}`;const slots=[];for(let i=0;i<4;i++){const slot=document.createElement('div');slot.className='base-slot';base.append(slot);slots.push(slot);}this.board.append(base);this.baseSlots.push(slots);});
    const center=document.createElement('div');center.className='home-center';this.board.append(center);for(const color of ['blue','green','yellow']){const t=document.createElement('div');t.className=`home-center ${color}`;this.board.append(t);}
  }

  restart(){
    this.pieces=Array.from({length:4},()=>Array.from({length:4},()=>({progress:-1})));
    this.turn=0;this.roll=null;this.waiting=false;this.rolling=false;this.over=false;this.thinking=false;this.extraRoll=false;this.setDie(1);setThinking('ludoThinking',false);this.applyTheme();this.render();setTimeout(()=>this.maybeCpuTurn(),250);
  }
  nextTurn(){let n=this.turn;do{n=(n+1)%this.config.count;}while(n>=this.config.count);this.turn=n;this.roll=null;this.waiting=false;this.render();setTimeout(()=>this.maybeCpuTurn(),180);}
  legalPieces(player=this.turn,roll=this.roll){if(!roll)return[];return this.pieces[player].map((piece,i)=>({piece,i})).filter(({piece})=>piece.progress<57&&(piece.progress===-1?roll===6:piece.progress+roll<=57)).map(x=>x.i);}
  commonGlobal(player,progress){return (START_INDEX[player]+progress)%52;}
  destination(player,pieceIndex,roll){const p=this.pieces[player][pieceIndex];const progress=p.progress===-1?0:p.progress+roll;return{progress,global:progress<=51?this.commonGlobal(player,progress):null};}
  captureTargets(player,dest){
    if(dest.global===null||SAFE_GLOBAL.has(dest.global))return[];const out=[];
    for(let op=0;op<this.config.count;op++)if(op!==player)this.pieces[op].forEach((piece,i)=>{if(piece.progress>=0&&piece.progress<=51&&this.commonGlobal(op,piece.progress)===dest.global)out.push([op,i]);});return out;
  }

  async humanRoll(){if(this.over||this.rolling||this.waiting||this.thinking||this.currentPlayer().type==='cpu')return;await this.rollForCurrent(false);}
  async rollForCurrent(cpu){
    this.rolling=true;$('#rollDice').disabled=true;$('#die').classList.add('rolling');
    for(let i=0;i<7;i++){this.setDie(1+Math.floor(Math.random()*6));await sleep(65);}
    const value=1+Math.floor(Math.random()*6);this.setDie(value);$('#die').classList.remove('rolling');this.rolling=false;this.roll=value;clickTone();
    const legal=this.legalPieces();this.waiting=legal.length>0;this.render();
    if(!legal.length){toast(`${this.currentPlayer().name}掷出${value}，无棋可走`);await sleep(650);if(value===6){this.roll=null;this.render();if(cpu)await this.rollForCurrent(true);}else this.nextTurn();return;}
    if(cpu){await sleep(300);const selected=this.chooseCpuPiece(Number(this.currentPlayer().level),legal);await this.movePiece(selected);return;}
    if(legal.length===1){await sleep(260);await this.movePiece(legal[0]);}else toast(`掷出${value}，请选择一架飞机`);
  }
  selectPiece(index){if(this.currentPlayer().type==='cpu'||!this.waiting||!this.legalPieces().includes(index))return;this.movePiece(index);}
  async movePiece(index){
    if(!this.waiting||this.over)return;
    const player=this.turn,piece=this.pieces[player][index],roll=this.roll,dest=this.destination(player,index,roll);this.waiting=false;this.thinking=true;setThinking('ludoThinking',true,'飞机移动中…');
    if(piece.progress===-1){piece.progress=0;moveTone();this.render();await sleep(350);}else{
      for(let step=0;step<roll;step++){piece.progress++;moveTone();this.render();await sleep(145);}
    }
    const captured=this.captureTargets(player,dest);captured.forEach(([op,i])=>this.pieces[op][i].progress=-1);if(captured.length)toast(`撞回 ${captured.length} 架飞机`);
    const finished=piece.progress===57;if(finished)toast(`${this.config.players[player].name}有一架飞机到达终点`);
    if(this.pieces[player].every(p=>p.progress===57)){this.over=true;this.thinking=false;setThinking('ludoThinking',false);this.render();winTone();openModal(`<h2>✈ ${this.config.players[player].name}获胜</h2><p>四架飞机已经全部抵达中央终点。</p><div class="modal-actions"><button class="secondary" data-close>关闭</button><button class="primary" data-again>再来一局</button></div>`,root=>{root.querySelector('[data-close]').onclick=closeModal;root.querySelector('[data-again]').onclick=()=>{closeModal();this.restart();};});return;}
    this.thinking=false;setThinking('ludoThinking',false);this.roll=null;
    if(roll===6){toast(`${this.currentPlayer().name}掷出6，可以再投一次`);this.render();await sleep(500);if(this.currentPlayer().type==='cpu')this.maybeCpuTurn();}
    else this.nextTurn();
  }

  evaluatePiece(player,index,level){
    const roll=this.roll,dest=this.destination(player,index,roll),piece=this.pieces[player][index];let score=0;
    if(piece.progress===-1)score+=level===1?5:35;
    score+=dest.progress*1.2;
    if(dest.progress===57)score+=500;
    const captured=this.captureTargets(player,dest).length;score+=captured*(level>=3?260:70);
    if(dest.global!==null&&SAFE_GLOBAL.has(dest.global))score+=level>=3?55:12;
    if(level>=4&&dest.global!==null&&!SAFE_GLOBAL.has(dest.global)){
      let threats=0;
      for(let op=0;op<this.config.count;op++)if(op!==player)this.pieces[op].forEach(p=>{if(p.progress>=0&&p.progress<=51){const g=this.commonGlobal(op,p.progress);const distance=(dest.global-g+52)%52;if(distance>=1&&distance<=6)threats++;}});
      score-=threats*(level===4?45:75);
    }
    if(level>=5){const same=this.pieces[player].filter((p,i)=>i!==index&&p.progress>=0&&p.progress<=51&&dest.global!==null&&this.commonGlobal(player,p.progress)===dest.global).length;score+=same*42;score+=(57-dest.progress<8?90:0);}
    score+=Math.random()*(level===1?160:level===2?45:10);
    return score;
  }
  chooseCpuPiece(level,legal){if(level===1)return pick(legal);const ranked=legal.map(i=>({i,score:this.evaluatePiece(this.turn,i,level)})).sort((a,b)=>b.score-a.score);if(level===2)return pick(ranked.slice(0,Math.min(2,ranked.length))).i;return ranked[0].i;}
  async maybeCpuTurn(){
    if(this.over||this.thinking||this.rolling||this.waiting||this.currentPlayer().type!=='cpu')return;
    this.thinking=true;setThinking('ludoThinking',true,`${this.currentPlayer().name}准备掷骰…`);this.render();await sleep(380+Number(this.currentPlayer().level)*80);this.thinking=false;setThinking('ludoThinking',false);await this.rollForCurrent(true);
  }

  setDie(value){
    this.dieValue=value;$('#dieValue').textContent=value;$('#die').setAttribute('aria-label',`骰子点数 ${value}`);
    const maps={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
    $('#die').innerHTML=[...Array(9)].map((_,i)=>`<i class="${maps[value].includes(i)?'pip':'die-empty'}"></i>`).join('');
  }
  renderPlayers(){
    const box=$('#ludoPlayers');box.innerHTML='';
    for(let p=0;p<4;p++){const player=this.config.players[p],done=this.pieces[p].filter(x=>x.progress===57).length,home=this.pieces[p].filter(x=>x.progress===-1).length;const chip=document.createElement('div');chip.className=`ludo-mini ${p>=this.config.count?'off':''} ${p===this.turn&&!this.over?'active':''}`;chip.innerHTML=`<span class="avatar ${COLORS[p]}">${p+1}</span><div><b>${player.name}</b><small>${playerTypeLabel(player.type,player.level)} · ⌂${home} ★${done}</small></div>`;box.append(chip);}
  }
  render(){
    this.renderPlayers();
    this.board.querySelectorAll('.plane-piece').forEach(n=>n.remove());
    const selectable=new Set(this.waiting&&this.currentPlayer().type==='human'?this.legalPieces():[]);
    const targets=new Map();
    for(let p=0;p<this.config.count;p++)this.pieces[p].forEach((piece,i)=>{
      const node=document.createElement('button');node.className=`plane-piece ${COLORS[p]}`;node.dataset.piece=i;node.title=`${this.config.players[p].name} 第${i+1}架`;
      if(selectable.has(i)&&p===this.turn)node.classList.add('selectable');
      let parent;
      if(piece.progress===-1)parent=this.baseSlots[p][i];
      else if(piece.progress<=51){const coord=PATH[this.commonGlobal(p,piece.progress)];parent=this.cellMap.get(coord.join(','));}
      else {parent=this.cellMap.get(HOME_LANES[p][piece.progress-52].join(','));if(piece.progress===57)node.classList.add('plane-finished');}
      const k=`${p}:${piece.progress}:${parent.dataset?.coord||i}`;const count=targets.get(parent)||0;targets.set(parent,count+1);if(count){node.classList.add('plane-stack');node.style.setProperty('--sx',`${(count%2)*18-9}%`);node.style.setProperty('--sy',`${Math.floor(count/2)*18-9}%`);}parent.append(node);
    });
    $('#ludoStatus').textContent=this.over?'本局结束':`${this.currentPlayer().name}${this.rolling?'投骰中':this.waiting?`掷出${this.roll}，选择飞机`:'掷骰'}`;
    $('#rollDice').disabled=this.over||this.rolling||this.waiting||this.thinking||this.currentPlayer().type==='cpu';
  }

  openSettings(){const p=this.config.players;openModal(`<h2>经典飞行棋设置</h2><p>四角机场、十字航线、四架飞机。掷到6起飞并获得额外一次投掷，必须用准确点数抵达终点。</p><div class="settings-grid">
    <label>参与人数<select id="lSetCount">${[2,3,4].map(n=>`<option ${n===Number(this.config.count)?'selected':''}>${n}</option>`).join('')}</select></label>
    <label>棋盘主题<select id="lSetTheme">${THEMES.map(k=>`<option value="${k}" ${k===this.config.theme?'selected':''}>${({classic:'经典奶油',candy:'糖果派对',night:'星空霓虹'})[k]}</option>`).join('')}</select></label>
    ${p.map((x,i)=>`<div class="settings-section"><h3>${COLOR_NAMES[i]}</h3><div class="setting-row"><label>名称<input data-name="${i}" maxlength="10" value="${x.name}"></label><label>类型<select class="player-type" data-player="${i}">${typeOptions(x.type)}</select></label><label>难度<select data-level-for="${i}">${difficultyOptions(x.level)}</select></label></div></div>`).join('')}
    <div class="full difficulty-note">1级随机选飞机；2级优先起飞和前进；3级会撞机与冲终点；4级考虑安全格和被撞风险；5级综合叠机、威胁、终点与对手位置。</div>
    </div><div class="modal-actions"><button class="secondary" data-cancel>取消</button><button class="primary" data-save>保存并重开</button></div>`,root=>{bindTypeLevel(root);root.querySelector('[data-cancel]').onclick=closeModal;root.querySelector('[data-save]').onclick=()=>{this.config.count=Number($('#lSetCount',root).value);this.config.theme=$('#lSetTheme',root).value;this.config.players=p.map((old,i)=>({name:root.querySelector(`[data-name="${i}"]`).value.trim()||COLOR_NAMES[i],type:root.querySelector(`[data-player="${i}"]`).value,level:Number(root.querySelector(`[data-level-for="${i}"]`).value)}));this.persist();closeModal();this.restart();};});}
}
