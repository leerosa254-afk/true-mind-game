const path=require('path');
const crypto=require('crypto');
const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const app=express(),server=http.createServer(app),io=new Server(server,{pingTimeout:20000,pingInterval:10000});
app.use(express.static(path.join(__dirname,'public')));
const PORT=process.env.PORT||3000,rooms=new Map(),MAX=30;

const EMOTIONS=[
 ['화남','😡'],['억울함','😤'],['답답함','😩'],['배신감','💔'],['서운함','😞'],['외로움','🥺'],['소외감','🫥'],['질투','😒'],
 ['불안함','😰'],['부담감','😣'],['막막함','😵‍💫'],['긴장감','😬'],['당황스러움','😳'],['창피함','🫣'],['미안함','😔'],['후회','😥'],
 ['속상함','😢'],['허탈함','😶'],['실망감','😕'],['아쉬움','🥲'],['고마움','🥹'],['안도감','😌'],['뿌듯함','😊'],['설렘','🤩']
].map(([name,emoji])=>({name,emoji}));

const S=[
 ['친구관계','친한 친구들이 나에게 말하지 않고 주말 약속을 정했다.','친구들의 대화에 끼지 못하고 혼자 자리를 피했다.','소외감',['소외감','서운함','질투','화남']],
 ['친구관계','단체 채팅방에서 내가 보낸 메시지만 계속 답이 없다.','읽음 표시는 늘어나는데 답장은 오지 않는다.','서운함',['서운함','소외감','불안함','답답함']],
 ['친구관계','늘 같이 다니던 친구가 요즘 다른 친구하고만 다닌다.','괜찮다고 말했지만 두 친구를 계속 바라보았다.','질투',['질투','서운함','외로움','화남']],
 ['친구관계','모둠을 정할 때 아무도 먼저 같이 하자고 하지 않았다.','웃으며 아무 모둠이나 괜찮다고 말했다.','외로움',['외로움','소외감','창피함','서운함']],
 ['SNS','친구가 허락 없이 내가 나온 사진을 SNS에 올렸다.','삭제해 달라는 메시지를 썼다가 여러 번 지웠다.','당황스러움',['당황스러움','화남','창피함','불안함']],
 ['SNS','장난으로 올린 댓글을 친구들이 진지하게 받아들였다.','해명할수록 분위기가 더 어색해졌다.','당황스러움',['당황스러움','억울함','불안함','미안함']],
 ['SNS','친구에게만 보낸 메시지가 단체 채팅방에 공유되었다.','누가 공유했는지 확인하고 한동안 말이 없었다.','배신감',['배신감','창피함','화남','불안함']],
 ['SNS','단체 채팅방에서 내 말을 다른 의미로 오해하고 있다.','설명을 보내도 친구들이 농담으로 넘긴다.','답답함',['답답함','억울함','불안함','화남']],
 ['신뢰','친한 친구에게만 말한 비밀이 반 친구들에게 알려졌다.','친구에게 왜 말했는지 묻지 못하고 거리를 두었다.','배신감',['배신감','화남','서운함','창피함']],
 ['신뢰','빌려준 물건이 망가졌는데 친구가 원래 그랬다고 말했다.','내가 빌려줄 때는 멀쩡했다고 계속 설명했다.','억울함',['억울함','화남','답답함','실망감']],
 ['신뢰','친구가 자기 실수를 내 탓이라고 이야기했다.','사실을 말했지만 아무도 바로 믿어주지 않았다.','억울함',['억울함','화남','배신감','답답함']],
 ['신뢰','화해했다고 생각했는데 친구가 다시 내 이야기를 하고 다녔다.','이번에는 정말 괜찮아질 거라고 믿고 있었다.','실망감',['실망감','배신감','화남','서운함']],
 ['학교생활','모둠 과제를 거의 혼자 했는데 친구들이 같은 점수를 받았다.','점수를 받은 뒤에도 기쁘기보다 힘이 빠졌다.','허탈함',['억울함','화남','허탈함','답답함']],
 ['학교생활','발표를 맡은 친구가 준비하지 않아 내가 갑자기 발표하게 됐다.','자료를 들고 앞에 섰지만 머릿속이 하얘졌다.','부담감',['부담감','화남','당황스러움','불안함']],
 ['학교생활','내가 낸 의견은 무시됐는데 다른 친구가 같은 말을 하자 받아들여졌다.','더 말하고 싶지 않아 조용히 있었다.','허탈함',['허탈함','서운함','화남','억울함']],
 ['학교생활','내가 실수해서 모둠 친구들이 과제를 다시 하게 됐다.','친구들의 표정을 자꾸 살피며 먼저 남아 정리했다.','미안함',['미안함','후회','창피함','불안함']],
 ['진로','열심히 공부했지만 시험 점수가 기대보다 낮았다.','시험지를 오래 바라보다 조용히 접었다.','허탈함',['허탈함','실망감','속상함','막막함']],
 ['진로','친구들은 희망 고등학교를 정했는데 나만 아직 결정하지 못했다.','친구들의 진학 이야기를 들을수록 말수가 줄었다.','막막함',['막막함','불안함','부담감','외로움']],
 ['진로','부모님과 선생님이 서로 다른 진로를 추천한다.','어느 쪽을 선택해야 할지 계속 생각만 하고 있다.','부담감',['부담감','답답함','막막함','불안함']],
 ['진로','친구가 나와 자신의 시험 점수를 계속 비교한다.','웃어넘겼지만 다음 시험이 자꾸 신경 쓰인다.','부담감',['부담감','화남','질투','속상함']],
 ['회복','혼자 있을 때 친구가 먼저 다가와 같이 가자고 말했다.','괜찮다고 했지만 표정이 한결 편안해졌다.','고마움',['고마움','안도감','설렘','뿌듯함']],
 ['회복','걱정했던 발표를 친구들이 끝까지 들어주고 박수를 쳐줬다.','자리로 돌아오며 크게 숨을 내쉬었다.','안도감',['안도감','뿌듯함','고마움','설렘']],
 ['회복','내가 도와준 친구가 진심으로 고맙다고 말했다.','별일 아니라고 했지만 계속 미소가 났다.','뿌듯함',['뿌듯함','고마움','설렘','안도감']],
 ['회복','다툰 친구가 먼저 메시지를 보내 대화하고 싶다고 했다.','답장을 쓰기 전 긴장이 조금 풀렸다.','안도감',['안도감','설렘','고마움','불안함']]
].map((x,i)=>({id:i+1,category:x[0],text:x[1],clue:x[2],answer:x[3],options:x[4]}));

