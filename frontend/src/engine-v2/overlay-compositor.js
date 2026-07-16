import { OVERLAYS } from './tokens.js';

export const OVERLAY_ORDER = Object.freeze(['guided_spine', 'depth_lens', 'portal_ring', 'multi_portal', 'learned', 'available', 'related', 'selected', 'filtered', 'dimmed']);
const RING_OFFSET = Object.freeze({ guided_spine: 4, depth_lens: 6, related: 10, portal_ring: 12, multi_portal: 16, learned: 8, available: 10, selected: 20 });

export function overlayOrder(overlays = []) {
    const known = new Set(overlays);
    return OVERLAY_ORDER.filter((overlay) => known.has(overlay));
}

export function drawOverlay(ctx, overlay, x, y, radius, tokens, animation = {}) {
    ctx.save();
    ctx.lineWidth = 1.5;
    if (overlay === 'guided_spine') { ctx.strokeStyle = tokens.guided; ctx.setLineDash([4, 4]); ctx.globalAlpha = 0.9; }
    else if (overlay === 'depth_lens') { ctx.strokeStyle = tokens.depth; ctx.globalAlpha = 0.8; }
    else if (overlay === 'portal_ring') { ctx.strokeStyle = tokens.portal; ctx.globalAlpha = 0.85; ctx.setLineDash([9, 4]); }
    else if (overlay === 'multi_portal') { ctx.strokeStyle = tokens.portal; ctx.globalAlpha = 0.7; ctx.setLineDash([2, 5]); }
    else if (overlay === 'learned') {
        ctx.strokeStyle = tokens.learned;
        ctx.globalAlpha = 0.82;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + RING_OFFSET.learned, Math.PI * 0.18, Math.PI * 0.72);
        ctx.stroke();
        ctx.restore();
        return true;
    }
    else if (overlay === 'available') {
        const pulse = Number.isFinite(animation.availablePulse) ? animation.availablePulse : 1;
        ctx.strokeStyle = tokens.available;
        ctx.globalAlpha = 0.42 * pulse;
        if (animation.mode === 'far') { ctx.restore(); return true; }
        if (animation.mode === 'mid') {
            ctx.setLineDash([]);
            ctx.lineWidth = 1.5;
            const markRadius = radius + RING_OFFSET.available;
            for (const angle of [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6]) {
                ctx.beginPath(); ctx.arc(x, y, markRadius, angle - 0.08, angle + 0.08); ctx.stroke();
            }
            ctx.restore();
            return true;
        }
        ctx.setLineDash([2, 5]);
    }
    // Related stars earn their full colour and label in the renderer. A ring
    // around every neighbour turns a constellation into a diagram, so this
    // overlay intentionally has no geometric mark.
    else if (overlay === 'related') { ctx.restore(); return true; }
    else if (overlay === 'selected') {
        const pulse = Number.isFinite(animation.focusPulse) ? animation.focusPulse : 1;
        // Five-layer focus corona. Motion only changes opacity, never radius,
        // so the selected star remains a stable spatial anchor.
        const layers = [
            { offset: 28, alpha: 0.12, width: 5.0 },
            { offset: 23, alpha: 0.22, width: 3.5 },
            { offset: 19, alpha: 0.42, width: 2.4 },
            { offset: 15, alpha: 0.72, width: 1.6 },
            { offset: 11, alpha: 0.96, width: 1.1 },
        ];
        ctx.strokeStyle = tokens.selected;
        for (const layer of layers) {
            ctx.globalAlpha = layer.alpha * pulse;
            ctx.lineWidth = layer.width;
            ctx.beginPath(); ctx.arc(x, y, radius + layer.offset, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        return true;
    }
    else if (overlay === 'filtered') { ctx.globalAlpha = tokens.filtered; }
    else if (overlay === 'dimmed') { ctx.globalAlpha = tokens.dimmed; }
    else { ctx.restore(); return false; }
    if (overlay !== 'filtered' && overlay !== 'dimmed') { ctx.beginPath(); ctx.arc(x, y, radius + RING_OFFSET[overlay], 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    return true;
}

export function drawNodeOverlays(ctx, node, x, y, radius, tokens, animation = {}) {
    let unknown = 0;
    for (const overlay of overlayOrder(node.overlays)) drawOverlay(ctx, overlay, x, y, radius, tokens, animation);
    for (const overlay of node.overlays) if (!OVERLAYS.includes(overlay)) unknown += 1;
    return unknown;
}
