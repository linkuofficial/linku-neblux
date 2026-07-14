import { OVERLAYS } from './tokens.js';

export const OVERLAY_ORDER = Object.freeze(['guided_spine', 'depth_lens', 'portal_ring', 'multi_portal', 'related', 'selected', 'filtered', 'dimmed']);
const RING_OFFSET = Object.freeze({ guided_spine: 4, depth_lens: 6, related: 10, portal_ring: 12, multi_portal: 16, selected: 20 });

export function overlayOrder(overlays = []) {
    const known = new Set(overlays);
    return OVERLAY_ORDER.filter((overlay) => known.has(overlay));
}

export function drawOverlay(ctx, overlay, x, y, radius, tokens) {
    ctx.save();
    ctx.lineWidth = 1.5;
    if (overlay === 'guided_spine') { ctx.strokeStyle = tokens.guided; ctx.setLineDash([4, 4]); ctx.globalAlpha = 0.9; }
    else if (overlay === 'depth_lens') { ctx.strokeStyle = tokens.depth; ctx.globalAlpha = 0.8; }
    else if (overlay === 'portal_ring') { ctx.strokeStyle = tokens.portal; ctx.globalAlpha = 0.85; ctx.setLineDash([9, 4]); }
    else if (overlay === 'multi_portal') { ctx.strokeStyle = tokens.portal; ctx.globalAlpha = 0.7; ctx.setLineDash([2, 5]); }
    else if (overlay === 'related') { ctx.strokeStyle = tokens.related; ctx.globalAlpha = 0.82; }
    else if (overlay === 'selected') { ctx.strokeStyle = tokens.selected; ctx.globalAlpha = 0.95; ctx.lineWidth = 2; }
    else if (overlay === 'filtered') { ctx.globalAlpha = tokens.filtered; }
    else if (overlay === 'dimmed') { ctx.globalAlpha = tokens.dimmed; }
    else { ctx.restore(); return false; }
    if (overlay !== 'filtered' && overlay !== 'dimmed') { ctx.beginPath(); ctx.arc(x, y, radius + RING_OFFSET[overlay], 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    return true;
}

export function drawNodeOverlays(ctx, node, x, y, radius, tokens) {
    let unknown = 0;
    for (const overlay of overlayOrder(node.overlays)) drawOverlay(ctx, overlay, x, y, radius, tokens);
    for (const overlay of node.overlays) if (!OVERLAYS.includes(overlay)) unknown += 1;
    return unknown;
}
