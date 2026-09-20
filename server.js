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

const RESPONSE_TEXTS=[
 ['너도 함께하고 싶었구나','다음에는 어떤 방식으로 같이하고 싶은지 말해볼래?','원하면 내가 먼저 친구들에게 같이 이야기해 볼게.','그냥 다음 약속에 끼면 되지.'],
 ['답을 기다리면서 마음이 쓰였겠다','답이 없을 때 어떤 생각이 가장 먼저 들었어?','개인 메시지로 확인해보는 걸 같이 생각해 볼까?','바빠서 그런 거겠지. 신경 쓰지 마.'],
 ['가까운 친구가 멀어진 것 같아 서운했구나','그 친구와 다시 이야기해보고 싶은 마음도 있어?','원하면 자연스럽게 말을 걸 방법을 같이 찾아보자.','친구는 또 만들면 되잖아.'],
 ['아무도 먼저 불러주지 않아 혼자인 것 같았겠다','어느 모둠에 들어가고 싶었는지 말해줄래?','내가 네 옆에 있어도 괜찮을까?','네가 먼저 가서 끼면 되지.'],
 ['허락 없이 사진이 올라와 많이 당황했겠다','사진에서 무엇이 가장 불편했어?','삭제를 요청하는 메시지를 같이 정리해 볼까?','사진 하나인데 너무 예민한 거 아니야?'],
 ['농담이 다르게 전해져 당황하고 걱정됐겠다','친구들에게 어떤 뜻이었다고 설명하고 싶어?','오해를 풀 수 있게 차분히 말할 자리를 만들어 보자.','농담도 못 받아들이면 어쩔 수 없지.'],
 ['믿고 보낸 말이 공개돼 배신당한 느낌이었겠다','그 친구에게 가장 확인하고 싶은 게 뭐야?','원하면 네 이야기가 더 퍼지지 않도록 함께 요청할게.','단체방에 올라간 건 그냥 잊어버려.'],
 ['계속 설명해도 안 믿어줘서 답답했겠다','사람들이 꼭 알아줬으면 하는 사실은 무엇이야?','오해가 커지지 않게 핵심을 같이 정리해 보자.','괜히 계속 해명해서 일을 키우는 거야.'],
 ['믿었던 친구라서 상처가 더 컸겠구나','그 친구에게 가장 바라는 것은 무엇이야?','지금 바로 말하기 어렵다면 내가 먼저 들어줄게.','비밀은 언젠가 알려질 수도 있지.'],
 ['소중한 물건인데 네 잘못처럼 말해서 억울했겠다','친구가 어떻게 해주면 마음이 풀릴 것 같아?','물건 상태와 있었던 일을 함께 차분히 확인해 보자.','빌려줬으면 망가질 수도 있지.'],
 ['하지 않은 일로 의심받아 많이 억울했겠다','사실을 설명할 때 필요한 증거나 사람이 있을까?','네 이야기를 먼저 끝까지 들어볼게.','평소에 잘했으면 오해받지 않았겠지.'],
 ['다시 믿어보려 했는데 또 상처받아 실망했구나','앞으로 그 친구와 어느 정도 거리를 두고 싶어?','네가 안전하게 관계를 정리하도록 곁에서 도울게.','또 믿은 네 잘못도 있는 것 같아.'],
 ['혼자 애쓴 시간이 인정받지 못한 것 같아 허탈했겠다','역할을 다시 나눈다면 무엇을 바꾸고 싶어?','다음에는 역할과 기여를 기록하는 방법을 같이 써보자.','결국 점수는 잘 받았으니 됐잖아.'],
 ['갑자기 책임을 떠안아 많이 부담스러웠겠다','발표 전에 어떤 도움이 가장 필요해?','자료 정리나 발표 연습 중 내가 도울 부분을 말해줘.','그냥 네가 발표를 잘하면 되는 거야.'],
 ['같은 의견인데 네 말은 무시돼 힘이 빠졌겠다','그 순간 어떤 말을 하고 싶었어?','다음에는 네 의견이 먼저 나왔다는 걸 내가 알려줄게.','좋은 의견이면 누가 말했든 상관없잖아.'],
 ['친구들에게 피해를 준 것 같아 마음이 무거웠겠다','친구들에게 어떻게 사과하고 다시 돕고 싶어?','실수를 고칠 수 있도록 할 일을 함께 나눠보자.','이미 실수했는데 미안해해도 소용없어.'],
 ['열심히 한 만큼 나오지 않아 허탈하고 속상했겠다','이번 결과에서 가장 아쉬운 부분은 무엇이야?','조금 쉰 뒤에 다음 계획을 함께 살펴보자.','공부가 부족했으니 점수가 낮은 거겠지.'],
 ['친구들은 정했는데 혼자 못 정한 것 같아 막막했겠다','학교를 고를 때 너에게 가장 중요한 기준은 뭐야?','정보를 하나씩 비교할 수 있도록 같이 표로 정리해 보자.','아무 학교나 빨리 정하면 되잖아.'],
 ['서로 다른 기대 사이에서 선택하기 부담스럽겠구나','다른 사람 의견 말고 네가 원하는 것은 무엇이야?','각 선택의 장단점을 정리하되 결정은 네가 하게 도울게.','부모님 말대로 하면 편하잖아.'],
 ['계속 비교당하니 점수보다 경쟁이 더 신경 쓰였겠다','친구에게 비교가 불편하다고 말하고 싶어?','다음에 비교할 때 사용할 말을 함께 연습해 보자.','점수가 높으면 신경 쓰이지 않을 텐데.'],
 ['혼자일 때 먼저 와준 친구가 참 고마웠겠구나','그 친구에게 어떤 마음을 전하고 싶어?','고마웠다는 말을 네 방식으로 전해보는 건 어때?','친구라면 그 정도는 당연히 하는 거야.'],
 ['긴장했는데 끝까지 응원받아 마음이 놓였겠구나','발표 중 가장 힘이 됐던 순간은 언제였어?','잘 해낸 점을 잊지 않도록 함께 돌아보자.','발표 하나 끝난 건데 뭘 그렇게 긴장해.'],
 ['도움이 실제로 힘이 됐다는 걸 느껴 뿌듯했겠구나','친구의 고맙다는 말 중 무엇이 가장 기억에 남아?','네가 가진 좋은 힘을 다음에도 나눌 수 있으면 좋겠다.','도와준 걸 너무 대단하게 생각하는 거 아니야?'],
 ['다시 이야기할 기회가 생겨 안심되면서도 조심스럽겠구나','답장하기 전에 어떤 점을 꼭 확인하고 싶어?','서두르지 않고 네가 준비됐을 때 대화하도록 도와줄게.','연락 왔으면 그냥 바로 화해하면 되지.']
];
const RESPONSE_KINDS=[['validate','마음을 알아주는 말'],['ask','마음을 더 묻는 말'],['support','함께 방법을 찾는 말'],['dismiss','마음을 가볍게 넘기는 말']];
S.forEach((scenario,index)=>{scenario.responses=RESPONSE_TEXTS[index].map((text,i)=>({id:RESPONSE_KINDS[i][0],label:RESPONSE_KINDS[i][1],text}))});