const RESPONSES=[
 {id:'minimize',label:'별일 아닌 것처럼 말하기',text:'그 정도는 별일 아니야. 너무 신경 쓰지 마.'},
 {id:'solve',label:'해결부터 제안하기',text:'그냥 다른 방법을 찾으면 되잖아.'},
 {id:'judge',label:'이유를 따져 묻기',text:'네가 먼저 뭔가 잘못한 건 아니야?'},
 {id:'empathy',label:'마음을 확인하기',text:'그런 일이 있어서 마음이 복잡했겠다. 어떤 점이 가장 힘들었어?'}
];

const clean=(v,n=30)=>String(v||'').trim().replace(/[<>]/g,'').slice(0,n);
const newCode=()=>{let c;do c=Math.random().toString(36).slice(2,6).toUpperCase();while(rooms.has(c));return c};
const newToken=()=>crypto.randomBytes(18).toString('base64url');
const player=(s)=>{const r=rooms.get(s.data.roomCode);return r&&r.players.find(p=>p.token===s.data.token)};
const activeStudents=r=>r.players.filter(p=>p.connected&&!p.isHost);
const voters=r=>activeStudents(r).filter(p=>p.token!==r.game?.heroToken);
const pubPlayer=p=>({id:p.id,name:p.name,avatar:p.avatar,score:p.score,isHost:p.isHost,connected:p.connected});
const countMap=(map)=>{const o={};for(const v of map.values())o[v]=(o[v]||0)+1;return Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([label,count])=>({label,count}))};

