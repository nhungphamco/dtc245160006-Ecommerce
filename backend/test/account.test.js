const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createServer } = require('node:http');
const { createHash } = require('node:crypto');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/auth.service');
const { createAccountRepository } = require('../src/repositories/account.repository');
const { createOrderRepository } = require('../src/repositories/order.repository');
const { createOrderService } = require('../src/services/order.service');
const token = id => `account-test-token-${String(id).padStart(32, '0')}`;
const hash = value => createHash('sha256').update(value).digest('hex');
const checkout = { customer_name: 'Customer Test', customer_phone: '0901234567', items: [{ product_id: 1, quantity: 2 }] };
async function withApp(run, { failProfile = false } = {}) {
    const users = new Map([1,2].map(id => [id, { id, full_name: `Customer ${id}`, email: `customer${id}@example.test`, role: 'customer', created_at: '2026-10-01T00:00:00Z', password_hash: 'secret' }]));
    const orders = [{ id:10, user_id:1, total_amount:'100000.00', items:[{product_id:1,quantity:2}] },{ id:20,user_id:2,items:[] },{ id:30,user_id:null,items:[] }];
    const sessions = new Map([1,2].map(id=>[hash(token(id)),id]));
    const expires = new Map([1,2].map(id => [id, Date.now() + 60000]));
    const writes=[];
    const authService=createAuthService({repository:{async findUserBySessionTokenHash(value){const id=sessions.get(value); return expires.get(id) > Date.now() ? users.get(id)||null : null;}},passwords:{hashPassword:async()=>'dummy'}});
    const accountRepository={
        async findProfile(id){if(failProfile)throw Error('private database failure');return users.get(id)||null;},
        async updateProfile(id,name){users.get(id).full_name=name;return users.get(id);},
        async listOrders(id,{limit,offset}){const own=orders.filter(o=>o.user_id===id);return {orders:own.slice(offset,offset+limit),total:own.length};},
        async findOrder(id,orderId){return orders.find(o=>o.user_id===id&&o.id===orderId)||null;}
    };
    const app=createApp({database:{query(){throw Error('Database forbidden');},execute(){throw Error('Database forbidden');}},authService,accountRepository,orderRepository:{async createOrder(value){writes.push(value);return {orderId:99,totalAmount:100000,status:'pending',items:value.items};}}});
    const server=createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    const request=(path,{user,cookie,origin=base,method='GET',body}={})=>fetch(base+path,{method,headers:{...(user?{Cookie:`minishop_session=${token(user)}`} : {}),...(cookie!==undefined?{Cookie:cookie}:{}),...(origin===null?{}:{Origin:origin}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    try{await run({request,writes,users,orders,sessions,expires});}finally{await new Promise(resolve=>server.close(resolve));}
}
test('all account endpoints require session and disable caching',async()=>withApp(async({request})=>{
    for(const [path,method,body] of [['/profile','GET'],['/profile','PATCH',{fullName:'Other Name'}],['/orders','GET'],['/orders/10','GET']]){
        const r=await request('/api/account'+path,{method,body});assert.equal(r.status,401);assert.equal(r.headers.get('cache-control'),'no-store');
    }
}));
test('profile returns only safe fields; update trims names and cannot change identity/role/email',async()=>withApp(async({request,users})=>{
    const r=await request('/api/account/profile',{user:1});assert.equal(r.status,200);
    const data=(await r.json()).data.user;assert.deepEqual(Object.keys(data).sort(),['createdAt','email','fullName','id','role'].sort());assert.equal(data.id,1);
    const update=await request('/api/account/profile',{user:1,method:'PATCH',body:{fullName:'  New Name  '}});assert.equal(update.status,200);assert.equal((await update.json()).data.user.fullName,'New Name');assert.equal(users.get(2).full_name,'Customer 2');
    for(const body of [{fullName:'X'},{fullName:'x'.repeat(101)},{fullName:'New\nName'},{fullName:123},{},[],null,{fullName:'New Name',user_id:2},{fullName:'New Name',role:'admin'},{fullName:'New Name',email:'other@example.test'}]) assert.equal((await request('/api/account/profile',{user:1,method:'PATCH',body})).status,400);
    assert.equal(users.get(1).role,'customer');assert.equal(users.get(1).email,'customer1@example.test');
}));
test('profile and signed-in checkout reject missing/untrusted Origin',async()=>withApp(async({request,writes})=>{
    for(const origin of [null,'null','https://attacker.example']){
        assert.equal((await request('/api/account/profile',{user:1,method:'PATCH',origin,body:{fullName:'New Name'}})).status,403);
        assert.equal((await request('/api/orders',{user:1,method:'POST',origin,body:checkout})).status,403);
    }assert.equal(writes.length,0);
}));
test('history isolates users, excludes guest orders and validates pagination',async()=>withApp(async({request})=>{
    const r=await request('/api/account/orders?page=1&pageSize=1&user_id=2',{user:1});assert.equal(r.status,200);const data=(await r.json()).data;
    assert.deepEqual(data.orders.map(o=>o.id),[10]);assert.equal(data.orders[0].items[0].quantity,2);assert.deepEqual(data.pagination,{page:1,pageSize:1,total:1,totalPages:1});
    const second=await request('/api/account/orders?page=2&pageSize=1',{user:1});assert.deepEqual((await second.json()).data.orders,[]);
    for(const query of ['page=0','page=-1','page=1.5','page=1e2','page=9007199254740992','pageSize=51','pageSize=0','page=1&page=2','pageSize=2&pageSize=3','page=9007199254740991&pageSize=50'])assert.equal((await request('/api/account/orders?'+query,{user:1})).status,400,query);
}));
test('detail hides other customers and guest orders behind identical 404 responses',async()=>withApp(async({request})=>{
    assert.equal((await request('/api/account/orders/10',{user:1})).status,200);
    for(const id of ['20','30','999']){const r=await request('/api/account/orders/'+id,{user:1});assert.equal(r.status,404);assert.equal((await r.json()).message,'Khong tim thay don hang');}
    for(const id of ['0','-1','1.5','1e2','9007199254740992','abc'])assert.equal((await request('/api/account/orders/'+id,{user:1})).status,400);
    assert.equal((await request('/api/account/orders/10',{user:2})).status,404);
}));
test('checkout identity comes only from session; guest checkout and unlinked old orders remain intact',async()=>withApp(async({request,writes,orders})=>{
    assert.equal((await request('/api/orders',{user:1,method:'POST',body:{...checkout,user_id:2,role:'admin'}})).status,201);assert.equal(writes[0].userId,1);assert.deepEqual(writes[0].items,[{productId:1,quantity:2}]);
    assert.equal((await request('/api/orders',{method:'POST',origin:null,body:{...checkout,user_id:2}})).status,201);assert.equal(writes[1].userId,null);assert.equal(orders.find(o=>o.id===30).user_id,null);
}));
test('invalid, empty, malformed or revoked sessions never fall back to guest',async()=>withApp(async({request,sessions,writes})=>{
    sessions.delete(hash(token(1)));
    for(const cookie of [`minishop_session=${token(1)}`,`minishop_session=${token(9)}`,'minishop_session=','minishop_session=%ZZ','minishop_session']){
        assert.equal((await request('/api/orders',{cookie,method:'POST',body:checkout})).status,401);assert.equal((await request('/api/account/orders',{cookie})).status,401);
    }assert.equal(writes.length,0);
}));
test('invalid checkout input never writes an order',async()=>withApp(async({request,writes})=>{
    for(const body of [null,[],{},{...checkout,customer_phone:'123'},{...checkout,customer_name:'X'},{...checkout,items:[]},{...checkout,items:[{product_id:1,quantity:0}]},{...checkout,items:[...checkout.items,...checkout.items]}])assert.equal((await request('/api/orders',{method:'POST',body})).status,400);
    assert.equal(writes.length,0);
}));
test('repository SQL binds owner identity on list/detail/items and updates only own profile',async()=>{
    const calls=[];const database={async execute(sql,args){calls.push({sql,args});if(sql.includes('COUNT(*)'))return [[{total:1}]];if(sql.includes('FROM order_items'))return [[{order_id:10,product_id:1}]];if(sql.includes('FROM orders'))return [[{id:10}]];if(sql.includes('FROM users'))return [[{id:1}]];return [{affectedRows:1}];}};
    const repo=createAccountRepository(database);assert.equal((await repo.listOrders(1,{limit:10,offset:0})).orders[0].items.length,1);await repo.findOrder(1,10);await repo.updateProfile(1,"Name ' SQL");
    for(const c of calls.filter(c=>c.sql.includes('FROM orders')||c.sql.includes('FROM order_items'))){assert.match(c.sql,/(?:o\.)?user_id = \?/);assert.equal(c.args[0],1);}
    const update=calls.find(c=>c.sql.includes('UPDATE users'));assert.deepEqual(update.args,["Name ' SQL",1]);assert.match(update.sql,/WHERE id = \? AND is_active = TRUE/);assert.doesNotMatch(update.sql,/Name ' SQL/);
    assert.equal(await createAccountRepository({execute:async()=>[[]]}).findOrder(1,20),null);
});
function transactionFixture({missing=false,stock=5,updateFails=false,itemFails=false,invalidPrice=false,inactive=false,secondUpdateFails=false}={}){
    const events=[];const state={stock,orders:[],items:[],committed:false,rolledBack:false,released:false};let snapshot; let updateCount=0;
    const connection={
        async beginTransaction(){snapshot=structuredClone(state);},
        async execute(sql,args){events.push({sql,args});
            if(sql.includes('SELECT id'))return [missing?[]:[{id:args[0],name:'Gear',is_active:inactive?0:1,price:invalidPrice?'1.50':'50000.00',stock:state.stock}]];
            if(sql.includes('INSERT INTO orders')){state.orders.push(args);return [{insertId:77}];}
            if(sql.includes('INSERT INTO order_items')){if(itemFails)throw Error('insert failed');state.items.push(args);return [{affectedRows:1}];}
            if(sql.includes('UPDATE products')){updateCount++;if(updateFails || (secondUpdateFails && updateCount === 2))return [{affectedRows:0}];state.stock-=args[0];return [{affectedRows:1}];}
            throw Error('Unexpected SQL');
        },
        async commit(){state.committed=true;},async rollback(){Object.assign(state,snapshot,{rolledBack:true});},release(){state.released=true;}
    };return {state,events,repository:createOrderRepository({getConnection:async()=>connection})};
}
test('real order service/repository preserves server price, stock locks, stock deduction and session linkage',async()=>{
    for(const userId of [1,null]){const f=transactionFixture();const service=createOrderService({repository:f.repository});const result=await service.placeOrder({...checkout,total_amount:1,items:[{product_id:1,quantity:2,price:1}]},userId);
        assert.equal(result.totalAmount,100000);assert.equal(f.state.stock,3);assert.equal(f.state.orders[0][3],userId);assert.equal(f.state.committed,true);assert.equal(f.state.released,true);
        assert.match(f.events.find(e=>e.sql.includes('SELECT id')).sql,/FOR UPDATE/);assert.match(f.events.find(e=>e.sql.includes('UPDATE products')).sql,/stock >= \?/);
    }
});
test('transactions roll back on shortage, missing product, bad price, item insert error or stock conflict',async()=>{
    for(const options of [{stock:1},{missing:true},{invalidPrice:true},{itemFails:true},{updateFails:true}]){
        const f=transactionFixture(options);await assert.rejects(createOrderService({repository:f.repository}).placeOrder(checkout,1));assert.equal(f.state.committed,false);assert.equal(f.state.rolledBack,true);assert.equal(f.state.released,true);assert.equal(f.state.stock,options.stock??5);assert.deepEqual(f.state.orders,[]);assert.deepEqual(f.state.items,[]);
    }
});

test('expired session is rejected on both history and checkout',async()=>withApp(async({request,expires,writes})=>{
    expires.set(1,Date.now()-1000);
    assert.equal((await request('/api/account/orders',{user:1})).status,401);
    assert.equal((await request('/api/orders',{user:1,method:'POST',body:checkout})).status,401);
    assert.equal(writes.length,0);
}));

test('account API reports repository failure without exposing database details',async(t)=>{
    t.mock.method(console,'error',()=>{});
    await withApp(async({request})=>{
        const response=await request('/api/account/profile',{user:1});
        assert.equal(response.status,500);
        assert.deepEqual(await response.json(),{success:false,message:'Loi he thong'});
        assert.equal(response.headers.get('cache-control'),'no-store');
    },{failProfile:true});
});
test('transaction locks multiple products in stable id order',async()=>{
    const f=transactionFixture();
    await createOrderService({repository:f.repository}).placeOrder({...checkout,items:[{product_id:2,quantity:1},{product_id:1,quantity:1}]},1);
    const locks=f.events.filter(e=>e.sql.includes('FOR UPDATE'));
    assert.deepEqual(locks.map(e=>e.args[0]),[1,2]);
    assert.equal(f.state.stock,3);
});

test('failure after a successful stock deduction rolls back the entire multi-item order',async()=>{
    const f=transactionFixture({secondUpdateFails:true});
    await assert.rejects(createOrderService({repository:f.repository}).placeOrder({...checkout,items:[{product_id:1,quantity:1},{product_id:2,quantity:1}]},1),{status:409});
    assert.equal(f.events.filter(e=>e.sql.includes('UPDATE products')).length,2);
    assert.equal(f.state.stock,5);
    assert.deepEqual(f.state.orders,[]);
    assert.deepEqual(f.state.items,[]);
    assert.equal(f.state.rolledBack,true);
    assert.equal(f.state.committed,false);
    assert.equal(f.state.released,true);
});


test('checkout rejects hidden product inside transaction without deducting stock or writing order',async()=>{
    const f=transactionFixture({inactive:true});
    await assert.rejects(createOrderService({repository:f.repository}).placeOrder(checkout,1),{status:409});
    assert.equal(f.state.stock,5);assert.deepEqual(f.state.orders,[]);assert.deepEqual(f.state.items,[]);
    assert.equal(f.state.rolledBack,true);assert.equal(f.state.released,true);
});
