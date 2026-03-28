/**
 * AchievementBadge — React Native port of the web enamel pin badges.
 * streak   → hexagon  | accuracy → circle  | volume → rounded rect
 * Tilt: press & drag horizontally.
 */
import { useRef, useState } from "react";
import { View, PanResponder, Animated } from "react-native";
import Svg, {
	Path, Circle, Rect, Polygon,
	LinearGradient, Stop, Defs, ClipPath, G,
	Text as SvgText,
} from "react-native-svg";

const loc = (n) => Number(n).toLocaleString("en-US");

// ─── Hex path helpers ─────────────────────────────────────────────────────────
function makeRoundedHexPath(cx, cy, radius, corner) {
	const pts = [];
	for (const a of [-90, -30, 30, 90, 150, 210]) {
		const rad = (a * Math.PI) / 180;
		pts.push([cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)]);
	}
	const n = pts.length;
	const p1 = new Array(n), p2 = new Array(n);
	for (let i = 0; i < n; i++) {
		const prev = pts[(i - 1 + n) % n], curr = pts[i], next = pts[(i + 1) % n];
		const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0]/l, v[1]/l]; };
		const nP = norm([prev[0]-curr[0], prev[1]-curr[1]]);
		const nN = norm([next[0]-curr[0], next[1]-curr[1]]);
		p1[i] = [curr[0]+nP[0]*corner, curr[1]+nP[1]*corner];
		p2[i] = [curr[0]+nN[0]*corner, curr[1]+nN[1]*corner];
	}
	let d = `M ${p1[0][0]} ${p1[0][1]}`;
	for (let i = 0; i < n; i++) {
		d += ` A ${corner} ${corner} 0 0 1 ${p2[i][0]} ${p2[i][1]}`;
		d += ` L ${p1[(i+1)%n][0]} ${p1[(i+1)%n][1]}`;
	}
	return d + " Z";
}

function hexPoints(cx, cy, r) {
	return [-90,-30,30,90,150,210].map((a) => {
		const rad = (a * Math.PI) / 180;
		return [cx + r*Math.cos(rad), cy + r*Math.sin(rad)];
	});
}

// ─── Tilt hook ────────────────────────────────────────────────────────────────
function useTilt(enabled) {
	const [ry, setRy] = useState(0);
	const startX = useRef(0);
	const active = useRef(false);

	const panResponder = useRef(PanResponder.create({
		onStartShouldSetPanResponderCapture: () => enabled,
		onMoveShouldSetPanResponderCapture: () => enabled && active.current,
		onPanResponderGrant: (e) => { active.current = true; startX.current = e.nativeEvent.pageX; },
		onPanResponderMove: (e) => {
			if (!enabled || !active.current) return;
			const dx = e.nativeEvent.pageX - startX.current;
			setRy(Math.max(-35, Math.min(35, dx * 0.6)));
		},
		onPanResponderRelease: () => { active.current = false; setRy(0); },
		onPanResponderTerminate: () => { active.current = false; setRy(0); },
	})).current;

	return { ry, panHandlers: panResponder.panHandlers };
}

// ─── 3D edge helpers ──────────────────────────────────────────────────────────
function getHexEdgeFaces(ry) {
	const ryRad = (ry * Math.PI) / 180;
	const xShift = -Math.sin(ryRad) * 10;
	const pts = hexPoints(100, 100, 88);
	const faces = [];
	for (let i = 0; i < pts.length; i++) {
		const a = pts[i], b = pts[(i+1) % pts.length];
		const mx = (a[0]+b[0])/2 - 100;
		if (xShift !== 0 && Math.sign(mx) === Math.sign(-xShift))
			faces.push({ a, b, xShift, darkness: Math.abs(mx)/88 });
	}
	return faces;
}

function getCircleEdgeFaces(ry) {
	const ryRad = (ry * Math.PI) / 180;
	const xShift = -Math.sin(ryRad) * 10;
	const R = 88, faces = [];
	for (let i = 0; i < 24; i++) {
		const a1 = (i/24)*2*Math.PI - Math.PI/2, a2 = ((i+1)/24)*2*Math.PI - Math.PI/2;
		const ax = 100+R*Math.cos(a1), ay = 100+R*Math.sin(a1);
		const bx = 100+R*Math.cos(a2), by = 100+R*Math.sin(a2);
		const mx = (ax+bx)/2 - 100;
		if (xShift !== 0 && Math.sign(mx) === Math.sign(-xShift))
			faces.push({ ax, ay, bx, by, xShift, t: Math.abs(mx)/R });
	}
	return faces;
}