const clean=(v,n=30)=>String(v||'').trim().replace(/[<>]/g,'').slice(0,n);
const newCode=()=>{let c;do c=Math.random().toString(36).slice(2,6).toUpperCase();while(rooms.has(c));return c};
const newToken=()=>crypto.randomBytes(18).toString('base64url');
const player=(s)=>{const r=rooms.get(s.data.roomCode);return r&&r.players.find(p=>p.token===s.data.token)};
const activeStudents=r=>r.players.filter(p=>p.connected&&!p.isHost);
const roundStudents=(r,round=r.game?.round||1)=>activeStudents(r).filter(p=>(p.joinRound||1)<=round);
const voters=r=>roundStudents(r).filter(p=>p.token!==r.game?.heroToken);
const pubPlayer=p=>({id:p.id,name:p.name,avatar:p.avatar,score:p.score,isHost:p.isHost,connected:p.connected,joinRound:p.joinRound||1});
const countMap=(map)=>{const o={};for(const v of map.values())o[v]=(o[v]||0)+1;return Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([label,count])=>({label,count}))};

function roomView(r,v){const g=r.game,hero=g&&r.players.find(p=>p.token===g.heroToken),eligible=g?voters(r):[];
 let pair=null;if(g?.phase==='duel1')pair=g.scenario.options.slice(0,2);if(g?.phase==='duel2')pair=g.scenario.options.slice(2,4);
 if(g?.phase==='final'){const a=g.duel1.get(v?.token)||g.scenario.options[0],b=g.duel2.get(v?.token)||g.scenario.options[2];pair=[a,b]}
 const phaseMap=g?.phase==='duel1'?g.duel1:g?.phase==='duel2'?g.duel2:g?.phase==='final'?g.finals:g?.phase==='response'?g.responses:null;
 const submitted=phaseMap?[...phaseMap.keys()].filter(t=>eligible.some(p=>p.token===t)).length:0;
 return {code:r.code,status:r.status,settings:r.settings,players:r.players.map(pubPlayer),me:v?pubPlayer(v):null,game:!g?null:{
  round:g.round,maxRounds:r.settings.rounds,mode:g.mode,phase:g.phase,endsAt:g.endsAt,scenario:{category:g.scenario.category,text:g.scenario.text,clue:g.scenario.clue},
  heroId:hero?.id,heroName:g.anonymous?'이번 라운드의 주인공':hero?.name||'캐릭터',isHero:v?.token===g.heroToken,pair,
  emotions:EMOTIONS,responses:g.scenario.responses,tournamentOptions:g.scenario.options,eligible:v?.isHost||v?.token===g.heroToken||eligible.some(p=>p.token===v?.token),submitted,total:eligible.length,mySubmitted:phaseMap?.has(v?.token)||false,
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
 let hero=null;if(mode==='friend'){const students=roundStudents(r,round);hero=students[(round-1)%students.length]}
 r.game={round,mode,phase:mode==='friend'?'secret':'duel1',scenario,heroToken:hero?.token||null,anonymous:true,targetEmotion:mode==='character'?scenario.answer:null,secondary:null,desiredResponse:mode==='character'?'validate':null,duel1:new Map(),duel2:new Map(),finals:new Map(),responses:new Map()};
 timed(r,mode==='friend'?55:35,()=>mode==='friend'?fallbackSecret(r):advance(r));
}
function fallbackSecret(r){if(!r.game||r.game.phase!=='secret')return;r.game.targetEmotion=r.game.scenario.options[0];r.game.desiredResponse='validate';r.game.phase='duel1';timed(r,35,()=>advance(r))}
function advance(r){const g=r.game;if(!g)return;if(g.phase==='secret')return fallbackSecret(r);if(g.phase==='duel1')g.phase='duel2';else if(g.phase==='duel2')g.phase='final';else if(g.phase==='final')g.phase='response';else if(g.phase==='response')return reveal(r);else return;timed(r,g.phase==='response'?50:35,()=>advance(r))}
function maybeAdvance(r,map){const vs=voters(r);if(vs.length&&vs.every(p=>map.has(p.token)))advance(r);else broadcast(r)}
function reveal(r){if(!r.game||r.game.phase==='reveal')return;stopTimer(r);r.game.phase='reveal';for(const p of voters(r))if(r.game.finals.get(p.token)===r.game.targetEmotion)p.score+=10;timed(r,50,()=>startRound(r))}
function finish(r){stopTimer(r);r.status='finished';r.game=null;broadcast(r)}

io.on('connection',socket=>{
 socket.on('createRoom',d=>{const name=clean(d?.name);if(!name)return socket.emit('errorMsg','이름을 입력해 주세요.');const code=newCode(),p={token:newToken(),id:socket.id,socketId:socket.id,name,avatar:'🧑‍🏫',score:0,isHost:true,connected:true,joinRound:1};const r={code,status:'waiting',players:[p],settings:{mode:'mixed',duration:15,rounds:3},game:null,deck:[],timer:null};rooms.set(code,r);socket.join(code);socket.data={roomCode:code,token:p.token};socket.emit('session',{roomCode:code,playerToken:p.token});broadcast(r)});
 socket.on('joinRoom',d=>{const r=rooms.get(clean(d?.code,4).toUpperCase()),name=clean(d?.name);if(!r)return socket.emit('errorMsg','방을 찾을 수 없습니다.');if(!name)return socket.emit('errorMsg','이름을 입력해 주세요.');if(r.status==='finished')return socket.emit('errorMsg','이미 종료된 활동입니다.');if(r.players.length>=MAX)return socket.emit('errorMsg','방이 가득 찼습니다.');const icons=['🐰','🐼','🦊','🐯','🐶','🐱','🐨','🐹'],late=r.status==='playing',p={token:newToken(),id:socket.id,socketId:socket.id,name,avatar:icons[r.players.length%icons.length],score:0,isHost:false,connected:true,joinRound:late?(r.game?.round||0)+1:1};r.players.push(p);socket.join(r.code);socket.data={roomCode:r.code,token:p.token};socket.emit('session',{roomCode:r.code,playerToken:p.token});if(late)socket.emit('errorMsg','진행 중 입장했어요. 현재 라운드를 보고 다음 라운드부터 참여합니다.');broadcast(r)});
 socket.on('resume',d=>{const r=rooms.get(clean(d?.roomCode,4).toUpperCase()),p=r?.players.find(x=>x.token===d?.playerToken);if(!r||!p)return socket.emit('resumeFailed');p.id=socket.id;p.socketId=socket.id;p.connected=true;socket.join(r.code);socket.data={roomCode:r.code,token:p.token};broadcast(r)});
 socket.on('startGame',d=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(!r||!p?.isHost)return;if(activeStudents(r).length<2)return socket.emit('errorMsg','학생이 최소 2명 필요합니다.');const duration=[10,15,25].includes(+d.duration)?+d.duration:15,mode=['mixed','character','friend'].includes(d.mode)?d.mode:'mixed',rounds=Math.min(6,Math.max(2,+d.rounds||({10:2,15:3,25:5}[duration])));r.settings={duration,mode,rounds};r.deck=[...S].sort(()=>Math.random()-.5);r.players.forEach(x=>x.score=0);r.status='playing';r.game={round:0};startRound(r)});
 socket.on('secretSubmit',d=>{const r=rooms.get(socket.data.roomCode),p=player(socket),g=r?.game;if(!g||g.phase!=='secret'||p?.token!==g.heroToken)return;const emotion=g.scenario.options.includes(d.emotion)?d.emotion:null;if(!emotion)return socket.emit('errorMsg','가장 가까운 감정을 선택해 주세요.');g.targetEmotion=emotion;g.secondary=g.scenario.options.includes(d.secondary)&&d.secondary!==emotion?d.secondary:null;g.desiredResponse=g.scenario.responses.some(x=>x.id===d.response)?d.response:'validate';g.anonymous=d.anonymous!==false;g.phase='duel1';timed(r,35,()=>advance(r))});
 socket.on('duelVote',d=>{const r=rooms.get(socket.data.roomCode),p=player(socket),g=r?.game;if(!g||!p||!voters(r).some(x=>x.token===p.token))return;const map=g.phase==='duel1'?g.duel1:g.phase==='duel2'?g.duel2:g.phase==='final'?g.finals:null,pair=roomView(r,p).game.pair;if(!map||map.has(p.token)||!pair.includes(d.choice))return;map.set(p.token,d.choice);maybeAdvance(r,map)});
 socket.on('responseSubmit',d=>{const r=rooms.get(socket.data.roomCode),p=player(socket),g=r?.game;if(!g||g.phase!=='response'||!p||!voters(r).some(x=>x.token===p.token)||g.responses.has(p.token))return;if(!['표정·행동','말','상황','내 경험'].includes(d.reason)||!g.scenario.responses.some(x=>x.id===d.response))return socket.emit('errorMsg','판단 단서와 반응을 모두 선택해 주세요.');g.responses.set(p.token,{reason:d.reason,response:d.response});maybeAdvance(r,g.responses)});
 socket.on('forceAdvance',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(r?.game&&p?.isHost)advance(r)});
 socket.on('addTime',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(!r?.game||!p?.isHost)return;r.game.endsAt+=10000;broadcast(r)});
 socket.on('nextRound',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(r?.game?.phase==='reveal'&&p?.isHost)startRound(r)});
 socket.on('endGame',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(r&&p?.isHost)finish(r)});
 socket.on('disconnect',()=>{const r=rooms.get(socket.data.roomCode),p=player(socket);if(!r||!p)return;p.connected=false;p.socketId=null;broadcast(r);setTimeout(()=>{if(r.players.every(x=>!x.connected)){stopTimer(r);rooms.delete(r.code)}},30*60*1000)});
});
server.listen(PORT,()=>console.log(`True Mind Game listening on ${PORT}`));
