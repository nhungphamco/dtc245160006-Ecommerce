const TRANSITIONS = Object.freeze({
    pending: Object.freeze(['confirmed', 'cancelled']),
    confirmed: Object.freeze(['shipping', 'cancelled']),
    shipping: Object.freeze(['completed']),
    completed: Object.freeze([]),
    cancelled: Object.freeze([])
});
const STATUSES = Object.freeze(Object.keys(TRANSITIONS));
function httpError(message, status = 400) {
    return Object.assign(new Error(message), { status });
}
module.exports = { TRANSITIONS, STATUSES, httpError };
