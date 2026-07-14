export const DEPTH_STATUSES = Object.freeze(['candidate', 'draft', 'review', 'live', 'blocked']);
export const DEPTH_REVIEW_STATUSES = Object.freeze(['pending_triage', 'draft', 'in_review', 'approved', 'published', 'pending_rework', 'archived']);
export const DEPTH_QA_KEYS = Object.freeze(['csp_safe', 'reference_notes', 'formula_walkthrough', 'mobile_canvas_check']);

export function isDepthPublishable(entry) {
    return entry?.public === true
        && entry.status === 'live'
        && entry.review_status === 'published'
        && typeof entry.depth_path === 'string'
        && entry.depth_path.length > 0
        && DEPTH_QA_KEYS.every((key) => entry.qa?.[key] === true);
}
