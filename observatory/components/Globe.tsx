'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
const textureURL = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/earth.jpg`;
function Earth({ reduced, onReady }: { reduced: boolean; onReady: () => void }) {
  const texture = useTexture(textureURL);
  texture.colorSpace = THREE.SRGBColorSpace;
  useEffect(()=>{onReady();},[onReady]);
  const group = useRef<THREE.Group>(null);
  const lat = -19.3 * Math.PI / 180, phi = (22.9 + 180) * Math.PI / 180;
  const target = new THREE.Vector3(-Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat)).multiplyScalar(1.019);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = -1.97 + (reduced ? 0 : Math.sin(clock.elapsedTime * .045) * .08);
  });
  return <group ref={group} rotation={[.08,-1.97,.08]}>
    <mesh><sphereGeometry args={[1,96,64]}/><meshStandardMaterial map={texture} roughness={.78} metalness={.08}/></mesh>
    <mesh scale={1.025}><sphereGeometry args={[1,64,48]}/><shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{glow:{value:new THREE.Color('#4ca5b1')}}} vertexShader={'varying vec3 n; varying vec3 p; void main(){n=normalize(normalMatrix*normal); vec4 pos=modelViewMatrix*vec4(position,1.0);p=pos.xyz;gl_Position=projectionMatrix*pos;}'} fragmentShader={'uniform vec3 glow; varying vec3 n; varying vec3 p; void main(){float a=pow(1.0-max(0.0,dot(normalize(n),normalize(-p))),3.5);gl_FragColor=vec4(glow,a*.5);}'}/></mesh>
    <group position={target} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),target.clone().normalize())}>
      <mesh><circleGeometry args={[.009,20]}/><meshBasicMaterial color="#d9f7a7"/></mesh>
      <mesh position={[0,0,.002]}><ringGeometry args={[.021,.024,48]}/><meshBasicMaterial color="#c6eda0" transparent opacity={.85}/></mesh>
      <mesh position={[0,0,.001]}><ringGeometry args={[.045,.0465,48]}/><meshBasicMaterial color="#b9e896" transparent opacity={.35}/></mesh>
      <Html position={[.03,-.055,.02]} center={false} style={{pointerEvents:'none'}}><div className="globe-pin"><span>OKAVANGO DELTA</span><small>19.3° S / 22.9° E</small></div></Html>
    </group>
  </group>;
}
export default function Globe({ reduced = false, onReady, onFailure }: { reduced?: boolean; onReady:()=>void; onFailure:()=>void }) {
  const host = useRef<HTMLDivElement>(null); const [active,setActive] = useState(true); const [supported,setSupported] = useState(true);
  useEffect(()=>{try {const c=document.createElement('canvas'); const gl=c.getContext('webgl2'); if(!gl) setSupported(false); else gl.getExtension('WEBGL_lose_context')?.loseContext();}catch{setSupported(false);} const observer=new IntersectionObserver(([e])=>setActive(e.isIntersecting));if(host.current)observer.observe(host.current);return()=>observer.disconnect();},[]);
  return <div ref={host} className="globe-canvas" aria-hidden="true">{supported && <Canvas dpr={[1,1.5]} gl={{antialias:true,alpha:true,powerPreference:'low-power'}} camera={{position:[0,0,3.4],fov:42}} frameloop={active&&!reduced?'always':'demand'} onCreated={({gl})=>{gl.domElement.addEventListener('webglcontextlost',()=>{setSupported(false);onFailure();},{once:true});}}>
    <ambientLight intensity={.32}/><directionalLight position={[-3,3,5]} intensity={3}/><directionalLight position={[4,-1,-2]} intensity={.3} color="#588a95"/>
    <Stars radius={40} depth={35} count={1000} factor={1.1} fade speed={reduced?0:.08}/>
    <Suspense fallback={null}><Earth reduced={reduced} onReady={onReady}/></Suspense>
  </Canvas>}</div>;
}
