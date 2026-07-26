import { $, sleep, pick, shuffle, toast, openModal, closeModal, bindTypeLevel, difficultyOptions, typeOptions, playerTypeLabel, clickTone, moveTone, winTone, setThinking } from './core.js';

const SIZE = 15;
const EMPTY = -1;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const THEMES = {
  maple:{a:'#e4b978',b:'#9d632e',grid:'rgba(58,37,19,.74)',star:'#4d2e16',last:'#f04646'},
  walnut:{a:'#9b6237',b:'#4c2b18',grid:'rgba(27,14,7,.82)',star:'#21120b',last:'#ffd45b'},
  jade:{a:'#bad4b2',b:'#6f9872',grid:'rgba(26,63,40,.68)',star:'#244c32',last:'#d64242'},
  ink:{a:'#eeece5',b:'#aaa69d',grid:'rgba(42,42,40,.62)',star:'#333',last:'#d84646'}
};

export class GomokuGame {
  constructor(prefs, onPrefs) {
    this.canvas = $('#gomokuCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.onPrefs = onPrefs;
    this.config = {
      rounds: 1, games: 3, theme: 'maple', alternate: true,
      players: [
        {name:'玩家一',type:'human',level:1},
        {name:'电脑',type:'cpu',level:3}
      ],
      ...(prefs || {})
    };
    if (!Array.isArray(this.config.players)) this.config.players = [{name:'玩家一',type:'human',level:1},{name:'电脑',type:'cpu',level:3}];
    this.board = [];
    this.moves = [];
    this.colorPlayers = [0,1];
    this.turn = 0;
    this.round = 1;
    this.game = 1;
    this.roundWins = [0,0];
    this.matchWins = [0,0];
    this.over = false;
    this.thinking = false;
    this.winLine = [];
    this.generation = 0;
    this.bind();
    this.startMatch();
  }

  bind() {
    this.canvas.addEventListener('pointerup', event => this.handlePointer(event));
    $('#gUndo').addEventListener('click', () => this.undo());
    $('#gRestart').addEventListener('click', () => { this.startBoard(); toast('已重开当前局'); });
    $('#gTheme').addEventListener('click', () => {
      const keys = Object.keys(THEMES); const i = keys.indexOf(this.config.theme);
      this.config.theme = keys[(i + 1) % keys.length]; this.persist(); this.draw();
    });
    $('#gSettings').addEventListener('click', () => this.openSettings());
  }

  persist() { this.onPrefs?.(this.config); }
  show() { this.draw(); this.maybeCpuTurn(); }
  startMatch() { this.round=1; this.game=1; this.roundWins=[0,0]; this.matchWins=[0,0]; this.startBoard(); }
  globalGameIndex() { return (this.round - 1) * this.config.games + (this.game - 1); }
  assignColors() { this.colorPlayers = this.config.alternate && this.globalGameIndex()%2 ? [1,0] : [0,1]; }
  startBoard() {
    const generation=++this.generation,initialTurn=0;
    this.assignColors();
    this.board = Array.from({length:SIZE}, () => Array(SIZE).fill(EMPTY));
    this.moves=[]; this.turn=0; this.over=false; this.thinking=false; this.winLine=[];
    setThinking('gomokuThinking',false); this.updateUI(); this.draw(); setTimeout(()=>{if(generation===this.generation&&initialTurn===this.turn&&!this.over)this.maybeCpuTurn();},180);
  }

  currentPlayerIndex() { return this.colorPlayers[this.turn]; }
  currentPlayer() { return this.config.players[this.currentPlayerIndex()]; }
  handlePointer(event) {
    if (this.over || this.thinking || this.currentPlayer().type === 'cpu') return;
    const rect = this.canvas.getBoundingClientRect();
    const padding = 78; const step=(900-padding*2)/(SIZE-1);
    const x=Math.round(((event.clientX-rect.left)*900/rect.width-padding)/step);
    const y=Math.round(((event.clientY-rect.top)*900/rect.height-padding)/step);
    this.playMove(x,y);
  }

  playMove(x,y) {
    if (this.over || x<0 || y<0 || x>=SIZE || y>=SIZE || this.board[y][x]!==EMPTY) return false;
    const color=this.turn;
    this.board[y][x]=color; this.moves.push({x,y,color}); clickTone();
    const line=this.checkWin(x,y,color);
    if (line) { this.winLine=line; this.over=true; this.draw(); this.finishGame(this.colorPlayers[color]); return true; }
    if (this.moves.length===SIZE*SIZE) { this.over=true; this.finishGame(-1); return true; }
    this.turn=1-this.turn; this.updateUI(); this.draw(); const generation=this.generation,turn=this.turn; setTimeout(()=>{if(generation===this.generation&&turn===this.turn&&!this.over)this.maybeCpuTurn();},100); return true;
  }

  checkWin(x,y,color,board=this.board) {
    for (const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
      const cells=[[x,y]]; let n=1;
      while (board[y+dy*n]?.[x+dx*n]===color) { cells.push([x+dx*n,y+dy*n]); n++; }
      n=1; while (board[y-dy*n]?.[x-dx*n]===color) { cells.unshift([x-dx*n,y-dy*n]); n++; }
      if (cells.length>=5) return cells.slice(0,5);
    }
    return null;
  }

  async finishGame(playerIndex) {
    const generation=this.generation,finishedRound=this.round,finishedGame=this.game;
    if (playerIndex>=0) { this.roundWins[playerIndex]++; winTone(); } this.updateUI();
    await sleep(380);
    if(generation!==this.generation||!this.over||finishedRound!==this.round||finishedGame!==this.game)return;
    const p=playerIndex>=0?this.config.players[playerIndex].name:'双方';
    if (this.game < this.config.games) {
      toast(playerIndex>=0?`${p}赢下本局`:'本局平局'); this.game++; const nextGame=this.game; await sleep(900); if(generation!==this.generation||!this.over||finishedRound!==this.round||nextGame!==this.game)return; this.startBoard(); return;
    }
    let roundWinner=-1;
    if (this.roundWins[0]!==this.roundWins[1]) roundWinner=this.roundWins[0]>this.roundWins[1]?0:1;
    if (roundWinner>=0) this.matchWins[roundWinner]++;
    if (this.round < this.config.rounds) {
      toast(roundWinner>=0?`${this.config.players[roundWinner].name}赢下第${this.round}回合`:`第${this.round}回合平局`);
      this.round++; this.game=1; this.roundWins=[0,0]; const nextRound=this.round; await sleep(1200); if(generation!==this.generation||!this.over||nextRound!==this.round||this.game!==1)return; this.startBoard(); return;
    }
    let matchWinner=-1;
    if (this.matchWins[0]!==this.matchWins[1]) matchWinner=this.matchWins[0]>this.matchWins[1]?0:1;
    openModal(`<h2>${matchWinner>=0?'比赛结束':'整场平局'}</h2><p>${matchWinner>=0?`🏆 ${escapeHtml(this.config.players[matchWinner].name)} 获得总冠军。`:'双方回合积分相同。'} 最终回合比分 ${this.matchWins[0]} : ${this.matchWins[1]}。</p><div class="modal-actions"><button class="secondary" data-home>返回</button><button class="primary" data-again>再来一场</button></div>`, root=>{
      root.querySelector('[data-home]').onclick=closeModal;
      root.querySelector('[data-again]').onclick=()=>{closeModal();this.startMatch();};
    });
  }

  undo() {
    if (!this.moves.length || this.over || this.thinking) return toast('当前不能悔棋');
    const removeOne=()=>{const m=this.moves.pop(); if(m){this.board[m.y][m.x]=EMPTY;this.turn=m.color;}};
    removeOne();
    const hasCpu=this.config.players.some(p=>p.type==='cpu');
    if (hasCpu && this.moves.length && this.currentPlayer().type==='cpu') removeOne();
    this.winLine=[]; this.updateUI(); this.draw(); moveTone();
  }

  candidates(board=this.board, radius=2) {
    if (!this.moves.length && board===this.board) return [{x:7,y:7}];
    const set=new Set(); let any=false;
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(board[y][x]!==EMPTY){any=true;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<SIZE&&ny<SIZE&&board[ny][nx]===EMPTY)set.add(`${nx},${ny}`)}}
    if(!any)return [{x:7,y:7}];
    return [...set].map(s=>{const [x,y]=s.split(',').map(Number);return{x,y}});
  }

  patternScore(board,x,y,color) {
    if(board[y][x]!==EMPTY)return -Infinity;
    let total=0;
    for(const[dx,dy]of[[1,0],[0,1],[1,1],[1,-1]]){
      let left=0,right=0,open=0,n=1;
      while(board[y+dy*n]?.[x+dx*n]===color){right++;n++;}
      if(board[y+dy*n]?.[x+dx*n]===EMPTY)open++;
      n=1;while(board[y-dy*n]?.[x-dx*n]===color){left++;n++;}
      if(board[y-dy*n]?.[x-dx*n]===EMPTY)open++;
      const count=left+right+1;
      if(count>=5)total+=1000000;
      else if(count===4&&open===2)total+=90000;
      else if(count===4&&open===1)total+=18000;
      else if(count===3&&open===2)total+=8000;
      else if(count===3&&open===1)total+=1300;
      else if(count===2&&open===2)total+=650;
      else if(count===2&&open===1)total+=90;
      else total+=open*8;
    }
    total += 24 - (Math.abs(x-7)+Math.abs(y-7))*1.5;
    return total;
  }

  chooseCpuMove(level,color) {
    const opponent=1-color;
    let candidates=this.candidates(this.board, level>=4?2:1);
    const immediate=(who)=>candidates.find(m=>{this.board[m.y][m.x]=who;const win=!!this.checkWin(m.x,m.y,who);this.board[m.y][m.x]=EMPTY;return win;});
    const win=immediate(color); if(win)return win;
    if(level>=2){const block=immediate(opponent);if(block)return block;}
    if(level===1){
      const all=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(this.board[y][x]===EMPTY)all.push({x,y});
      return Math.random()<.78?pick(all):pick(candidates);
    }
    const ranked=candidates.map(m=>({
      ...m,
      attack:this.patternScore(this.board,m.x,m.y,color),
      defend:this.patternScore(this.board,m.x,m.y,opponent)
    })).map(m=>({...m,score:m.attack+(level===2?.55:level===3?.86:1.05)*m.defend+Math.random()*18})).sort((a,b)=>b.score-a.score);
    if(level===2)return pick(ranked.slice(0,Math.min(8,ranked.length)));
    if(level===3)return pick(ranked.slice(0,Math.min(3,ranked.length)));
    if(level===4)return ranked[0];
    const top=ranked.slice(0,Math.min(12,ranked.length));
    let best=top[0],bestValue=-Infinity;
    for(const move of top){
      this.board[move.y][move.x]=color;
      let value=move.score;
      const replies=this.candidates(this.board,1).map(r=>({
        ...r,
        score:this.patternScore(this.board,r.x,r.y,opponent)+this.patternScore(this.board,r.x,r.y,color)*.82
      })).sort((a,b)=>b.score-a.score).slice(0,8);
      const reply=replies[0]?.score||0;
      value-=reply*.88;
      this.board[move.y][move.x]=EMPTY;
      if(value>bestValue){bestValue=value;best=move;}
    }
    return best;
  }

  async maybeCpuTurn() {
    if(this.over||this.thinking||this.currentPlayer().type!=='cpu')return;
    const generation=this.generation,turn=this.turn,playerIndex=this.currentPlayerIndex();
    this.thinking=true;this.updateUI();setThinking('gomokuThinking',true,`${this.currentPlayer().name}思考中…`);
    await sleep(300+this.currentPlayer().level*90);
    if(generation!==this.generation||this.over||!this.thinking||turn!==this.turn||playerIndex!==this.currentPlayerIndex()||this.currentPlayer().type!=='cpu')return;
    const move=this.chooseCpuMove(Number(this.currentPlayer().level),this.turn);
    setThinking('gomokuThinking',false);this.thinking=false;
    if(move)this.playMove(move.x,move.y);
  }

  updateUI() {
    for(let p=0;p<2;p++){
      const chip=$(`#gPlayer${p}Chip`),player=this.config.players[p],color=this.colorPlayers.indexOf(p);
      $(`#gPlayer${p}Name`).textContent=player.name;
      $(`#gPlayer${p}Meta`).textContent=`${playerTypeLabel(player.type,player.level)} · ${color===0?'黑方':'白方'} · 总回合 ${this.matchWins[p]}`;
      $(`#gPlayer${p}Score`).textContent=this.roundWins[p];
      chip.classList.toggle('active',!this.over&&this.currentPlayerIndex()===p);
    }
    const status=this.over?'本局结束':`${this.currentPlayer().name}${this.thinking?'思考中':'落子'}`;
    $('#gomokuStatus').textContent=`第 ${this.round}/${this.config.rounds} 回合 · 第 ${this.game}/${this.config.games} 局 · ${status}`;
  }

  draw() {
    if(!this.board.length)return;
    const c=this.ctx,w=900,p=78,step=(w-p*2)/(SIZE-1),t=THEMES[this.config.theme]||THEMES.maple;
    const grad=c.createLinearGradient(0,0,w,w);grad.addColorStop(0,t.a);grad.addColorStop(1,t.b);c.fillStyle=grad;c.fillRect(0,0,w,w);
    c.save();c.globalAlpha=.08;c.strokeStyle='#321d0d';for(let y=0;y<w;y+=12){c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.25,y+7,w*.7,y-7,w,y+4);c.stroke()}c.restore();
    c.strokeStyle=t.grid;c.lineWidth=2;for(let i=0;i<SIZE;i++){const q=p+i*step;c.beginPath();c.moveTo(p,q);c.lineTo(w-p,q);c.stroke();c.beginPath();c.moveTo(q,p);c.lineTo(q,w-p);c.stroke();}
    [[3,3],[11,3],[7,7],[3,11],[11,11]].forEach(([x,y])=>{c.fillStyle=t.star;c.beginPath();c.arc(p+x*step,p+y*step,6,0,Math.PI*2);c.fill();});
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(this.board[y][x]!==EMPTY)this.drawStone(p+x*step,p+y*step,step*.42,this.board[y][x],this.moves.at(-1)?.x===x&&this.moves.at(-1)?.y===y,t.last);
    if(this.winLine.length){c.strokeStyle='#ff4545';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(p+this.winLine[0][0]*step,p+this.winLine[0][1]*step);c.lineTo(p+this.winLine[4][0]*step,p+this.winLine[4][1]*step);c.stroke();}
  }
  drawStone(x,y,r,color,last,lastColor){
    const c=this.ctx,g=c.createRadialGradient(x-r*.35,y-r*.38,r*.1,x,y,r);
    if(color===0){g.addColorStop(0,'#666');g.addColorStop(.45,'#242424');g.addColorStop(1,'#050505');}else{g.addColorStop(0,'#fff');g.addColorStop(.58,'#f1eee7');g.addColorStop(1,'#c9c1b2');}
    c.save();c.shadowColor='rgba(0,0,0,.36)';c.shadowBlur=12;c.shadowOffsetY=7;c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore();
    if(last){c.fillStyle=lastColor;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fill();}
  }

  openSettings() {
    const p=this.config.players;
    openModal(`<h2>五子棋设置</h2><p>每个座位可设为真人或电脑。1级会故意走得很随意；5级会进行更深的威胁计算。</p><div class="settings-grid">
      ${p.map((x,i)=>`<div class="settings-section"><h3>${i?'玩家二':'玩家一'}</h3><div class="setting-row"><label>名称<input data-name="${i}" maxlength="10" value="${escapeHtml(x.name)}"></label><label>类型<select class="player-type" data-player="${i}">${typeOptions(x.type)}</select></label><label>难度<select data-level-for="${i}">${difficultyOptions(x.level)}</select></label></div></div>`).join('')}
      <label>总回合数<select id="gSetRounds">${[1,3,5].map(n=>`<option ${n===Number(this.config.rounds)?'selected':''}>${n}</option>`).join('')}</select></label>
      <label>每回合局数<select id="gSetGames">${[1,3,5,7].map(n=>`<option ${n===Number(this.config.games)?'selected':''}>${n}</option>`).join('')}</select></label>
      <label>棋盘主题<select id="gSetTheme">${Object.keys(THEMES).map(k=>`<option value="${k}" ${k===this.config.theme?'selected':''}>${({maple:'枫木',walnut:'胡桃木',jade:'青玉',ink:'水墨'})[k]}</option>`).join('')}</select></label>
      <label><span>先手规则</span><select id="gSetAlt"><option value="1" ${this.config.alternate?'selected':''}>每局交换黑白</option><option value="0" ${!this.config.alternate?'selected':''}>固定玩家一先手</option></select></label>
      <div class="full difficulty-note">难度1：随机且常犯错；难度2：会挡一步杀；难度3：识别活三冲四；难度4：攻防评估；难度5：带对手回应搜索。</div>
    </div><div class="modal-actions"><button class="secondary" data-cancel>取消</button><button class="primary" data-save>保存并开新比赛</button></div>`,root=>{
      bindTypeLevel(root);
      root.querySelector('[data-cancel]').onclick=closeModal;
      root.querySelector('[data-save]').onclick=()=>{
        this.config.players=p.map((old,i)=>({name:root.querySelector(`[data-name="${i}"]`).value.trim()||`玩家${i+1}`,type:root.querySelector(`[data-player="${i}"]`).value,level:Number(root.querySelector(`[data-level-for="${i}"]`).value)}));
        this.config.rounds=Number($('#gSetRounds',root).value);this.config.games=Number($('#gSetGames',root).value);this.config.theme=$('#gSetTheme',root).value;this.config.alternate=$('#gSetAlt',root).value==='1';this.persist();closeModal();this.startMatch();
      };
    });
  }
}