function roomView(r,v){const g=r.game,hero=g&&r.players.find(p=>p.token===g.heroToken),eligible=g?voters(r):[];
 let pair=null;if(g?.phase==='duel1')pair=g.scenario.options.slice(0,2);if(g?.phase==='duel2')pair=g.scenario.options.slice(2,4);
 if(g?.phase==='final'){const a=g.duel1.get(v?.token)||g.scenario.options[0],b=g.duel2.get(v?.token)||g.scenario.options[2];pair=[a,b]}
 const phaseMap=g?.phase==='duel1'?g.duel1:g?.phase==='duel2'?g.duel2:g?.phase==='final'?g.finals:g?.phase==='response'?g.responses:null;
 const submitted=phaseMap?[...phaseMap.keys()].filter(t=>eligible.some(p=>p.token===t)).length:0;
 return {code:r.code,status:r.status,settings:r.settings,players:r.players.map(pubPlayer),me:v?pubPlayer(v):null,game:!g?null:{
  round:g.round,maxRounds:r.settings.rounds,mode:g.mode,phase:g.phase,endsAt:g.endsAt,scenario:{category:g.scenario.category,text:g.scenario.text,clue:g.scenario.clue},
  heroId:hero?.id,heroName:g.anonymous?'이번 라운드의 주인공':hero?.name||'캐릭터',isHero:v?.token===g.heroToken,pair,
  emotions:EMOTIONS,responses:RESPONSES,submitted,total:eligible.length,mySubmitted:phaseMap?.has(v?.token)||false,
  secret:g.phase==='secret'&&v?.token===g.heroToken?{options:g.scenario.options}:null,
  result:g.phase==='reveal'?{answer:g.targetEmotion,secondary:g.secondary,desired:g.desiredResponse,emotionVotes:countMap(g.finals),responseVotes:countMap(new Map([...g.responses].map(([k,x])=>[k,x.response]))),reasonVotes:countMap(new Map([...g.responses].map(([k,x])=>[k,x.reason])))}:null,
  pending:v?.isHost?eligible.filter(p=>!phaseMap?.has(p.token)).map(p=>p.name):[]
 }};
}
function broadcast(r){for(const p of r.players)if(p.socketId)io.to(p.socketId).emit('state',roomView(r,p))}
function stopTimer(r){clearTimeout(r.timer);r.timer=null}
function timed(r,seconds,fn){stopTimer(r);r.game.endsAt=Date.now()+seconds*1000;r.timer=setTimeout(fn,seconds*1000);broadcast(r)}
function modeFor(r,round){if(r.settings.mode==='character')return'character';if(r.settings.mode==='friend')return'friend';return round===r.settings.rounds?'friend':'character'}
function startRound(r){
 stopTimer(r);if((r.game?.round||0)>=r.settings.rounds)return finish(r);
 const round=(r.game?.round||0)+1,mode=modeFor(r,round),scenario=r.deck.pop()||S[Math.floor(Math.random()*S.length)];
 let hero=null;if(mode==='friend'){const students=activeStudents(r);hero=students[(round-1)%students.length]}
 r.game={round,mode,phase:mode==='friend'?'secret':'duel1',scenario,heroToken:hero?.token||null,anonymous:true,targetEmotion:mode==='character'?scenario.answer:null,secondary:null,desiredResponse:mode==='character'?'empathy':null,duel1:new Map(),duel2:new Map(),finals:new Map(),responses:new Map()};
 timed(r,mode==='friend'?40:25,()=>mode==='friend'?fallbackSecret(r):advance(r));
}
function fallbackSecret(r){if(!r.game||r.game.phase!=='secret')return;r.game.targetEmotion=r.game.scenario.options[0];r.game.desiredResponse='empathy';r.game.phase='duel1';timed(r,25,()=>advance(r))}
function advance(r){const g=r.game;if(!g)return;if(g.phase==='secret')return fallbackSecret(r);if(g.phase==='duel1')g.phase='duel2';else if(g.phase==='duel2')g.phase='final';else if(g.phase==='final')g.phase='response';else if(g.phase==='response')return reveal(r);else return;timed(r,g.phase==='response'?35:25,()=>advance(r))}
function maybeAdvance(r,map){const vs=voters(r);if(vs.length&&vs.every(p=>map.has(p.token)))advance(r);else broadcast(r)}
function reveal(r){if(!r.game||r.game.phase==='reveal')return;stopTimer(r);r.game.phase='reveal';for(const p of voters(r))if(r.game.finals.get(p.token)===r.game.targetEmotion)p.score+=10;timed(r,50,()=>startRound(r))}
function finish(r){stopTimer(r);r.status='finished';r.game=null;broadcast(r)}

