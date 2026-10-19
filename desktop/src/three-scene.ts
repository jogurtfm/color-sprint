import * as THREE from 'three';

// Working panels retain the established curved HTML/CSS. Three owns bounded instruments only.
export type VisualKind='reactor'|'program'|'sphere'|'terrain';
export interface VisualState {accent:string;progress:number;phase:string;hover:boolean;quality:'cinematic'|'balanced'|'quiet';motion:boolean;aimX?:number;aimY?:number}
const ice='#8edcea',blue='#368cb1',amber='#e8b77b';
const ink=(color=ice,opacity=.45)=>new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});
const enamel=(color='#163c50',emissive='#16475b')=>new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:.35,metalness:.65,roughness:.3});
function line(points:THREE.Vector3[],color=ice,opacity=.45){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),ink(color,opacity));}
function arc(radius:number,start=0,length=Math.PI*2,color=ice,opacity=.45,z=0){return line(Array.from({length:97},(_,i)=>new THREE.Vector3(Math.cos(start+i/96*length)*radius,Math.sin(start+i/96*length)*radius,z)),color,opacity);}
function band(inner:number,outer:number,start:number,length:number){
  const shape=new THREE.Shape();shape.absarc(0,0,outer,start,start+length,false);shape.lineTo(Math.cos(start+length)*inner,Math.sin(start+length)*inner);shape.absarc(0,0,inner,start+length,start,true);shape.closePath();
  return new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false,curveSegments:16});
}
function cage(size:number,color=ice){const source=new THREE.BoxGeometry(size,size,size),geometry=new THREE.EdgesGeometry(source);source.dispose();return new THREE.LineSegments(geometry,ink(color,.5));}
/** Latitude/longitude lines instead of triangular wireframe noise. One draw call. */
function globe(){
  const positions:number[]=[];const segment=(a:THREE.Vector3,b:THREE.Vector3)=>positions.push(a.x,a.y,a.z,b.x,b.y,b.z);
  for(let j=0;j<10;j++)for(let i=0;i<48;i++){const a=i/48*Math.PI*2,b=(i+1)/48*Math.PI*2,p=j/10*Math.PI;segment(new THREE.Vector3(Math.cos(p)*Math.cos(a)*.8,Math.sin(a)*.8,Math.sin(p)*Math.cos(a)*.8),new THREE.Vector3(Math.cos(p)*Math.cos(b)*.8,Math.sin(b)*.8,Math.sin(p)*Math.cos(b)*.8));}
  for(const y of [-.75,-.5,-.25,0,.25,.5,.75])for(let i=0;i<64;i++){const a=i/64*Math.PI*2,b=(i+1)/64*Math.PI*2,r=Math.sqrt(1-y*y)*.8;segment(new THREE.Vector3(Math.cos(a)*r,y*.8,Math.sin(a)*r),new THREE.Vector3(Math.cos(b)*r,y*.8,Math.sin(b)*r));}
  const object=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),ink(ice,.38));object.name='latitude-longitude';return object;
}
function appObject(index:number){
  const group=new THREE.Group(),colors=[ice,'#edb076','#b3d599','#e9af7b','#c1a9db'],color=colors[index%5];
  const shell=cage(.82,color);shell.name='app-cage';group.add(shell);
  const material=enamel(color,color);material.emissiveIntensity=.08;
  if(index%5===0){group.add(new THREE.Mesh(new THREE.TorusKnotGeometry(.2,.035,48,6,2,3),material));}
  else if(index%5===1){const orbit=new THREE.Mesh(new THREE.TorusGeometry(.24,.045,6,32),material);orbit.rotation.x=.55;group.add(orbit,new THREE.Mesh(new THREE.SphereGeometry(.105,12,8),material));}
  else if(index%5===2){const pages=new THREE.Mesh(new THREE.BoxGeometry(.38,.48,.065),material);pages.rotation.y=.25;group.add(pages);const positions:number[]=[];for(let i=0;i<4;i++)positions.push(-.12,.14-i*.085,.05,.12,.14-i*.085,.05);group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),ink('#123224',.8)));}
  else if(index%5===3){const fruit=new THREE.Mesh(new THREE.OctahedronGeometry(.28),material);fruit.scale.set(.8,1.2,.7);fruit.rotation.z=-.22;group.add(fruit);}
  else{const crescent=new THREE.Mesh(band(.22,.27,.35,Math.PI*1.45),material);crescent.rotation.z=.5;group.add(crescent,new THREE.Mesh(new THREE.OctahedronGeometry(.11),material));}
  return group;
}

