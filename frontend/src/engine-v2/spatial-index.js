import { quadtree } from 'd3';

export function createSpatialIndex(nodes = []) {
    const tree = quadtree().x((node) => node.x).y((node) => node.y).addAll(nodes);
    return {
        size: nodes.length,
        queryRect(bounds) {
            const result = [];
            tree.visit((quad, x0, y0, x1, y1) => {
                if (x1 < bounds.minX || x0 > bounds.maxX || y1 < bounds.minY || y0 > bounds.maxY) return true;
                if (!quad.length) {
                    let leaf = quad;
                    do {
                        const node = leaf.data;
                        if (node.x >= bounds.minX && node.x <= bounds.maxX && node.y >= bounds.minY && node.y <= bounds.maxY) result.push(node);
                        leaf = leaf.next;
                    } while (leaf);
                }
                return false;
            });
            return result;
        },
        queryPoint(x, y, radius) {
            const result = [];
            tree.visit((quad, x0, y0, x1, y1) => {
                const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0;
                const dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
                if (dx * dx + dy * dy > radius * radius) return true;
                if (!quad.length) {
                    let leaf = quad;
                    do {
                        const node = leaf.data;
                        if (Math.hypot(node.x - x, node.y - y) <= radius) result.push(node);
                        leaf = leaf.next;
                    } while (leaf);
                }
                return false;
            });
            return result;
        },
    };
}
