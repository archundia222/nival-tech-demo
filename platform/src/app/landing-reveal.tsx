"use client";
import { useEffect } from "react";
export function LandingReveal(){
 useEffect(()=>{
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){document.querySelectorAll(".scrollReveal").forEach(el=>el.classList.add("isVisible"));return;}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("isVisible");observer.unobserve(entry.target)}}),{threshold:.14,rootMargin:"0px 0px -7% 0px"});
  document.querySelectorAll(".scrollReveal").forEach(el=>observer.observe(el));
  return()=>observer.disconnect();
 },[]);
 return null;
}