export class HudVisual {
  readonly scene=new THREE.Scene();readonly root=new THREE.Group();readonly camera=new THREE.PerspectiveCamera(40,1,.1,100);
  private rotors:THREE.Object3D[]=[];private pulse:THREE.Points|null=null;private pulseAge=10;
  private terrain:THREE.ShaderMaterial|null=null;private progress:THREE.Line|null=null;private aspect=0;
  private appMaterial:THREE.LineBasicMaterial|null=null;private lastAccent='';
  constructor(readonly kind:VisualKind,readonly seed=0){
    this.scene.add(this.root);this.camera.position.z=4;
    this.scene.add(new THREE.AmbientLight('#b5d8ed',2));const key=new THREE.DirectionalLight('#d5f4ff',3);key.position.set(-2,3,4);this.scene.add(key);const rim=new THREE.DirectionalLight('#307bba',2);rim.position.set(2,-1,-2);this.scene.add(rim);
    this.build();
  }
  private build(){
    if(this.kind==='reactor'){
      // Annular instrument: no globe, rods or orbiting cubes across the readout.
      for(let i=0;i<6;i++){const mesh=new THREE.Mesh(band(1.12,1.2,i*Math.PI/3+.06,Math.PI/3-.13),enamel());mesh.name='outer-armor';this.root.add(mesh);}
      this.root.add(arc(1.22,0,Math.PI*2,ice,.3),arc(1.08,0,Math.PI*2,blue,.42));
      const ticks:number[]=[];for(let i=0;i<72;i++){const a=i/72*Math.PI*2,r=i%6?1.275:1.245;ticks.push(Math.cos(a)*r,Math.sin(a)*r,0,Math.cos(a)*1.3,Math.sin(a)*1.3,0);}
      this.root.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(ticks,3)),ink(ice,.45)));
      for(let i=0;i<2;i++){
        const rotor=new THREE.Group();rotor.name='mechanical-gimbal';rotor.rotation.set(i?.18:-.13,i?-.18:.16,i*1.2);
        for(let j=0;j<3;j++)rotor.add(new THREE.Mesh(band(.94+i*.08,.956+i*.08,j*Math.PI*2/3+.1,1.5),enamel(i?'#4c493b':'#1c5268',i?'#6b5130':'#1e6f87')));
        this.root.add(rotor);this.rotors.push(rotor);
      }
      this.progress=arc(1.235,-Math.PI/2,Math.PI*2,amber,.95,.05);this.progress.name='focus-progress';this.root.add(this.progress);
      const positions:number[]=[];for(let i=0;i<64;i++){const a=i*2.39996,r=.83+(i%9)/30;positions.push(Math.cos(a)*r,Math.sin(a)*r,.06);}
      this.pulse=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.PointsMaterial({color:amber,size:.025,transparent:true,opacity:0,depthWrite:false}));this.root.add(this.pulse);
    }else if(this.kind==='program'){
      const object=appObject(this.seed);object.rotation.set(.3,.45,.04);this.root.add(object);this.rotors.push(object);this.appMaterial=(object.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial;
      const pedestal=arc(.55,0,Math.PI*2,ice,.25);pedestal.rotation.x=1.15;pedestal.position.y=-.5;this.root.add(pedestal);this.root.scale.setScalar(1.7);
    }else if(this.kind==='sphere'){
      const sphere=globe();sphere.rotation.set(.2,.3,-.2);this.root.add(sphere);this.rotors.push(sphere);
      const collar=arc(1,0,Math.PI*1.7,amber,.35);collar.rotation.set(.8,.3,0);this.root.add(collar);this.root.scale.setScalar(1.15);
    }else if(this.kind==='terrain'){
      const geometry=new THREE.PlaneGeometry(5,2,32,12);geometry.rotateX(-1);
      this.terrain=new THREE.ShaderMaterial({transparent:true,depthWrite:false,wireframe:true,uniforms:{uTime:{value:0},uColor:{value:new THREE.Color('#4a91a5')}},vertexShader:'uniform float uTime; varying float vHeight; void main(){vec3 p=position;p.y+=sin(p.x*2.4+uTime)*cos(p.z*3.-uTime*.6)*.15;vHeight=p.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform vec3 uColor; varying float vHeight; void main(){gl_FragColor=vec4(uColor,.07+clamp(vHeight+.4,0.,1.)*.1);}'});
      this.root.add(new THREE.Mesh(geometry,this.terrain));
    }
  }
  resize(aspect:number){if(!Number.isFinite(aspect)||aspect<=0||Math.abs(this.aspect-aspect)<.002)return;this.aspect=aspect;this.camera.aspect=aspect;this.camera.updateProjectionMatrix();}
  update(time:number,delta:number,state:VisualState){
    const speed=state.phase==='engaged'?.3:1;
    if(state.motion)this.rotors.forEach((object,i)=>{object.rotation.y+=delta*(this.kind==='program'?(state.hover?.6:.14):.045)*speed;object.rotation.z+=delta*(i%2?-.065:.045)*speed;});
    if(this.kind==='program'){
      this.root.scale.setScalar(state.hover?1.85:1.7);this.root.position.y=state.motion?Math.sin(time*.9+this.seed)*.025:0;
      if(this.appMaterial&&this.lastAccent!==state.accent){this.appMaterial.color.set(state.accent);this.lastAccent=state.accent;}
    }
    if(this.progress){this.progress.geometry.setDrawRange(0,Math.max(0,Math.min(97,Math.round(state.progress*96)+1)));this.progress.visible=state.progress>0;(this.progress.material as THREE.LineBasicMaterial).color.set(state.accent);}
    if(this.terrain)this.terrain.uniforms.uTime.value=state.motion?time*.45:0;
    if(this.kind==='reactor'){this.root.rotation.x=state.motion?Math.max(-1,Math.min(1,state.aimY||0))*.025:0;this.root.rotation.y=state.motion?Math.max(-1,Math.min(1,state.aimX||0))*.035:0;}
    if(this.pulse&&this.pulseAge<1.3){this.pulseAge+=delta;this.pulse.scale.setScalar(1+this.pulseAge*.23);(this.pulse.material as THREE.PointsMaterial).opacity=Math.max(0,.85*(1-this.pulseAge/1.3));}
    this.root.visible=state.quality!=='quiet';
  }
  complete(){if(this.pulse){this.pulseAge=0;this.pulse.scale.setScalar(1);}}
  dispose(){disposeTree(this.scene);this.scene.clear();this.rotors=[];}
}

export function disposeTree(root:THREE.Object3D){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();root.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(material);});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();}
export function viewBounds(rect:{left:number;top:number;width:number;height:number},width:number,height:number){const left=Math.max(0,rect.left),top=Math.max(0,rect.top),right=Math.min(width,rect.left+rect.width),bottom=Math.min(height,rect.top+rect.height);if(rect.width<=0||rect.height<=0||right<=left||bottom<=top)return null;return {viewport:[rect.left,height-rect.top-rect.height,rect.width,rect.height] as const,scissor:[left,height-bottom,right-left,bottom-top] as const};}
