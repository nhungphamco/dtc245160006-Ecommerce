const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createServer } = require('node:http');
const { createApp } = require('../src/app');
const { createAdminService } = require('../src/services/admin.service');
const { createAdminRepository } = require('../src/repositories/admin.repository');
const { createBootstrapService } = require('../src/services/bootstrap.service');
const { createBootstrapRepository } = require('../src/repositories/bootstrap.repository');
const { TRANSITIONS } = require('../src/services/adminRules');
const product = { id: 1, name: 'Keyboard', description: null, price: '850000.00', stock: 5, image_url: null, is_active: 1 };
const order = { id: 10, user_id: 2, customer_name: 'Customer', customer_phone: '0900000000', total_amount: '850000.00', status: 'pending', created_at: '2026-10-17T00:00:00Z' };

async function withApp(run, { fail = false } = {}) {
    const calls = [];
    const repository = {
        async dashboard() { if (fail) throw new Error('private SQL failure'); return { counts: { totalOrders: 1, pendingOrders: 1, activeProducts: 1, lowStockProducts: 1 }, byStatus: [{ status: 'pending', orderValue: '850000.00' }] }; },
        async listProducts(query) { calls.push(query); return { rows: [product], total: 1 }; },
        async findProduct(id) { return id === 1 ? product : null; },
        async createProduct(body) { calls.push(body); return { id: 2, ...body }; },
        async updateProduct(id, body) { calls.push({ id, ...body }); return { ...product, ...body }; },
        async listOrders(query) { calls.push(query); return { rows: [order], total: 1 }; },
        async findOrder(id) { return id === 10 ? { ...order, items: [], allowedTransitions: TRANSITIONS.pending } : null; },
        async updateOrderStatus(id, status, expectedStatus) { calls.push({ id, status, expectedStatus }); return { order: { ...order, status }, changed: true, restocked: status === 'cancelled' }; },
        async listCustomers(query) { calls.push(query); return { rows: [{ id: 2, full_name: 'Customer', email: 'customer@example.test', is_active: 1, created_at: order.created_at, order_count: 1 }], total: 1 }; }
    };
    const authService = { async getUserForSession(token) {
        if (token === 'admin-session') return { id: 1, role: 'admin' };
        if (token === 'customer-session') return { id: 2, role: 'customer' };
        throw Object.assign(new Error('Can dang nhap'), { status: 401 });
    } };
    const database = { execute() { throw Error('Real DB forbidden'); }, query() { throw Error('Real DB forbidden'); } };
    const server = createServer(createApp({ database, authService, adminRepository: repository }));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (path, { session = 'admin', method = 'GET', body, origin = base } = {}) => fetch(base + '/api/admin' + path, {
        method, headers: { ...(session ? { Cookie: `minishop_session=${session}-session` } : {}), ...(origin === null ? {} : { Origin: origin }), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    try { await run({ request, calls }); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('Guest/Customer cannot access any admin route, including writes and forged privileges', async () => {
    await withApp(async ({ request, calls }) => {
        const routes = [['/dashboard','GET'],['/products','GET'],['/products/1','GET'],['/products','POST'],['/products/1','PATCH'],['/orders','GET'],['/orders/10','GET'],['/orders/10/status','PATCH'],['/customers','GET']];
        for (const [path, method] of routes) {
            for (const session of [null, 'invalid', 'customer']) {
                const response = await request(path, { session, method, ...(method === 'GET' ? {} : { body: { role: 'admin', user_id: 1 } }) });
                assert.equal(response.status, session === 'customer' ? 403 : 401, path);
                assert.equal(response.headers.get('cache-control'), 'no-store');
                assert.equal((await response.json()).data, undefined);
            }
        }
        assert.equal(calls.length, 0);
    });
});

test('valid Admin reads dashboard, products, orders, customers without secrets', async () => {
    await withApp(async ({ request }) => {
        for (const path of ['/dashboard','/products','/products/1','/orders','/orders/10','/customers']) {
            const response = await request(path);
            assert.equal(response.status, 200, path);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            const text = await response.text();
            assert.doesNotMatch(text, /password_hash|token_hash|session_token/);
        }
        assert.equal((await request('/products/999')).status, 404);
        assert.equal((await request('/orders/999')).status, 404);
    });
});

test('all Admin mutations enforce trusted Origin', async () => {
    await withApp(async ({ request, calls }) => {
        for (const [path, method, body] of [['/products','POST',{name:'Keyboard',price:10,stock:1}],['/products/1','PATCH',{is_active:false}],['/orders/10/status','PATCH',{status:'cancelled',expectedStatus:'pending'}]]) {
            for (const origin of [null, 'null', 'https://attacker.example']) assert.equal((await request(path,{method,body,origin})).status,403);
        }
        assert.equal(calls.length,0);
    });
});

test('create product accepts whole VND and nonnegative stock; updates and hiding use PATCH', async () => {
    await withApp(async ({request,calls}) => {
        const response = await request('/products',{method:'POST',body:{name:' Keyboard ',description:'Test',price:850000,stock:0,image_url:'https://example.test/gear.png',is_active:true}});
        assert.equal(response.status,201);
        assert.equal((await response.json()).data.product.name,'Keyboard');
        assert.equal((await request('/products/1',{method:'PATCH',body:{stock:3,expectedStock:5}})).status,200);
        assert.equal((await request('/products/1',{method:'PATCH',body:{is_active:false}})).status,200);
        assert.equal(calls.at(-1).is_active,false);
    });
});

test('invalid product fields, unsafe image URLs, overflows, negative stock and forged role are rejected', async () => {
    await withApp(async ({request,calls}) => {
        const valid={name:'Gear',price:100,stock:1};
        for(const patch of [{name:''},{name:'x'.repeat(151)},{price:1.5},{price:-1},{price:10000000000},{stock:-1},{stock:2147483648},{stock:'5'},{is_active:1},{image_url:'javascript:alert(1)'},{image_url:'data:image/png;base64,abc'},{image_url:'https://user:password@example.test/img.png'},{description:'x'.repeat(10001)},{role:'admin'},{user_id:1}]) {
            assert.equal((await request('/products',{method:'POST',body:{...valid,...patch}})).status,400);
        }
        for(const body of [{},{stock:1},{expectedStock:1},{stock:1,expectedStock:-1},null,[]]) assert.equal((await request('/products/1',{method:'PATCH',body})).status,400);
        assert.equal(calls.length,0);
    });
});

test('admin list queries validate pagination, filter/sort allowlists and preserve filters', async () => {
    await withApp(async ({request,calls}) => {
        const response=await request('/orders?page=2&limit=5&status=confirmed&search=Customer');
        assert.equal(response.status,200);
        assert.deepEqual((await response.json()).data.pagination,{page:2,limit:5,total:1,totalPages:1});
        assert.deepEqual(calls[0],{page:2,limit:5,offset:5,search:'Customer',status:'confirmed'});
        assert.equal((await request('/products?status=inactive&lowStock=true&sort=stock_asc')).status,200);
        for(const path of ['/orders?page=0','/orders?limit=51','/orders?status=paid','/orders?page=1&page=2','/products?sort=price;DROP','/products?status=deleted','/products?lowStock=1','/customers?search='+('x'.repeat(101)),'/products?role=admin','/orders/1e2']) assert.equal((await request(path)).status,400,path);
    });
});

test('order state update requires explicit valid current and next states',async()=>withApp(async({request})=>{
    for(const body of [{status:'paid',expectedStatus:'pending'},{status:'confirmed'},{status:'cancelled',expectedStatus:'pending',user_id:2},{}]) assert.equal((await request('/orders/10/status',{method:'PATCH',body})).status,400);
    assert.equal((await request('/orders/10/status',{method:'PATCH',body:{status:'cancelled',expectedStatus:'pending'}})).status,200);
}));

test('unexpected database errors are generic JSON without SQL or stack traces',async(t)=>{
    t.mock.method(console,'error',()=>{});
    await withApp(async({request})=>{
        const response=await request('/dashboard');assert.equal(response.status,500);
        assert.deepEqual(await response.json(),{success:false,message:'Loi he thong'});
    },{fail:true});
});

// DB-free transactional connection with a mutex. This tests repository locking flow,
// idempotency and rollback, not real InnoDB concurrency semantics.
function storeFixture({status='pending',stock=3,failSecondStock=false,failStatus=false,missingProduct=false}={}) {
    const state={order:{...order,status},products:new Map([[1,{...product,stock,is_active:0}],[2,{...product,id:2,stock:4}]]),items:[{product_id:2,quantity:1},{product_id:1,quantity:2}],events:[],commits:0,rollbacks:0,releases:0};
    let queue=Promise.resolve();
    const database={async getConnection(){
        let unlock,snapshot,updates=0;
        return {
            async beginTransaction(){const previous=queue;queue=new Promise(resolve=>{unlock=resolve;});await previous;snapshot=structuredClone({order:state.order,products:state.products});},
            async execute(sql,args=[]){
                state.events.push({sql,args});
                if(sql.startsWith('SELECT')&&sql.includes('FROM orders'))return [[{...state.order}]];
                if(sql.startsWith('SELECT')&&sql.includes('FROM order_items'))return [structuredClone(state.items)];
                if(sql.startsWith('SELECT')&&sql.includes('FROM products'))return [missingProduct?[]:[{...state.products.get(args[0])}]];
                if(sql.startsWith('UPDATE products SET stock = stock +')){updates++;if(failSecondStock&&updates===2)throw Error('Injected stock write failure');state.products.get(args[1]).stock+=args[0];return [{affectedRows:1}];}
                if(sql.startsWith('UPDATE orders')){if(failStatus)throw Error('Injected status failure');assert.equal(state.order.status,args[2]);state.order.status=args[0];return [{affectedRows:1}];}
                if(sql.startsWith('UPDATE products SET ')){
                    const keys=sql.slice('UPDATE products SET '.length).split(' WHERE')[0].split(', ').map(part=>part.split(' = ')[0]);
                    const row=state.products.get(args.at(-1));keys.forEach((key,i)=>{row[key]=args[i];});return [{affectedRows:1}];
                }
                throw Error('Unexpected test SQL: '+sql);
            },
            async commit(){state.commits++;unlock();},
            async rollback(){state.order=snapshot.order;state.products=snapshot.products;state.rollbacks++;unlock();},
            release(){state.releases++;}
        };
    }};
    return {state,repository:createAdminRepository(database)};
}

test('each approved transition succeeds; no transition invents payment or shipping state',async()=>{
    for(const [current,targets] of Object.entries(TRANSITIONS)) for(const target of targets){
        const f=storeFixture({status:current});const result=await f.repository.updateOrderStatus(10,target,current);
        assert.equal(result.order.status,target);assert.equal(result.changed,true);assert.equal(f.state.commits,1);
        assert.equal(f.state.products.get(1).stock,target==='cancelled'?5:3);
    }
});

test('forbidden/backward/terminal transitions and stale states return 409 with no stock changes',async()=>{
    for(const [current,target,expected] of [['pending','shipping','pending'],['shipping','cancelled','shipping'],['completed','cancelled','completed'],['cancelled','pending','cancelled'],['confirmed','pending','confirmed'],['pending','confirmed','confirmed'],['processing','confirmed','pending']]){
        const f=storeFixture({status:current});await assert.rejects(f.repository.updateOrderStatus(10,target,expected),{status:409});
        assert.equal(f.state.order.status,current);assert.equal(f.state.products.get(1).stock,3);assert.equal(f.state.rollbacks,1);
    }
});

test('cancel restores hidden product stock once; repeated and concurrent retries cannot double restock',async()=>{
    const f=storeFixture();
    const results=await Promise.all([f.repository.updateOrderStatus(10,'cancelled','pending'),f.repository.updateOrderStatus(10,'cancelled','pending')]);
    assert.equal(results.filter(result=>result.changed).length,1);
    assert.equal(f.state.products.get(1).stock,5);assert.equal(f.state.products.get(2).stock,5);
    assert.equal(f.state.products.get(1).is_active,0);
    assert.equal(f.state.events.filter(e=>e.sql.startsWith('UPDATE products SET stock = stock +')).length,2);
    const locks=f.state.events.filter(e=>e.sql==='SELECT id, stock FROM products WHERE id = ? FOR UPDATE');
    assert.deepEqual(locks.map(e=>e.args[0]),[1,2]);
    const retry=await f.repository.updateOrderStatus(10,'cancelled','pending');assert.equal(retry.changed,false);assert.equal(retry.restocked,false);
});

test('cancel failure midway or at status write rolls back both stock and order status',async()=>{
    for(const options of [{failSecondStock:true},{failStatus:true},{missingProduct:true},{stock:2147483647}]){
        const f=storeFixture(options);await assert.rejects(f.repository.updateOrderStatus(10,'cancelled','pending'));
        assert.equal(f.state.order.status,'pending');assert.equal(f.state.products.get(1).stock,options.stock??3);assert.equal(f.state.products.get(2).stock,4);assert.equal(f.state.commits,0);assert.equal(f.state.rollbacks,1);assert.equal(f.state.releases,1);
    }
});

test('concurrent confirmation/cancellation cannot overwrite a newer state',async()=>{
    const f=storeFixture();
    const results=await Promise.allSettled([f.repository.updateOrderStatus(10,'confirmed','pending'),f.repository.updateOrderStatus(10,'cancelled','pending')]);
    assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.status,409);assert.equal(f.state.products.get(1).stock,3);
});

test('stock update conflicts with changed stock and visibility update does not delete history',async()=>{
    const f=storeFixture();
    await assert.rejects(f.repository.updateProduct(1,{stock:1,expectedStock:10}),{status:409});
    assert.equal(f.state.products.get(1).stock,3);
    await f.repository.updateProduct(1,{stock:0,expectedStock:3});assert.equal(f.state.products.get(1).stock,0);
    await f.repository.updateProduct(1,{is_active:false});assert.equal(f.state.items.length,2);assert.equal(f.state.order.id,10);
    assert.equal(f.state.events.some(e=>/DELETE FROM/.test(e.sql)),false);
});

test('list SQL uses placeholders, escaped search, fixed sort and excludes private customer fields',async()=>{
    const calls=[];
    const db={async execute(sql,args){calls.push({sql,args});return [[{total:0}]];},async query(sql,args){calls.push({sql,args});return [[]];}};
    const service=createAdminService({repository:createAdminRepository(db)});
    await service.products({search:"%' OR 1=1 --",status:'active',sort:'stock_asc',lowStock:'true'});
    await service.orders({status:'pending',search:'Customer'});
    await service.customers({search:'test@example.test'});
    assert.equal(calls[0].sql.includes("%' OR 1=1"),false);assert.match(calls[0].args[0],/!%/);
    assert.match(calls[0].sql,/is_active = \?/);assert.match(calls[1].sql,/ORDER BY stock ASC, id ASC/);
    for(const c of calls)assert.doesNotMatch(c.sql,/password_hash|sessions|token_hash|SELECT \*/);
    assert.match(calls.at(-1).sql,/u.role = 'customer'/);
});

test('dashboard separates order value by status, including pending, and does not call it paid revenue',async()=>{
    const queries=[];const connection={async beginTransaction(){},async commit(){},async rollback(){},release(){},async execute(sql){queries.push(sql);if(sql.includes('AS totalOrders'))return [[{totalOrders:2,pendingOrders:1}]];if(sql.includes('AS activeProducts'))return [[{activeProducts:1,lowStockProducts:1}]];if(sql.includes('GROUP BY status'))return [[{status:'pending',orderCount:1,orderValue:'850000.00'},{status:'completed',orderCount:1,orderValue:'100000.00'}]];return [[]];}};
    const result=await createAdminRepository({getConnection:async()=>connection}).dashboard();
    assert.equal(result.counts.pendingOrders,1);assert.equal(result.byStatus[0].status,'pending');assert.equal(result.byStatus[0].orderValue,'850000.00');assert.equal(result.revenue,undefined);
    assert.ok(queries.some(sql=>sql.includes('INTERVAL 29 DAY')));
});

test('bootstrap validates explicit approval/passwords and hashes before storage',async()=>{
    const writes=[];const service=createBootstrapService({repository:{async createFirstAdmin(data){writes.push(data);return {id:1};}},passwordService:{hashPassword:async password=>{assert.equal(password,'long-test-password');return 'argon2-hash';}}});
    const valid={fullName:' First Admin ',email:'ADMIN@example.test',password:'long-test-password',confirmation:'long-test-password',approval:'CREATE FIRST ADMIN'};
    for(const patch of [{approval:''},{password:'short'},{confirmation:'different'},{email:'bad'},{fullName:'X'}])await assert.rejects(service.createFirstAdmin({...valid,...patch}),{status:400});
    await service.createFirstAdmin(valid);assert.deepEqual(writes,[{fullName:'First Admin',email:'admin@example.test',passwordHash:'argon2-hash'}]);assert.equal(writes[0].password,undefined);
});

test('bootstrap is serialized, refuses existing admin and never promotes existing customer',async()=>{
    const calls=[];let rollback=false;
    const connection={async execute(sql,args){calls.push({sql,args});if(sql.includes('GET_LOCK'))return [[{acquired:1}]];if(sql.includes("WHERE role = 'admin'"))return [[{id:1}]];if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];throw Error('Must not insert');},async beginTransaction(){},async commit(){},async rollback(){rollback=true;},release(){}};
    await assert.rejects(createBootstrapRepository({getConnection:async()=>connection}).createFirstAdmin({fullName:'Admin',email:'test@example.test',passwordHash:'hash'}),{status:409});
    assert.equal(rollback,true);assert.ok(calls.some(c=>c.sql.includes('RELEASE_LOCK')));assert.equal(calls.some(c=>/^(INSERT|UPDATE)/.test(c.sql)),false);
});


test('public products retain response contract and exclude hidden products in list/count/detail SQL',async(t)=>{
    const pool=require('../src/config/database');
    const queries=[];
    t.mock.method(pool,'query',async(sql,args)=>{
        queries.push(sql);assert.match(sql,/WHERE is_active = TRUE AND name LIKE \?/);
        assert.deepEqual(args,['%%',8,0]);return [[{id:1,name:'Gear',description:null,price:'100.00',stock:2,image_url:null}]];
    });
    t.mock.method(pool,'execute',async(sql,args)=>{
        queries.push(sql);assert.match(sql,/is_active = TRUE/);
        if(sql.includes('COUNT(*)'))return [[{total:1}]];
        return [args[0]===1?[{id:1,name:'Gear',price:'100.00',stock:2,image_url:null}]:[]];
    });
    const server=createServer(createApp({authService:{getUserForSession:async()=>{throw Object.assign(Error('unauthenticated'),{status:401});}}}));
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    try{
        const list=await fetch(base+'/api/products');assert.equal(list.status,200);const data=await list.json();
        assert.equal(data.count,1);assert.equal(data.data[0].id,1);assert.deepEqual(data.pagination,{page:1,limit:8,total:1,totalPages:1});
        assert.equal((await fetch(base+'/api/products/1')).status,200);
        assert.equal((await fetch(base+'/api/products/2')).status,404);
        assert.equal(queries.length,4);
    }finally{await new Promise(resolve=>server.close(resolve));}
});

test('bootstrap writes only a new hashed admin, handles duplicate email, and always releases the lock',async()=>{
    for(const duplicate of [false,true]){
        let inserted=false,committed=false,rolledBack=false,released=false;
        const sqls=[];
        const connection={async execute(sql,args){
            sqls.push(sql);
            if(sql.includes('GET_LOCK'))return [[{acquired:1}]];
            if(sql.includes("WHERE role = 'admin'"))return [[]];
            if(sql.startsWith('INSERT INTO users')){
                assert.deepEqual(args,['New Admin','new@example.test','hashed-secret']);
                if(duplicate)throw Object.assign(Error('duplicate'),{code:'ER_DUP_ENTRY'});
                inserted=true;return [{insertId:9}];
            }
            if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];
            throw Error('Unexpected query');
        },async beginTransaction(){},async commit(){committed=true;},async rollback(){rolledBack=true;},release(){released=true;}};
        const promise=createBootstrapRepository({getConnection:async()=>connection}).createFirstAdmin({fullName:'New Admin',email:'new@example.test',passwordHash:'hashed-secret'});
        if(duplicate){await assert.rejects(promise,{status:409});assert.equal(rolledBack,true);assert.equal(inserted,false);}
        else{assert.deepEqual(await promise,{id:9,fullName:'New Admin',email:'new@example.test',role:'admin'});assert.equal(committed,true);}
        assert.equal(released,true);assert.ok(sqls.some(sql=>sql.includes('RELEASE_LOCK')));assert.equal(sqls.some(sql=>sql.startsWith('UPDATE users')),false);
    }
});

test('order detail preserves official prices and hidden product history without active filter',async()=>{
    const sqls=[];
    const db={async execute(sql,args){sqls.push(sql);assert.deepEqual(args,[10]);return sql.includes('FROM orders')?[[order]]:[[{product_id:1,product_name:'Hidden gear',quantity:1,unit_price:'850000.00',line_total:'850000.00'}]];}};
    const detail=await createAdminRepository(db).findOrder(10);
    assert.equal(detail.total_amount,'850000.00');assert.equal(detail.items[0].unit_price,'850000.00');
    assert.deepEqual(detail.allowedTransitions,['confirmed','cancelled']);
    assert.doesNotMatch(sqls[1],/is_active/);
});

test('customer account detail still includes hidden products and keeps its ownership predicate',async()=>{
    const {createAccountRepository}=require('../src/repositories/account.repository');
    const sqls=[];
    const db={async execute(sql,args){sqls.push(sql);if(sql.includes('FROM orders')){assert.deepEqual(args,[2,10]);return [[order]];}
        assert.deepEqual(args,[2,10]);return [[{order_id:10,product_id:1,product_name:'Hidden gear',quantity:1,unit_price:'850000.00'}]];
    }};
    const detail=await createAccountRepository(db).findOrder(2,10);
    assert.equal(detail.items[0].product_name,'Hidden gear');assert.equal(detail.total_amount,'850000.00');
    assert.match(sqls[0],/user_id = \?/);assert.match(sqls[1],/o.user_id = \?/);assert.doesNotMatch(sqls[1],/is_active/);
});

test('cancellation aggregates repeated product entries without restoring twice per entry',async()=>{
    const f=storeFixture();f.state.items=[{product_id:1,quantity:1},{product_id:1,quantity:2}];
    await f.repository.updateOrderStatus(10,'cancelled','pending');
    assert.equal(f.state.products.get(1).stock,6);
    assert.equal(f.state.events.filter(e=>e.sql.startsWith('UPDATE products SET stock = stock +')).length,1);
});

test('cancellation of missing order returns 404 and releases the transaction',async()=>{
    let rolledBack=false,released=false;
    const connection={async beginTransaction(){},async execute(){return [[]];},async rollback(){rolledBack=true;},release(){released=true;}};
    await assert.rejects(createAdminRepository({getConnection:async()=>connection}).updateOrderStatus(999,'cancelled','pending'),{status:404});
    assert.equal(rolledBack,true);assert.equal(released,true);
});

test('first admin creation stops without writes when the bootstrap lock cannot be acquired',async()=>{
    const calls=[];let released=false;
    const connection={async execute(sql){calls.push(sql);return [[{acquired:0}]];},release(){released=true;}};
    await assert.rejects(createBootstrapRepository({getConnection:async()=>connection}).createFirstAdmin({fullName:'Admin',email:'test@example.test',passwordHash:'hash'}),{status:409});
    assert.equal(calls.length,1);assert.equal(released,true);
});