io.on('connection',socket=>{
 socket.on('createRoom',d=>{const name=clean(d?.name);if(!name)return socket.emit('errorMsg','이름을 입력해 주세요.');const code=newCode(),p={token:newToken(),id:socket.id,socketId:socket.id,name,avatar:'🧑‍🏫',score:0,isHost:true,connected:true};const r={code,status:'waiting',players:[p],settings:{mode:'mixed',duration:15,rounds:3},game:null,deck:[],timer:null};rooms.set(code,r);socket.join(code);socket.data={roomCode:code,token:p.token};socket.emit('session',{roomCode:code,playerToken:p.token});broadcast(r)});
 socket.on('joinRoom',d=>{const r=rooms.get(clean(d?.code,4).toUpperCase()),name=clean(d?.name);if(!r)return socket.emit('errorMsg','방을 찾을 수 없습니다.');if(!name)return socket.emit('errorMsg','이름을 입력해 주세요.');if(r.status!=='waiting')return socket.emit('errorMsg','이미 활동이 시작되었습니다.');if(r.players.length>=MAX)return socket.emit('errorMsg','방이 가득 찼습니다.');const icons=['🐰','🐼','🦊','🐯','🐶','🐱','🐨','🐹'],p={token:newToken(),id:socket.id,socketId:socket.id,name,avatar:icons[r.players.length%icons.length],score:0,isHost:false,connected:true};r.players.push(p);socket.join(r.code);socket.data={roomCode:r.code,token:p.token};socket.emit('session',{roomCode:r.code,playerToken:p.token});broadcast(r)});
 socket.on('resume',d=>{const r=rooms.get(clean(d?.roomCode,4).toUpperCase()),p=r?.players.find(x=>x.token===d?.playerToken);if(!r||!p)return socket.emit('resumeFailed');p.id=socket.id;p.socketId=socket.id;p.connected=true;socket.join(r.code);socket.data={roomCode:r.code,token:p.token};broadcast(r)});
 socket.on('startGame',d=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(!r||!p?.isHost)return;if(activeStudents(r).length<2)return socket.emit('errorMsg','학생이 최소 2명 필요합니다.');const duration=[10,15,25].includes(+d.duration)?+d.duration:15,mode=['mixed','character','friend'].includes(d.mode)?d.mode:'mixed',rounds=Math.min(6,Math.max(2,+d.rounds||({10:2,15:3,25:5}[duration])));r.settings={duration,mode,rounds};r.deck=[...S].sort(()=>Math.random()-.5);r.players.forEach(x=>x.score=0);r.status='playing';r.game={round:0};startRound(r)});
 socket.on('secretSubmit',d=>{const r=rooms.get(socket.data.roomCode),p=player(socket),g=r?.game;if(!g||g.phase!=='secret'||p?.token!==g.heroToken)return;const emotion=g.scenario.options.includes(d.emotion)?d.emotion:null;if(!emotion)return socket.emit('errorMsg','가장 가까운 감정을 선택해 주세요.');g.targetEmotion=emotion;g.secondary=g.scenario.options.includes(d.secondary)&&d.secondary!==emotion?d.secondary:null;g.desiredResponse=RESPONSES.some(x=>x.id===d.response)?d.response:'empathy';g.anonymous=d.anonymous!==false;g.phase='duel1';timed(r,25,()=>advance(r))});
 socket.on('duelVote',d=>{const r=rooms.get(socket.data.roomCode),p=player(socket),g=r?.game;if(!g||!p||p.isHost||p.token===g.heroToken)return;const map=g.phase==='duel1'?g.duel1:g.phase==='duel2'?g.duel2:g.phase==='final'?g.finals:null,pair=roomView(r,p).game.pair;if(!map||map.has(p.token)||!pair.includes(d.choice))return;map.set(p.token,d.choice);maybeAdvance(r,map)});
 socket.on('responseSubmit',d=>{const r=rooms.get(socket.data.roomCode),p=player(socket),g=r?.game;if(!g||g.phase!=='response'||!p||p.isHost||p.token===g.heroToken||g.responses.has(p.token))return;if(!['표정·행동','말','상황','내 경험'].includes(d.reason)||!RESPONSES.some(x=>x.id===d.response))return socket.emit('errorMsg','판단 단서와 반응을 모두 선택해 주세요.');g.responses.set(p.token,{reason:d.reason,response:d.response});maybeAdvance(r,g.responses)});
 socket.on('forceAdvance',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(r?.game&&p?.isHost)advance(r)});
 socket.on('addTime',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(!r?.game||!p?.isHost)return;r.game.endsAt+=10000;broadcast(r)});
 socket.on('nextRound',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(r?.game?.phase==='reveal'&&p?.isHost)startRound(r)});
 socket.on('endGame',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(r&&p?.isHost)finish(r)});
 socket.on('disconnect',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(!r||!p)return;p.connected=false;p.socketId=null;broadcast(r);setTimeout(()=>{if(r.players.every(x=>!x.connected)){stopTimer(r);rooms.delete(r.code)}},30*60*1000)});
});
server.listen(PORT,()=>console.log(`True Mind Game listening on ${PORT}`));
