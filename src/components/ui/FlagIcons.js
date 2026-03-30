import React from "react";
import { SvgXml } from "react-native-svg";

const TR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20">
  <rect width="30" height="20" fill="#E30A17"/>
  <circle cx="11" cy="10" r="5" fill="white"/>
  <circle cx="12.5" cy="10" r="4" fill="#E30A17"/>
  <polygon fill="white" points="17,10 19.5,11 18.5,8.5 21,10 18.5,11.5 19.5,9"/>
</svg>`;

const GB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30">
  <rect width="60" height="30" fill="#012169"/>
  <path d="M0,0 L60,30 M60,0 L0,30" stroke="white" stroke-width="6"/>
  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/>
  <path d="M30,0 V30 M0,15 H60" stroke="white" stroke-width="10"/>
  <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/>
</svg>`;

export const TRFlag = ({ size = 24 }) => (
	<SvgXml xml={TR_SVG} width={size * 1.5} height={size} />
);

export const GBFlag = ({ size = 24 }) => (
	<SvgXml xml={GB_SVG} width={size * 1.5} height={size} />
);
