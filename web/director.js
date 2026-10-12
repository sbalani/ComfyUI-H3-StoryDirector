import { app } from '../../scripts/app.js';
import { api } from '../../scripts/api.js';

function editPlan(node) {
  const widget = name => node.widgets.find(w => w.name === name);
  let plan;
  try {
    const saved = widget('plan_json').value;
    plan = JSON.parse(widget('mode').value === 'Use edited plan + render' && saved.trim() ? saved : node._directorPlan || saved);
    if (!Array.isArray(plan.shots)) throw Error('No shots');
  } catch { alert('Run Plan only first to create a shot plan.'); return; }
  const dialog = document.createElement('dialog');
  dialog.style.cssText = 'background:#18212b;color:#eef3f8;border:1px solid #557088;border-radius:12px;width:min(920px,90vw);max-height:88vh;padding:24px;font:15px system-ui;';
  const el = (tag, text, parent) => { const x = document.createElement(tag); if (text) x.textContent = text; parent?.append(x); return x; };
  el('h2', 'Edit your film', dialog);
  el('p', 'Each card is a separately rendered clip. Set 5–15 seconds. Raise Take to rerender one clip; unchanged clips are reused. This creates hard cuts.', dialog);
  const total = el('p', '', dialog);
  const list = el('div', '', dialog);
  const updateTotal = () => { total.textContent = `${plan.shots.length} clips · ${plan.shots.reduce((a,s)=>a+Number(s.seconds || 0),0).toFixed(2)} seconds`; };
  const btn = (text, parent, fn) => { const b=el('button',text,parent); b.type='button'; b.style.cssText='margin:5px;padding:8px 12px;cursor:pointer;'; b.onclick=fn; return b; };
  const redraw = () => {
    list.replaceChildren();
    plan.shots.forEach((s,i) => {
      const card=el('section','',list); card.style.cssText='border:1px solid #4b647a;background:#202d3a;border-radius:8px;padding:14px;margin:12px 0;';
      const header=el('div','',card); el('strong',`Clip ${i+1}`,header);
      btn('↑',header,()=>{if(i){[plan.shots[i-1],plan.shots[i]]=[s,plan.shots[i-1]];redraw();}});
      btn('↓',header,()=>{if(i+1<plan.shots.length){[plan.shots[i+1],plan.shots[i]]=[s,plan.shots[i+1]];redraw();}});
      btn('Remove',header,()=>{if(plan.shots.length>1){plan.shots.splice(i,1);redraw();}});
      const field=(label,key,type='text')=>{
        const wrap=el('label',label,card);wrap.style.cssText='display:block;margin:10px 0;';
        const input=el(type==='textarea'?'textarea':'input','',wrap);
        if(type!=='textarea')input.type=type;
        input.value=s[key]??(key==='take'?0:'');
        input.style.cssText='display:block;box-sizing:border-box;width:100%;padding:8px;margin-top:4px;background:#101a24;color:#fff;border:1px solid #5d7388;border-radius:4px;';
        if(type==='textarea')input.rows=key==='description'?4:2;
        if(key==='seconds'){input.min=5;input.max=15;input.step=0.25;}
        if(key==='take'){input.min=0;input.max=100000;input.step=1;}
        input.oninput=()=>{s[key]=type==='number'?Number(input.value):input.value;updateTotal();};
      };
      field('Shot title','title');field('Seconds','seconds','number');field('Camera and action','description','textarea');field('Sound / spoken lines','sound','textarea');field('Take number (increase for a different performance)','take','number');
    });
    updateTotal();
  };
  redraw();
  const controls=el('div','',dialog);
  dialog.insertBefore(controls,list);
  controls.style.cssText='position:sticky;top:0;background:#18212b;padding:6px 0;z-index:2;';
  btn('Add clip',controls,()=>{if(plan.shots.length<12){plan.shots.push({title:'New shot',seconds:5,description:'',sound:'Quiet room ambience.',take:0});redraw();}});
  btn('Save plan & use it',controls,()=>{
    if(plan.shots.some(s=>!s.title?.trim()||!s.description?.trim()||!s.sound?.trim()||!Number.isFinite(s.seconds)||s.seconds<5||s.seconds>15||!Number.isInteger(s.take??0)||(s.take??0)<0||(s.take??0)>100000)){
      alert('Give each clip a title, action, sound, 5–15 seconds, and a whole Take number from 0 to 100000.');return;
    }
    widget('plan_json').value=JSON.stringify(plan,null,2);
    widget('mode').value='Use edited plan + render';
    node.setDirtyCanvas(true,true);dialog.close();
  });
  btn('Cancel',controls,()=>dialog.close());
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}

app.registerExtension({
  name:'H3.StoryDirector',
  async setup() {
    api.addEventListener('h3_director_status', e => {
      const node=app.graph.getNodeById(e.detail.node);
      const w=node?.widgets?.find(w=>w.name==='Production status');
      if(w){w.value=e.detail.message;node.setDirtyCanvas(true,true);}
    });
  },
  async beforeRegisterNodeDef(nodeType,nodeData) {
    if(!['H3StoryPlanner','H3StoryRender'].includes(nodeData.name))return;
    const created=nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated=function(){
      created?.apply(this,arguments);
      if(nodeData.name==='H3StoryRender'){
        this.addWidget('text','Production status','Ready',()=>{}, {serialize:false});
        return;
      }
      const seedControl=this.widgets.find(w=>w.name==='control_after_generate');
      if(seedControl)seedControl.value='fixed';
      this.addWidget('button','Edit shot plan',null,()=>editPlan(this),{serialize:false});
      this.addWidget('button','Use latest plan for editing / resume',null,()=>{
        if(!this._directorPlan){alert('Run Plan only or Auto plan + render once first.');return;}
        this.widgets.find(w=>w.name==='plan_json').value=this._directorPlan;
        this.widgets.find(w=>w.name==='mode').value='Use edited plan + render';
        this.setDirtyCanvas(true,true);
      },{serialize:false});
    };
    if(nodeData.name==='H3StoryPlanner'){
      const executed=nodeType.prototype.onExecuted;
      nodeType.prototype.onExecuted=function(message){
        executed?.apply(this,arguments);
        if(message.director_plan?.[0])this._directorPlan=message.director_plan[0];
      };
    }
  }
});
