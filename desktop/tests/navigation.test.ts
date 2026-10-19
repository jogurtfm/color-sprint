import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presentMode,minimizeVisor} from '../src/navigation';

test('rim releases the visor while windowed visor restores a minimized main surface',()=>{
  const calls:string[]=[];
  const main={setFullScreen:(v:boolean)=>calls.push('full:'+v),setAlwaysOnTop:(v:boolean)=>calls.push('top:'+v),hide:()=>calls.push('hide'),show:()=>calls.push('show'),focus:()=>calls.push('focus'),isMinimized:()=>true,restore:()=>calls.push('restore')};
  const rim={show:()=>calls.push('rim-show'),hide:()=>calls.push('rim-hide')};
  const area={x:0,y:0,width:1920,height:1080};
  presentMode('rim',main,rim,area,false);
  assert.deepEqual(calls,['full:false','hide','top:false','rim-show']);calls.length=0;
  presentMode('visor',main,rim,area,true,true);
  assert.deepEqual(calls,['rim-hide','restore','top:true','full:false','show','focus']);
});

test('minimize exits native fullscreen before minimizing, rather than switching to rim',()=>{
  const calls:string[]=[];let left:(()=>void)|undefined;
  const main={isFullScreen:()=>true,setFullScreen:(v:boolean)=>calls.push('full:'+v),minimize:()=>calls.push('minimize'),once:(_event:string,fn:()=>void)=>{left=fn;}};
  minimizeVisor(main);assert.deepEqual(calls,['full:false']);left!();assert.deepEqual(calls,['full:false','minimize']);
  calls.length=0;minimizeVisor({...main,isFullScreen:()=>false});assert.deepEqual(calls,['minimize']);
});
