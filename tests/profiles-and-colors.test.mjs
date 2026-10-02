import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileFrom,applyLayoutProfile,deleteDocument} from '../app/workspace-store.js';
import {normalizeColor,DESIGN_COLORS} from '../app/color-palette.js';

test('Applying an arrangement preserves label content, chosen fonts and all colors',()=>{
 const current={text1:'M3',text2:'Schraube',fontFamily:'OpenSans',fontFamily2:'DejaVu',fontStyle:'Bold',text1Color:'#ff0000',text2Color:'#00ff00',baseColor:'#ffffff',textColor:'#000000',layoutMode:'auto',width:1,positions:{},selected:'screw'};
 const data=profileFrom({...current,width:2,layoutMode:'manual',positions:{text1:{x:3,y:4}},text1:'Must not replace text',baseColor:'#000000',fontFamily:'Other'});
 const applied=applyLayoutProfile(current,data);
 assert.equal(applied.width,2);assert.equal(applied.layoutMode,'manual');assert.deepEqual(applied.positions,{text1:{x:3,y:4}});
 for(const key of ['text1','text2','fontFamily','fontFamily2','fontStyle','text1Color','text2Color','baseColor','textColor','selected'])assert.equal(applied[key],current[key]);
 applied.positions.text1.x=99;assert.equal(data.layout.positions.text1.x,3);
});

test('The palette accepts HEX colors and never creates an invalid label color',()=>{
 assert.equal(normalizeColor(' Ff0088 '),'#ff0088');assert.equal(normalizeColor('#abc'),'#aabbcc');
 for(const value of ['#abcd','garbage','', '#zzzzzz','red'])assert.equal(normalizeColor(value),null);
 assert.equal(DESIGN_COLORS.length,60);for(const color of DESIGN_COLORS)assert.match(color,/^#[0-9a-f]{6}$/);
});


test('Delete errors identify an old server and require explicit success confirmation',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:false,status:405,json:async()=>({error:'Old server'})});
  await assert.rejects(()=>deleteDocument('projects',{id:'p',revision:1}),/Strg\+C/);
  globalThis.fetch=async()=>({ok:true,json:async()=>({ok:true})});
  await assert.rejects(()=>deleteDocument('profiles',{id:'p',revision:1}),/nicht bestätigt/);
 }finally{globalThis.fetch=original;}
});
