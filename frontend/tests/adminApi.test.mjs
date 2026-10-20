import assert from 'node:assert/strict';
import {test} from 'node:test';
import {adminRequest,productPayload} from '../src/admin/adminApi.js';
const original={id:1,name:'Gear',description:null,price:'100.00',stock:5,image_url:null,is_active:1};
const values={name:'Gear',description:'',price:'100',stock:'5',image_url:'',is_active:true};
async function withFetch(mock,run){const old=globalThis.fetch;globalThis.fetch=mock;try{await run();}finally{globalThis.fetch=old;}}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('product edit sends changed fields only and expectedStock only when stock changes',()=>{
    assert.deepEqual(productPayload({...values,name:'New Gear'},original),{name:'New Gear'});
    assert.deepEqual(productPayload({...values,stock:'0'},original),{stock:0,expectedStock:5});
    assert.deepEqual(productPayload({...values,is_active:false},original),{is_active:false});
    assert.throws(()=>productPayload(values,original));
});
test('product form validates integer VND, stock, name, limits and image URL',()=>{
    for(const patch of [{name:''},{name:'x'.repeat(151)},{stock:'-1'},{stock:''},{stock:'1.5'},{stock:'2147483648'},{price:''},{price:'1.2'},{price:'10000000000'},{image_url:'javascript:alert(1)'},{image_url:'https://u:p@example.test/a.png'},{description:'x'.repeat(10001)}])assert.throws(()=>productPayload({...values,...patch}));
    assert.deepEqual(productPayload({...values,name:' Gear '}),{name:'Gear',price:100,stock:5,description:null,image_url:null,is_active:true});
});
test('admin requests include cookie credentials and exact expected status payload',async()=>{
    await withFetch(async(url,options)=>{
        assert.equal(url,'/api/admin/orders/10/status');assert.equal(options.credentials,'include');assert.equal(options.method,'PATCH');assert.deepEqual(JSON.parse(options.body),{status:'cancelled',expectedStatus:'pending'});
        return json({success:true,data:{order:{id:10},changed:true,restocked:true}});
    },async()=>assert.equal((await adminRequest('/orders/10/status',{method:'PATCH',body:{status:'cancelled',expectedStatus:'pending'}})).restocked,true));
});
test('authorization and conflict errors remain actionable, never converted to success',async()=>{
    for(const status of [400,401,403,404,409,500])await withFetch(async()=>json({success:false},status),async()=>assert.rejects(adminRequest('/products?page=1'),error=>error.status===status));
});
test('malformed data and network failure do not produce mock dashboard or rows',async()=>{
    for(const mock of [async()=>json({success:true,data:{}}),async()=>new Response('Bad Gateway',{status:502}),async()=>{throw new TypeError('offline');}])await withFetch(mock,async()=>assert.rejects(adminRequest('/dashboard')));
});
test('uncertain mutation is reported and is not automatically retried',async()=>{
    let calls=0;await withFetch(async()=>{calls++;throw new TypeError('offline');},async()=>assert.rejects(adminRequest('/products',{method:'POST',body:{name:'Gear'}}),error=>error.uncertain===true));assert.equal(calls,1);
});
test('aborted reads preserve AbortError',async()=>{
    await withFetch(async()=>{throw new DOMException('aborted','AbortError');},async()=>assert.rejects(adminRequest('/dashboard'),{name:'AbortError'}));
});

test('GET lists preserve pagination/filter query and returned official data',async()=>{
    const data={rows:[original],pagination:{page:2,limit:10,total:11,totalPages:2}};
    await withFetch(async(url,options)=>{assert.equal(url,'/api/admin/products?page=2&limit=10&status=active&sort=stock_asc');assert.equal(options.method,'GET');return json({success:true,data});},async()=>assert.deepEqual(await adminRequest('/products?page=2&limit=10&status=active&sort=stock_asc'),data));
});
test('malformed list rows and incomplete mutation acknowledgements are rejected',async()=>{
    await withFetch(async()=>json({success:true,data:{rows:[null],pagination:{page:1,limit:10,total:1,totalPages:1}}}),async()=>assert.rejects(adminRequest('/products?page=1')));
    await withFetch(async()=>json({success:true,data:{}}),async()=>assert.rejects(adminRequest('/products',{method:'POST',body:{name:'Gear'}}),error=>error.uncertain===true));
});
