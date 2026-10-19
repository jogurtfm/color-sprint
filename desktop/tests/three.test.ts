import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HudVisual,viewBounds,type VisualKind,type VisualState} from '../src/three-scene';
import * as THREE from 'three';
const state:VisualState={accent:'#ea9999',progress:.5,phase:'standby',hover:false,quality:'cinematic',motion:true};
const all:VisualKind[]=['reactor','program','sphere','terrain'];

test('every GPU surface constructs actual Three scenes, geometry, perspective cameras and finite bounds',()=>{
  for(const kind of all){const visual=new HudVisual(kind);visual.resize(1);visual.update(2,.025,state);assert.ok(visual.scene instanceof THREE.Scene);assert.ok(visual.camera instanceof THREE.PerspectiveCamera);let count=0;visual.scene.traverse(object=>{const geometry=(object as THREE.Mesh).geometry;if(!geometry)return;count++;geometry.computeBoundingBox();assert.ok(Number.isFinite(geometry.boundingBox!.min.x),kind);assert.ok(geometry.getAttribute('position').count>0);});assert.ok(count>0,kind);visual.dispose();assert.equal(visual.scene.children.length,0);}
});
test('reactor uses independent 3D gimbals and progress geometry, not DOM rotations',()=>{
  const v=new HudVisual('reactor');v.resize(1);v.update(0,.025,{...state,progress:0});const progress=v.root.getObjectByName('focus-progress') as THREE.Line;assert.ok(progress);assert.equal(progress.visible,false);v.update(1,.025,{...state,progress:.5});assert.equal(progress.geometry.drawRange.count,49);assert.equal(progress.visible,true);assert.equal(progress.material instanceof THREE.LineBasicMaterial,true);const rotor=v.root.getObjectByName('mechanical-gimbal')!;const angle=rotor.rotation.y;v.update(2,.05,state);assert.notEqual(rotor.rotation.y,angle);v.dispose();
});
test('reduced motion freezes rotation and terrain while hover changes only visual geometry',()=>{
  const v=new HudVisual('program');v.resize(1);v.update(0,.025,state);const rotation=v.root.children[0].rotation.clone();v.update(9,.05,{...state,motion:false,hover:true});assert.deepEqual(v.root.children[0].rotation.toArray(),rotation.toArray());assert.equal(v.root.position.y,0);assert.ok(v.root.scale.x>1.65);v.dispose();
  const t=new HudVisual('terrain');t.update(8,.02,{...state,motion:false});const mesh=t.root.children[0] as THREE.Mesh;assert.equal((mesh.material as THREE.ShaderMaterial).uniforms.uTime.value,0);t.dispose();
});
test('reactor has lit solid sectors with no bevel-edge bands and a clear readout aperture',()=>{
  const v=new HudVisual('reactor');assert.equal(v.root.children.filter(o=>o.name==='outer-armor').length,6);v.root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;assert.ok(o.material instanceof THREE.MeshStandardMaterial);assert.equal((o.geometry as THREE.ExtrudeGeometry).parameters.options.bevelEnabled,false);const positions=o.geometry.getAttribute('position');for(let i=0;i<positions.count;i++)assert.ok(Math.hypot(positions.getX(i),positions.getY(i))>.9);});let count=0;v.scene.traverse(o=>{if(o instanceof THREE.Light)count++;});assert.equal(count,3);v.resize(3);assert.equal(v.camera.aspect,3);v.dispose();
});
test('a completion pulse expands and fades, with no persistent synthetic task metrics',()=>{
  const v=new HudVisual('reactor'),pulse=v.root.children.find(o=>o instanceof THREE.Points) as THREE.Points;assert.equal((pulse.material as THREE.PointsMaterial).opacity,0);v.complete();v.update(.02,.02,state);assert.ok((pulse.material as THREE.PointsMaterial).opacity>.8);assert.ok(pulse.scale.x>1);for(let i=0;i<30;i++)v.update(i,.06,state);assert.equal((pulse.material as THREE.PointsMaterial).opacity,0);v.dispose();
});
test('quiet hides scene roots and focus engagement slows ambient rotation',()=>{
  const a=new HudVisual('program'),b=new HudVisual('program');a.update(1,.05,state);b.update(1,.05,{...state,phase:'engaged'});assert.ok(a.root.children[0].rotation.y>b.root.children[0].rotation.y);b.update(1,0,{...state,quality:'quiet'});assert.equal(b.root.visible,false);a.dispose();b.dispose();
});
test('all generated GPU geometries and materials are disposed exactly once',()=>{
  for(const kind of all){const v=new HudVisual(kind);v.resize(2);const resources=new Set<THREE.BufferGeometry|THREE.Material>();v.scene.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)resources.add(mesh.geometry);if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])resources.add(material);});const counts=new Map<object,number>();for(const r of resources){counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)!+1));}v.dispose();for(const value of counts.values())assert.equal(value,1,kind);}
});
test('globe uses latitude-longitude segments and five programs have different sculpted cores',()=>{const v=new HudVisual('sphere');const sphere=v.root.getObjectByName('latitude-longitude') as THREE.LineSegments;assert.ok(sphere);assert.ok(sphere.geometry instanceof THREE.BufferGeometry);assert.equal(sphere.geometry.index,null);assert.equal(v.root.children.length,2);v.dispose();const silhouettes=[];for(let i=0;i<5;i++){const app=new HudVisual('program',i);silhouettes.push(app.root.children[0].children.filter(o=>o instanceof THREE.Mesh).map(o=>(o as THREE.Mesh).geometry.type).join(','));app.dispose();}assert.equal(new Set(silhouettes).size,5);});
test('instrument geometry has a bounded draw workload, with no per-task GPU objects',()=>{for(const kind of all){const v=new HudVisual(kind);let draws=0;v.scene.traverse(o=>{if((o as THREE.Mesh).geometry)draws++;});assert.ok(draws<20,kind);v.dispose();}});
test('scissor cropping clips offscreen surfaces without stretching or painting a full native window',()=>{
  assert.deepEqual(viewBounds({left:-10,top:20,width:100,height:80},200,100),{viewport:[-10,0,100,80],scissor:[0,0,90,80]});assert.equal(viewBounds({left:300,top:0,width:80,height:80},200,100),null);assert.equal(viewBounds({left:0,top:0,width:0,height:20},200,100),null);
});
