'use strict';
const palette=['#8062ef','#45a6f5','#20baaa','#fb9a62','#ef7297','#b083db','#e6bf47','#6181cc','#61cfa1','#ed8caa','#93a0df','#b7cb69'];
const sectors=['전력운영','방위력개선','병무행정'];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(n);
const signed=n=>(n>0?'+':'')+num(n);
const pct=n=>Number.isFinite(n)?(n>0?'+':'')+(n*100).toFixed(1)+'%':'산정 불가';
const money=n=>{const abs=Math.abs(n),sign=n<0?'−':'';return abs>=10000?sign+Math.floor(abs/10000)+'조 '+num(abs%10000)+'억':sign+num(abs)+'억';};
const compact=n=>Math.abs(n)>=10000?(n/10000).toFixed(1)+'조':num(n)+'억';
const rate=(a,b)=>a===0?(b===0?0:NaN):(b-a)/a;
const data=window.BUDGET_DATA.map((r,i)=>({...r,id:i,diff:r.y2027-r.y2026,rate:rate(r.y2026,r.y2027)}));
const group=(rows,key)=>{const m=new Map();rows.forEach(r=>{const k=r[key];if(!m.has(k))m.set(k,{name:k,y2026:0,y2027:0,diff:0});const t=m.get(k);t.y2026+=r.y2026;t.y2027+=r.y2027;t.diff+=r.diff;});return [...m.values()];};
const totals=rows=>rows.reduce((s,r)=>({a:s.a+r.y2026,b:s.b+r.y2027}),{a:0,b:0});
let filtered=data,sortKey='y2027',sortDir=-1;
function options(el,values,label){const previous=el.value;el.innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(values.includes(previous))el.value=previous;}
options($('sector'),sectors,'전체 부문');
function accounts(){options($('account'),[...new Set(data.filter(r=>!$('sector').value||r.sector===$('sector').value).map(r=>r.account))],'전체 회계구분');}
accounts();
const tip=(name,a,b)=>`${name}\n2026년 ${num(a)}억 원\n2027년 ${num(b)}억 원\n증감 ${signed(b-a)}억 원 (${pct(rate(a,b))})`;
const attrs=t=>`data-tip="${esc(t)}" tabindex="0"`;
const svg=(w,h,content)=>`<svg viewBox="0 0 ${w} ${h}" role="img">${content}</svg>`;
const text=(x,y,t,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(t)}</text>`;
const line=(x1,y1,x2,y2,color='#edf0f7',dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${dash?'stroke-dasharray="'+dash+'"':''}/>`;
const rect=(x,y,w,h,c,t='',rx=4)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" rx="${rx}" fill="${c}" ${t?attrs(t):''}/>`;
function empty(id){$(id).innerHTML='<div class="empty">선택 조건에 해당하는 데이터가 없습니다.</div>';}
function sectorChart(){
 const rows=group(filtered,'sector'),w=600,h=275,L=75,R=70,T=25,B=32,max=Math.max(...rows.flatMap(r=>[Math.abs(r.y2026),Math.abs(r.y2027)]),1),neg=rows.some(r=>r.y2026<0||r.y2027<0),min=neg?-max:0,scale=v=>L+(v-min)/(max-min)*(w-L-R),zero=scale(0);let out='';
 for(let i=0;i<=4;i++){const v=min+(max-min)*i/4,x=scale(v);out+=line(x,T,x,h-B)+text(x,h-10,compact(v),'','middle');}
 const step=(h-T-B)/Math.max(rows.length,1);
 rows.forEach((r,i)=>{const y=T+i*step+step*.25;out+=text(L-10,y+15,r.name,'strong','end');[['y2026','#b5c9f5'],['y2027','#8062ef']].forEach(([k,c],j)=>{const x=scale(r[k]);out+=rect(Math.min(zero,x),y+j*19,Math.abs(x-zero),14,c,tip(r.name,r.y2026,r.y2027));});out+=text(Math.max(zero,scale(r.y2027))+6,y+31,compact(r.y2027),'strong');});
 $('sector-chart').innerHTML=svg(w,h,out);
}
function donutChart(){
 const rows=group(filtered.filter(r=>r.y2027>0),'account'),total=rows.reduce((s,r)=>s+r.y2027,0);if(!total)return empty('donut-chart');
 const w=400,h=235,cx=200,cy=114,r=79,circ=2*Math.PI*r;let offset=0,out=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1eefb" stroke-width="27"/>`;
 rows.forEach((row,i)=>{const len=row.y2027/total*circ;out+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${palette[i]}" stroke-width="27" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" ${attrs(row.name+'\n'+num(row.y2027)+'억 원\n비중 '+(row.y2027/total*100).toFixed(1)+'%')}/>`;offset+=len;});
 out+=text(cx,cy-4,'2027년 양수 재원','','middle')+`<text x="${cx}" y="${cy+22}" text-anchor="middle" style="font-size:21px;fill:#514270;font-weight:800">${compact(total)}</text>`;
 $('donut-chart').innerHTML=svg(w,h,out)+'<div class="donut-legend">'+rows.map((r,i)=>`<span><i style="background:${palette[i]}"></i>${esc(r.name)}<b>${(r.y2027/total*100).toFixed(1)}%</b></span>`).join('')+'</div>';
}
function yearChart(){
 const {a,b}=totals(filtered),w=400,h=275,baseline=220,max=Math.max(Math.abs(a),Math.abs(b),1);let out='';
 out+=line(35,baseline,365,baseline);[a,b].forEach((v,i)=>{const x=85+i*160,bh=Math.abs(v)/max*155;out+=rect(x,baseline-bh,70,bh,i?'#8062ef':'#45a6f5',`${2026+i}년\n${num(v)}억 원`,9)+text(x+35,baseline-bh-13,compact(v),'strong','middle')+text(x+35,250,String(2026+i),'strong','middle');});
 out+=`<rect x="126" y="9" width="150" height="28" rx="14" fill="#f3edff"/>`+text(201,28,'전년 대비 '+pct(rate(a,b)),'strong','middle');
 if(a<0||b<0)out+=text(200,272,'차감액 크기 기준 막대 · 금액은 부호 포함','','middle');
 $('year-chart').innerHTML=svg(w,h,out);
}
function treemap(){
 const all=filtered.filter(r=>r.y2027>0).sort((a,b)=>b.y2027-a.y2027),rows=all.slice(0,12).map(r=>({name:r.program,value:r.y2027}));
 if(all.length>12)rows.push({name:'기타 '+(all.length-12)+'개',value:all.slice(12).reduce((s,r)=>s+r.y2027,0)});
 if(!rows.length)return empty('treemap-chart');
 const w=600,h=260,total=rows.reduce((s,r)=>s+r.value,0);let out='';
 function tile(items,x,y,width,height){if(!items.length)return;if(items.length===1){const r=items[0],i=rows.indexOf(r);out+=rect(x+2,y+2,width-4,height-4,palette[i%palette.length],r.name+'\n'+num(r.value)+'억 원\n'+(r.value/total*100).toFixed(1)+'%',7);const cap=Math.floor((width-16)/11);if(width>42&&height>27){out+=`<text x="${x+10}" y="${y+21}" style="fill:white;font-size:11px;font-weight:700">${esc(cap<r.name.length?r.name.slice(0,Math.max(1,cap-1))+'…':r.name)}</text>`;if(height>52)out+=`<text x="${x+10}" y="${y+42}" style="fill:white;font-size:10px">${compact(r.value)}</text>`;}return;}
 const sum=items.reduce((s,r)=>s+r.value,0);let split=1,left=items[0].value;while(split<items.length-1&&left+items[split].value<=sum*.57){left+=items[split++].value;}const p=left/sum;
 if(width>=height){tile(items.slice(0,split),x,y,width*p,height);tile(items.slice(split),x+width*p,y,width*(1-p),height);}else{tile(items.slice(0,split),x,y,width,height*p);tile(items.slice(split),x,y+height*p,width,height*(1-p));}}
 tile(rows,0,0,w,h);$('treemap-chart').innerHTML=svg(w,h,out);
}
function horizontal(id,rows,key,{diverging=false,height=320,rateMode=false}={}){
 if(!rows.length)return empty(id);const w=600,L=190,R=85,T=12,B=25,max=Math.max(...rows.map(r=>Math.abs(r[key])),.001),span=w-L-R,zero=diverging?L+span*.45:L,posSpan=diverging?span*.55:span,negSpan=span*.45;let out='';
 out+=line(zero,0,zero,height-B,'#dce2ee');const step=(height-T-B)/rows.length;
 rows.forEach((r,i)=>{const v=r[key],bw=Math.abs(v)/max*(diverging&&v<0?negSpan:posSpan),y=T+i*step;out+=text(L-10,y+step*.58,r.name||r.program,'','end');const color=diverging?(v<0?'#ef7b89':'#8c6aee'):palette[i%palette.length];out+=rect(v<0&&diverging?zero-bw:zero,y+step*.17,bw,step*.6,color,r.program?tip(r.program,r.y2026,r.y2027):tip(r.name,r.y2026,r.y2027));out+=text((v<0&&diverging?zero-bw:zero+bw)+6,y+step*.58,rateMode?pct(v):signed(v),'strong');});
 $(id).innerHTML=svg(w,height,out);
}
function heatmap(){
 const ss=[...new Set(filtered.map(r=>r.sector))],aa=[...new Set(filtered.map(r=>r.account))],cells=ss.map(s=>aa.map(a=>filtered.filter(r=>r.sector===s&&r.account===a))),max=Math.max(...cells.flat().map(c=>Math.abs(totals(c).b)),1);
 let html=`<div class="heatmap" style="--cols:${aa.length}"><div class="hm-row hm-head"><div></div>${aa.map(a=>'<div>'+esc(a)+'</div>').join('')}</div>`;
 ss.forEach((s,i)=>{html+='<div class="hm-row"><div>'+esc(s)+'</div>'+aa.map((a,j)=>{const r=cells[i][j],{a:x,b}=totals(r),alpha=.13+Math.abs(b)/max*.8;return `<div style="background:${r.length?(b<0?'rgba(239,114,151,'+alpha+')':'rgba(128,98,239,'+alpha+')'):'#f5f6fb'};color:${Math.abs(b)/max>.5?'white':'#67568b'}" ${r.length?attrs(tip(s+' / '+a,x,b)):''}>${r.length?num(b):'—'}</div>`;}).join('')+'</div>';});$('heatmap-chart').innerHTML=html+'</div>';
}
function scatter(){
 const rows=filtered.filter(r=>r.y2026>0&&Number.isFinite(r.rate));if(!rows.length)return empty('scatter-chart');
 const w=460,h=320,L=53,R=20,T=20,B=50,xmax=Math.max(...rows.map(r=>r.y2027),1)*1.08,ymin=Math.min(0,...rows.map(r=>r.rate))-.06,ymax=Math.max(.05,...rows.map(r=>r.rate))+.08,x=v=>L+v/xmax*(w-L-R),y=v=>h-B-(v-ymin)/(ymax-ymin)*(h-T-B);let out='';
 for(let i=0;i<=4;i++){const yy=ymin+(ymax-ymin)*i/4,xx=xmax*i/4;out+=line(L,y(yy),w-R,y(yy))+text(L-8,y(yy)+3,(yy*100).toFixed(0)+'%','','end')+text(x(xx),h-B+19,compact(xx),'','middle');}
 out+=line(L,y(0),w-R,y(0),'#b9c4d8','4 4');rows.forEach(r=>{out+=`<circle cx="${x(r.y2027)}" cy="${y(r.rate)}" r="${6+Math.sqrt(r.y2027/xmax)*12}" fill="${palette[sectors.indexOf(r.sector)]}" fill-opacity=".7" stroke="white" stroke-width="2" ${attrs(tip(r.program,r.y2026,r.y2027))}/>`;});out+=text(w/2,h-6,'예산 규모 (억 원)','','middle');$('scatter-chart').innerHTML=svg(w,h,out);
}
function table(){
 const q=$('search').value.trim().toLowerCase();const rows=filtered.filter(r=>[r.category,r.program,r.sector,r.account].some(s=>s.toLowerCase().includes(q))).sort((a,b)=>typeof a[sortKey]==='number'?(a[sortKey]-b[sortKey])*sortDir:String(a[sortKey]).localeCompare(String(b[sortKey]),'ko')*sortDir);
 $('table-body').innerHTML=rows.length?rows.map(r=>`<tr><td><span class="pill">${esc(r.sector)}</span></td><td>${esc(r.account)}</td><td>${esc(r.category)}</td><td>${esc(r.program)}</td><td class="num">${num(r.y2026)}</td><td class="num"><b>${num(r.y2027)}</b></td><td class="num ${r.diff<0?'negative':'positive'}">${signed(r.diff)}</td><td class="num ${r.rate<0?'negative':'positive'}">${pct(r.rate)}</td></tr>`).join(''):'<tr><td colspan="8" style="text-align:center;padding:30px">검색 결과가 없습니다.</td></tr>';
 const {a,b}=totals(rows);$('table-summary').textContent=`표시 ${rows.length}개 · 2026년 합계 ${num(a)}억 원 · 2027년 합계 ${num(b)}억 원 · 증감 ${signed(b-a)}억 원`;
}
function update(){
 const sector=$('sector').value,account=$('account').value;filtered=data.filter(r=>(!sector||r.sector===sector)&&(!account||r.account===account));const {a,b}=totals(filtered);
 $('selection-label').textContent=(sector||'전체 부문')+' · '+(account||'전체 회계구분');$('row-count').textContent=filtered.length+'개 상세 항목';
 $('kpi27').textContent=money(b);$('kpi26').textContent=money(a);$('kpiDiff').textContent=(b-a>0?'+':'')+money(b-a);$('kpiRate').textContent='2026년 대비 '+pct(rate(a,b));$('kpiPrograms').textContent=filtered.length+'개';$('kpiMovement').textContent=`증가 ${filtered.filter(r=>r.diff>0).length} · 감소 ${filtered.filter(r=>r.diff<0).length} · 동일 ${filtered.filter(r=>r.diff===0).length}`;
 if(!filtered.length){['sector-chart','donut-chart','year-chart','treemap-chart','ranking-chart','heatmap-chart','change-chart','scatter-chart','contribution-chart','growth-chart'].forEach(empty);table();return;}
 sectorChart();donutChart();yearChart();treemap();heatmap();scatter();
 const ranked=[...filtered].sort((a,b)=>b.y2027-a.y2027).slice(0,10);
 horizontal('ranking-chart',ranked,'y2027',{diverging:ranked.some(r=>r.y2027<0)});
 horizontal('change-chart',[...filtered].sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff)).slice(0,10),'diff',{diverging:true});
 horizontal('contribution-chart',group(filtered,'sector'),'diff',{diverging:true,height:260});
 horizontal('growth-chart',filtered.filter(r=>r.y2026>0).sort((a,b)=>b.rate-a.rate).slice(0,8),'rate',{diverging:true,height:260,rateMode:true});table();
}
$('sector').addEventListener('change',()=>{accounts();update();});$('account').addEventListener('change',update);$('search').addEventListener('input',table);$('reset').addEventListener('click',()=>{$('sector').value='';accounts();$('account').value='';$('search').value='';update();});
document.querySelectorAll('th[data-key]').forEach(th=>{th.tabIndex=0;const change=()=>{sortDir=sortKey===th.dataset.key?-sortDir:1;sortKey=th.dataset.key;table();};th.addEventListener('click',change);th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();change();}});});
$('download').addEventListener('click',()=>{const csv=[['부문','회계구분','구분','프로그램명','2026년(억원)','2027년(억원)','증감(억원)','증감률(%)'],...filtered.map(r=>[r.sector,r.account,r.category,r.program,r.y2026,r.y2027,r.diff,Number.isFinite(r.rate)?(r.rate*100).toFixed(3):''])].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='국방예산_선택데이터.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const tooltip=$('tooltip');document.addEventListener('pointermove',e=>{const el=e.target.closest('[data-tip]');if(!el){tooltip.style.display='none';return;}tooltip.textContent=el.dataset.tip;tooltip.style.display='block';const box=tooltip.getBoundingClientRect();tooltip.style.left=Math.min(e.clientX+14,innerWidth-box.width-12)+'px';tooltip.style.top=Math.max(10,Math.min(e.clientY+14,innerHeight-box.height-12))+'px';});
document.addEventListener('focusin',e=>{if(e.target.dataset.tip){tooltip.textContent=e.target.dataset.tip;tooltip.style.display='block';const b=e.target.getBoundingClientRect();tooltip.style.left=Math.min(b.left,innerWidth-310)+'px';tooltip.style.top=Math.min(b.bottom+5,innerHeight-130)+'px';}});document.addEventListener('focusout',()=>tooltip.style.display='none');
update();
