import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountRequest } from '../src/services/accountApi.js';

async function withFetch(mock, run) {
    const original = globalThis.fetch;
    globalThis.fetch = mock;
    try { await run(); } finally { globalThis.fetch = original; }
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('profile request sends cookie credentials and supports cancellation', async () => {
    const controller = new AbortController();
    await withFetch(async (url, options) => {
        assert.equal(url, '/api/account/profile');
        assert.equal(options.credentials, 'include');
        assert.equal(options.signal, controller.signal);
        return json({ success: true, data: { user: { id: 1, fullName: 'Test Customer', email: 'test@example.test' } } });
    }, async () => assert.equal((await accountRequest('/profile', { signal: controller.signal })).user.id, 1));
});

test('profile updates send only fullName and preserve the API contract', async () => {
    await withFetch(async (url, options) => {
        assert.equal(url, '/api/account/profile');
        assert.equal(options.method, 'PATCH');
        assert.deepEqual(JSON.parse(options.body), { fullName: 'Updated Name' });
        return json({ success: true, data: { user: { id: 1, fullName: 'Updated Name', email: 'test@example.test' } } });
    }, async () => assert.equal((await accountRequest('/profile', { fullName: 'Updated Name', user_id: 2, role: 'admin' })).user.fullName, 'Updated Name'));
});

test('401, 403, 404 and server failures are errors, never fabricated profile or orders', async () => {
    for (const status of [401, 403, 404, 500, 502]) {
        await withFetch(async () => json({ success: false }, status), async () => {
            await assert.rejects(accountRequest('/orders?page=1&pageSize=5'), error => error.status === status && !!error.message);
        });
    }
});

test('network error, malformed JSON and incomplete data are explicit failures', async () => {
    for (const mock of [async () => { throw new TypeError('offline'); }, async () => new Response('Bad Gateway', { status: 502 }), async () => json({ success: true, data: {} })]) {
        await withFetch(mock, async () => assert.rejects(accountRequest('/profile')));
    }
});

test('pagination and official order total pass through unchanged', async () => {
    const data = { orders: [{ id: 7, total_amount: '123000.00', items: [] }], pagination: { page: 2, pageSize: 5, total: 6, totalPages: 2 } };
    await withFetch(async url => {
        assert.equal(url, '/api/account/orders?page=2&pageSize=5');
        return json({ success: true, data });
    }, async () => assert.deepEqual(await accountRequest('/orders?page=2&pageSize=5'), data));
});

test('abort remains AbortError instead of becoming a network warning', async () => {
    await withFetch(async () => { throw new DOMException('Aborted', 'AbortError'); }, async () => {
        await assert.rejects(accountRequest('/profile'), { name: 'AbortError' });
    });
});

test('incomplete orders fail validation rather than rendering an incorrect total or crashing', async () => {
    for (const order of [{ id: 1 }, { id: 1, total_amount: '', items: [] }, { id: 1, total_amount: '100', items: null }, { id: 1, total_amount: '100', items: [{ product_id: 1, quantity: -1, unit_price: '100' }] }]) {
        await withFetch(async () => json({ success: true, data: { order } }), async () => assert.rejects(accountRequest('/orders/1')));
    }
});