// ─── STREAK SVG ───────────────────────────────────────────────────────────────
function StreakSVG({ size, value, ry }) {
	const outerPath = makeRoundedHexPath(100, 100, 88, 0);
	const innerPath = makeRoundedHexPath(100, 100, 82, 0);
	const ryRad = (ry * Math.PI) / 180;
	const edgeFaces = getHexEdgeFaces(ry);
	const display = value != null ? loc(value) : null;
	const fontSize = value >= 1000 ? 28 : value >= 100 ? 36 : 46;

	return (
		<Svg viewBox="0 0 200 200" width={size} height={size}>
			<Defs>
				<LinearGradient id="stGold" x1="0%" y1="0%" x2="100%" y2="100%">
					<Stop offset="12%" stopColor="#fffbda" />
					<Stop offset="30%" stopColor="#e1b84a" />
					<Stop offset="55%" stopColor="#8a6d3b" />
					<Stop offset="85%" stopColor="#c08f2a" />
					<Stop offset="100%" stopColor="#5e4c25" />
				</LinearGradient>
				<ClipPath id="stClip"><Path d={innerPath} /></ClipPath>
			</Defs>

			{edgeFaces.map(({ a, b, xShift: xs, darkness }, i) => (
				<Polygon key={i}
					points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]+xs},${b[1]} ${a[0]+xs},${a[1]}`}
					fill={`rgba(90,60,10,${(0.55+darkness*0.35).toFixed(2)})`}
					stroke="#3f2c12" strokeWidth="0.5" />
			))}

			<Path d={outerPath} fill="url(#stGold)" stroke="#d4af37" strokeWidth="4" />
			<Path d={innerPath} fill="#e8e0d0" />

			<G clipPath="url(#stClip)">
				<Path d="M10 100 L190 -4" fill="none" stroke="#f04d8c" strokeWidth="6" />
				<Path d="M10 112 L190 8"  fill="none" stroke="#a2d149" strokeWidth="6" />
				<Path d="M10 124 L190 20" fill="none" stroke="#2dbbc4" strokeWidth="6" />
			</G>

			{display != null && (
				<G>
					{[3,2,1].map((i) => (
						<SvgText key={i}
							x={100 + Math.sin(ryRad)*4*i*0.6}
							y={155 + Math.abs(Math.sin(ryRad))*1.5*i*0.6}
							textAnchor="middle" fontFamily="Georgia, serif" fontSize={fontSize}
							fill={`rgba(100,70,10,${(0.18-i*0.04).toFixed(2)})`}>
							{display}
						</SvgText>
					))}
					<SvgText x="100" y="155" textAnchor="middle"
						fontFamily="Georgia, serif" fontSize={fontSize}
						fill="#d4af37" stroke="#d4af37" strokeWidth="1">
						{display}
					</SvgText>
				</G>
			)}
		</Svg>
	);
}

// ─── ACCURACY SVG ─────────────────────────────────────────────────────────────
function AccuracySVG({ size, value, ry }) {
	const ryRad = (ry * Math.PI) / 180;
	const edgeFaces = getCircleEdgeFaces(ry);
	const display = value != null ? loc(value) : null;
	const fontSize = value >= 1000 ? 22 : value >= 100 ? 28 : value >= 10 ? 34 : 40;
	// SVG text y is baseline; shift up by ~35% of fontSize to visually center
	const textY = 100 + fontSize * 0.35;

	return (
		<Svg viewBox="0 0 200 200" width={size} height={size}>
			<Defs>
				<LinearGradient id="acGold" x1="0%" y1="0%" x2="100%" y2="100%">
					<Stop offset="12%" stopColor="#fffbda" />
					<Stop offset="30%" stopColor="#e1b84a" />
					<Stop offset="55%" stopColor="#8a6d3b" />
					<Stop offset="85%" stopColor="#c08f2a" />
					<Stop offset="100%" stopColor="#5e4c25" />
				</LinearGradient>
				<ClipPath id="acClip"><Circle cx="100" cy="100" r="82" /></ClipPath>
			</Defs>

			{edgeFaces.map(({ ax, ay, bx, by, xShift, t }, i) => (
				<Polygon key={i}
					points={`${ax},${ay} ${bx},${by} ${bx+xShift},${by} ${ax+xShift},${ay}`}
					fill={`rgba(90,60,10,${(0.6+t*0.35).toFixed(2)})`}
					stroke="#c08f2a" strokeWidth="0.5" />
			))}

			<Circle cx="100" cy="100" r="88" fill="url(#acGold)" />
			<Circle cx="100" cy="100" r="82" fill="#e8e0d0" />

			<G clipPath="url(#acClip)">
				<Circle cx="100" cy="100" r="68" fill="none" stroke="#f04d8c" strokeWidth="6" />
				<Circle cx="100" cy="100" r="60" fill="none" stroke="#a2d149" strokeWidth="6" />
				<Circle cx="100" cy="100" r="52" fill="none" stroke="#2979ff" strokeWidth="6" />
			</G>

			{display != null && (
				<G>
					{[3,2,1].map((i) => (
						<SvgText key={i}
							x={100 + Math.sin(ryRad)*4*i*0.6}
							y={textY + Math.abs(Math.sin(ryRad))*1.5*i*0.6}
							textAnchor="middle"
							fontFamily="Georgia, serif" fontSize={fontSize}
							fill={`rgba(100,70,10,${(0.18-i*0.04).toFixed(2)})`}>
							{display}
						</SvgText>
					))}
					<SvgText x="100" y={textY} textAnchor="middle"
						fontFamily="Georgia, serif" fontSize={fontSize}
						fill="#d4af37" stroke="#d4af37" strokeWidth="1">
						{display}
					</SvgText>
				</G>
			)}
		</Svg>
	);
}

// ─── VOLUME SVG ───────────────────────────────────────────────────────────────
function fmtVolume(n) {
	if (n >= 1000000) { const m = Math.round((n/1000000)*10)/10; return (m%1===0?m.toFixed(0):m.toFixed(1))+"M"; }
	if (n >= 1000)    { const k = Math.round((n/1000)*10)/10;    return (k%1===0?k.toFixed(0):k.toFixed(1))+"K"; }
	return loc(n);
}

function VolumeSVG({ size, value, ry }) {
	const RX = 14, W = 176, H = 176, X = 12, Y = 12;
	const ryRad = (ry * Math.PI) / 180;
	const xShift = -Math.sin(ryRad) * 10;
	const label = value != null ? fmtVolume(value) : null;
	const fontSize = value >= 1000 ? 28 : value >= 100 ? 36 : 46;

	const edgeFaces = [];
	if (xShift > 0) edgeFaces.push({ ax: X, ay: Y, bx: X, by: Y+H });
	else if (xShift < 0) edgeFaces.push({ ax: X+W, ay: Y, bx: X+W, by: Y+H });

	return (
		<Svg viewBox="0 0 200 200" width={size} height={size}>
			<Defs>
				<LinearGradient id="voGold" x1="0%" y1="0%" x2="100%" y2="100%">
					<Stop offset="30%" stopColor="#e1b84a" />
					<Stop offset="55%" stopColor="#8a6d3b" />
					<Stop offset="85%" stopColor="#c08f2a" />
					<Stop offset="100%" stopColor="#5e4c25" />
				</LinearGradient>
				<ClipPath id="voClip">
					<Rect x={X+6} y={Y+6} width={W-12} height={H-12} rx={RX-2} />
				</ClipPath>
			</Defs>

			{edgeFaces.map(({ ax, ay, bx, by }, i) => (
				<Polygon key={i}
					points={`${ax},${ay} ${bx},${by} ${bx+xShift},${by} ${ax+xShift},${ay}`}
					fill="rgba(90,60,10,0.75)" stroke="#c08f2a" strokeWidth="0.5" />
			))}

			<Rect x={X} y={Y} width={W} height={H} rx={RX} fill="url(#voGold)" />
			<Rect x={X+6} y={Y+6} width={W-12} height={H-12} rx={RX-2} fill="#e8e0d0" />

			<G clipPath="url(#voClip)">
				<Rect x={X+14} y={Y+14} width={W-28} height={H-14} rx="6" fill="none" stroke="#f04d8c" strokeWidth="6" />
				<Rect x={X+22} y={Y+22} width={W-44} height={H-22} rx="6" fill="none" stroke="#a2d149" strokeWidth="6" />
				<Rect x={X+30} y={Y+30} width={W-60} height={H-30} rx="6" fill="none" stroke="#2979ff" strokeWidth="6" />
			</G>

			{label != null && (
				<G>
					{[3,2,1].map((i) => (
						<SvgText key={i}
							x={100 + Math.sin(ryRad)*4*i*0.6}
							y={155 + Math.abs(Math.sin(ryRad))*1.5*i*0.6}
							textAnchor="middle" fontFamily="Georgia, serif" fontSize={fontSize}
							fill={`rgba(100,70,10,${(0.18-i*0.04).toFixed(2)})`}>
							{label}
						</SvgText>
					))}
					<SvgText x="100" y="155" textAnchor="middle"
						fontFamily="Georgia, serif" fontSize={fontSize}
						fill="#d4af37" stroke="#d4af37" strokeWidth="1">
						{label}
					</SvgText>
				</G>
			)}
		</Svg>
	);
}

// ─── Shell ────────────────────────────────────────────────────────────────────
const SHADOWS = {
	streak:   { shadowColor: "#FF6B35", elevation: 10 },
	accuracy: { shadowColor: "#4ECDC4", elevation: 10 },
	volume:   { shadowColor: "#9B59B6", elevation: 10 },
};

export default function AchievementBadge({ type = "accuracy", size = 80, earned = true, interactive = true, value }) {
	const { ry, panHandlers } = useTilt(interactive && earned);
	const shadow = SHADOWS[type] || SHADOWS.accuracy;
	const scaleX = Math.cos((ry * Math.PI) / 180);

	const inner =
		type === "streak"   ? <StreakSVG   size={size} value={value} ry={ry} /> :
		type === "accuracy" ? <AccuracySVG size={size} value={value} ry={ry} /> :
		                      <VolumeSVG   size={size} value={value} ry={ry} />;

	return (
		<View {...panHandlers} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
			<Animated.View style={{
				width: size, height: size,
				transform: [{ scaleX: earned ? scaleX : 1 }],
				opacity: earned ? 1 : 0.35,
				shadowColor: earned ? shadow.shadowColor : "transparent",
				shadowOffset: { width: 0, height: 6 },
				shadowOpacity: earned ? 0.7 : 0,
				shadowRadius: 16,
				elevation: earned ? shadow.elevation : 0,
			}}>
				{inner}
			</Animated.View>
		</View>
	);
}
