// SVG files are the single source for thumbnails, 3D previews and all exports.
import {SVGLoader} from './vendor/SVGLoader.js';
export function parseSymbol(symbol) {
  if (symbol.type === 'configurable-screw') return symbol;
  const parsed = new SVGLoader().parse(symbol.svgText);
  const groups = [];
  for (const path of parsed.paths) {
    const style = path.userData?.style || {};
    if (style.fill === 'none' || Number(style.fillOpacity) === 0) continue;
    // All closed subpaths belong to one even-odd filled outline (including holes).
    const contours = path.subPaths.map(sub => sub.getPoints(48).map(p =>
      [Math.round(p.x * 1e5) / 1e5, Math.round(p.y * 1e5) / 1e5]
    )).filter(points => points.length >= 3);
    if (contours.length) groups.push({contours});
  }
  if (!groups.length) throw Error(`Symbol „${symbol.name}“: keine gefüllten Pfade. SVG-Flächen verwenden.`);
  return {...symbol, groups, contours: groups.flatMap(g => g.contours)};
}
export async function loadLibrary() {
  const response = await fetch('/api/library', {cache: 'no-store'});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Symbolbibliothek konnte nicht geladen werden.');
  return {...data, symbols: data.symbols.map(parseSymbol)};
}
