import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {screwGroups,bounds,iconGeometry} from '../app/geometry.js';
import {screwConfig,screwChoices} from '../app/screw-config.js';

const directory=new URL('../bibliothek/schrauben/',import.meta.url);
const parts=Object.fromEntries(readdirSync(directory).filter(p=>p.endsWith('.json')).map(p=>[p.slice(0,-5),JSON.parse(readFileSync(new URL(p,directory),'utf8'))]));
const config={fastenerHead:'socket',fastenerDriver:'hex',fastenerDriverPosition:'head',fastenerShaft:'machine',fastenerThreads:'full',fastenerFlange:false,fastenerSecurity:false};

test('Separate drives have a clear gap on either side for every screw option',()=>{
 for(const fastenerHead of screwChoices.fastenerHead)for(const fastenerDriver of screwChoices.fastenerDriver.filter(d=>d!=='none'))for(const fastenerShaft of screwChoices.fastenerShaft)for(const fastenerThreads of screwChoices.fastenerThreads)for(const fastenerFlange of [false,true]){
  const base={...config,fastenerHead,fastenerDriver,fastenerShaft,fastenerThreads,fastenerFlange};
  const body=bounds(screwGroups({...base,fastenerDriver:'none'},parts).flatMap(g=>g.contours));
  for(const side of ['left','right']){
   const groups=screwGroups({...base,fastenerDriverPosition:side,fastenerSecurity:true},parts);
   const face=bounds(groups.at(-2).contours),pin=bounds(groups.at(-1).contours);
   const gap=side==='left'?body.x-face.x-face.w:face.x-body.x-body.w;
   assert.ok(gap>=1.4999,JSON.stringify({...base,side,gap}));
   assert.ok(pin.x>=face.x&&pin.x+pin.w<=face.x+face.w);
   assert.ok(groups.slice(0,-2).every(g=>!g.subtract?.length));
  }
 }
});

test('Fallback drive holes and security pins move with the left drive face',()=>{
 const fallback={...parts};delete fallback['face-hex'];
 const groups=screwGroups({...config,fastenerDriverPosition:'left',fastenerSecurity:true},fallback);
 const face=bounds(groups.at(-2).contours),hole=bounds(groups.at(-2).subtract),pin=bounds(groups.at(-1).contours);
 assert.ok(hole.x>=face.x&&hole.x+hole.w<=face.x+face.w);
 assert.ok(Math.abs(pin.x+pin.w/2-(face.x+face.w/2))<.0001);
});

test('Drive position preserves screw orientation, legacy settings and saved config',()=>{
 const icon={id:'mw-fastener'};
 const left=iconGeometry(icon,{...config,fastenerDriverPosition:'left'},parts);
 const right=iconGeometry(icon,{...config,fastenerDriverPosition:'right'},parts);
 assert.ok(Math.abs(left.width-right.width)<.0001);assert.equal(left.height,right.height);
 // Choosing a side translates the body; it does not mirror the screw or its drive.
 for(let i=0;i<2;i++)assert.deepEqual(left.groups[i].contours.map(c=>c.map(([x,y])=>[Math.round((x-9.5)*1e5)/1e5,y])),right.groups[i].contours);
 for(const side of ['head','left','right'])assert.equal(screwConfig({...config,fastenerDriverPosition:side}).fastenerDriverPosition,side);
 const inHead=screwGroups(config,parts);assert.ok(inHead[0].subtract.length);
 const withoutDriver=screwGroups({...config,fastenerDriver:'none',fastenerDriverPosition:'left',fastenerSecurity:true},parts);
 assert.equal(withoutDriver.length,2);
});
