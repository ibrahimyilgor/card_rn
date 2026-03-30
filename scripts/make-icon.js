const sharp = require("sharp");
const path = require("path");

const input = path.join(__dirname, "../assets/favicon.svg");
const outputAdaptive = path.join(__dirname, "../assets/adaptive-icon-new.png");
const outputIcon = path.join(__dirname, "../assets/icon.png");

// adaptive icon: 1024x1024 with ~30% padding so logo fills ~70%
// Add a rounded-corner mask so the resulting PNG has radius corners.
const adaptiveSize = 1024;
const adaptiveRadius = 120; // px - adjust if you want bigger/smaller radius
const maskSvg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='${adaptiveSize}' height='${adaptiveSize}' viewBox='0 0 ${adaptiveSize} ${adaptiveSize}'>\n  <rect x='0' y='0' width='${adaptiveSize}' height='${adaptiveSize}' rx='${adaptiveRadius}' ry='${adaptiveRadius}' fill='#fff'/>\n</svg>`;

sharp(input)
	.resize(716, 716, {
		fit: "contain",
		background: { r: 0, g: 0, b: 0, alpha: 0 },
	})
	.extend({
		top: 154,
		bottom: 154,
		left: 154,
		right: 154,
		background: { r: 0, g: 0, b: 0, alpha: 0 },
	})
	.png()
	.composite([{ input: Buffer.from(maskSvg), blend: "dest-in" }])
	.toFile(outputAdaptive, (err, info) => {
		if (err) console.error("adaptive error:", err);
		else console.log("adaptive-icon-new.png:", info.width, "x", info.height);
	});

// main icon: 1024x1024, logo fills full (rounded rect already in SVG)
sharp(input)
	.resize(1024, 1024, {
		fit: "contain",
		background: { r: 0, g: 0, b: 0, alpha: 0 },
	})
	.png()
	.toFile(outputIcon, (err, info) => {
		if (err) console.error("icon error:", err);
		else console.log("icon.png:", info.width, "x", info.height);
	});
