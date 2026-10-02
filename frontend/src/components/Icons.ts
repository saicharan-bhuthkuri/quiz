import { icons } from 'lucide';

export type IconName = keyof typeof icons;

export interface IconOptions {
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  class?: string;
  style?: string;
}

/**
 * Renders an instant, inline, accessible SVG icon using Lucide definitions.
 * Instant rendering with zero layout shift or network delay.
 */
export function icon(name: string, options: IconOptions | number = {}): string {
  const opts: IconOptions = typeof options === 'number' ? { size: options } : options;
  const iconData = (icons as any)[name];

  if (!iconData) {
    console.warn(`[Icons] Icon "${name}" not found in Lucide set.`);
    return '';
  }

  const size = opts.size || 16;
  const strokeWidth = opts.strokeWidth || 2;
  const color = opts.color || 'currentColor';
  const fill = opts.fill || 'none';
  const customClass = opts.class ? `lucide-icon lucide-${name.toLowerCase()} ${opts.class}` : `lucide-icon lucide-${name.toLowerCase()}`;
  const customStyle = opts.style ? `style="${opts.style}"` : '';

  const childrenSvg = iconData
    .map(([tag, attrs]: [string, Record<string, any>]) => {
      const attrList = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      return `<${tag} ${attrList}></${tag}>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${customClass}" ${customStyle} aria-hidden="true">${childrenSvg}</svg>`;
}

export const renderIcon = icon;
