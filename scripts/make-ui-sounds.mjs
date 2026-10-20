// Deterministic, original placeholder cues. Replace these WAVs with your own.
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const folder=new URL('../assets/arcade/',import.meta.url);await mkdir(folder,{recursive:true});
const cues={hover:{notes:[1100],step:.035,length:.075},click:{notes:[620,930],step:.035,length:.13},transition:{notes:[390,585,780],step:.045,length:.23},'rank-up':{notes:[523.25,659.25,783.99,1046.5],step:.11,length:.78}};
for(const [name,cue] of Object.entries(cues)){
  const rate=22050,count=Math.ceil(rate*cue.length),out=Buffer.alloc(44+count*2);
  out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++){const t=i/rate;let sample=0;for(let n=0;n<cue.notes.length;n++){const age=t-n*cue.step;if(age>=0){const envelope=Math.min(1,age/.006)*Math.exp(-age/(name==='rank-up'?.14:.028));sample+=Math.sin(2*Math.PI*cue.notes[n]*age)*envelope*.19;}}const tail=Math.min(1,(cue.length-t)/.025);out.writeInt16LE(Math.round(Math.max(-.8,Math.min(.8,sample))*tail*32767),44+i*2);}
  await writeFile(new URL(name+'.wav',folder),out);
}
console.log('Created hover, click, transition and rank-up WAV placeholders in '+fileURLToPath(folder));
