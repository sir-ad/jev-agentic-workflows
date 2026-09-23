import test from 'node:test';
import assert from 'node:assert/strict';
import {judge} from './judge.mjs';
const base={mode:'select',goal:'Classify the described item.',evidence:'A cup for drinking tea.',evidenceVersion:'public-test-1',
 candidates:[{id:'cups',description:'Cups for drinking beverages.'},{id:'bikes',description:'Bicycles.'}],public:true,sanitized:true,coverageChecked:true};
const choice=(criteria,picked)=>({type:'choice',choice:picked,confidence:1,probabilities:Object.fromEntries(Object.keys(criteria).map(k=>[k,k===picked?1:0]))});
function deps(overrides={}) {return {getApiKey:()=> 'test-key',fetchImpl:async(url,options)=>{
 assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(options.redirect,'error');
 const request=JSON.parse(options.body);const answers={};
 for(const [id,q] of Object.entries(request.questions)) answers[id]=q.type==='choice'
  ? choice(q.criteria,id==='selection'?'cups':'supported') : {type:'noul',noul:id==='fit_1'?0.01:0.99};
 for(const [id,value] of Object.entries(overrides)) answers[id]=typeof value==='function'?value(request.questions[id]):value;
 return new Response(JSON.stringify({model:'jev-1.13.0',answers,usage:{input_tokens:500,output_tokens:90}}));
}};}
test('typed choice returns provisional candidate and preserves alternatives',async()=>{
 const r=await judge(base,deps());assert.equal(r.status,'candidate');assert.equal(r.selectedId,'cups');assert.equal(r.rankedCandidates.length,2);assert.equal(r.policy.permitsExternalAction,false);
});
test('private, unsanitized and unchecked coverage make no credential or network call',async()=>{
 for(const field of ['public','sanitized','coverageChecked']) {
  const r=await judge({...base,[field]:false},{getApiKey:()=>{throw Error('must not run')}});
  assert.equal(r.status,'review');assert.equal(r.typesafe,null);
 }
});
test('none and unknown never become a forced classification',async()=>{
 for(const option of ['none','unknown']) {
  const r=await judge(base,deps({selection:q=>choice(q.criteria,option)}));assert.equal(r.status,'review');assert.equal(r.selectedId,null);
 }
});
test('unknown provider option invalidates the response',async()=>{
 const r=await judge(base,deps({selection:{type:'choice',choice:'absent',confidence:1,probabilities:{absent:1}}}));
 assert.equal(r.reason,'service_unavailable');assert.equal(r.selectedId,null);
});
test('high relative choice cannot override poor absolute fit or missing evidence',async()=>{
 for(const id of ['fit_0','sufficient']) {
  const r=await judge(base,deps({[id]:{type:'noul',noul:0.2}}));assert.equal(r.status,'review');assert.equal(r.selectedId,null);
 }
});
test('low confidence triggers review despite a winning option',async()=>{
 const r=await judge(base,deps({selection:q=>({...choice(q.criteria,'cups'),confidence:0.4})}));assert.equal(r.status,'review');
});
test('separate verification needs sufficient evidence and positive verdict',async()=>{
 const r=await judge({...base,mode:'verify',selectedId:'cups'},deps());assert.equal(r.status,'supported');assert.equal(r.policy.requiresIndependentAcceptance,true);
});
test('contradiction reopens branch rather than reporting success',async()=>{
 const r=await judge({...base,mode:'verify',selectedId:'cups'},deps({verdict:q=>choice(q.criteria,'contradicted')}));
 assert.equal(r.status,'review');assert.equal(r.reason,'contradiction_reconsider_branch');
});
test('incomplete verification asks for missing evidence',async()=>{
 const r=await judge({...base,mode:'verify',selectedId:'cups'},deps({verdict:q=>choice(q.criteria,'insufficient')}));assert.equal(r.reason,'gather_missing_evidence');
});
test('consequential decisions require independent review even with confident support',async()=>{
 const r=await judge({...base,mode:'verify',selectedId:'cups',highConsequence:true},deps());assert.equal(r.status,'review');assert.equal(r.reason,'independent_reviewer_required');
});
test('arbitrary endpoints, secret fields, duplicates and missing selection are rejected',async()=>{
 for(const change of [{endpoint:'https://example.com'},{apiKey:'secret-value'},{goal:'password=secret'},
  {candidates:[base.candidates[0],base.candidates[0]]},{mode:'verify',selectedId:'missing'}]) await assert.rejects(judge({...base,...change},deps()));
});
test('credential failure falls back without exposing error',async()=>{
 const r=await judge(base,{getApiKey:()=>{throw Error('do-not-print')}});assert.equal(r.reason,'credential_unavailable');assert.ok(!JSON.stringify(r).includes('do-not-print'));
});
test('HTTP failures make one call and never reveal provider error bodies',async()=>{
 let calls=0;const r=await judge(base,{getApiKey:()=> 'test-key',fetchImpl:async()=>{calls++;return new Response('secret-body',{status:429})}});
 assert.equal(calls,1);assert.equal(r.reason,'service_unavailable');assert.ok(!JSON.stringify(r).includes('secret-body'));
});
test('deadline bounds a stalled response',async()=>{
 const r=await judge({...base,timeoutMs:100},{getApiKey:()=> 'test-key',fetchImpl:()=>new Promise(()=>{})});assert.equal(r.reason,'service_unavailable');
});
test('oversized provider response is rejected',async()=>{
 const r=await judge(base,{getApiKey:()=> 'test-key',fetchImpl:async()=>new Response('x'.repeat(65537))});assert.equal(r.reason,'service_unavailable');
});
test('receipt omits raw evidence and changes digest when evidence changes',async()=>{
 const a=await judge(base,deps());const b=await judge({...base,evidenceVersion:'public-test-2'},deps());
 assert.notEqual(a.decisionId,b.decisionId);assert.ok(!JSON.stringify(a).includes(base.evidence));assert.ok(!JSON.stringify(a).includes('test-key'));
});
test('weak none winner does not establish no match',async()=>{
 const r=await judge(base,deps({selection:q=>({...choice(q.criteria,'none'),confidence:0.3})}));
 assert.equal(r.reason,'uncertain_or_poor_fit');
});
test('weak contradiction does not establish branch failure',async()=>{
 const r=await judge({...base,mode:'verify',selectedId:'cups'},deps({verdict:q=>({...choice(q.criteria,'contradicted'),confidence:0.3})}));
 assert.equal(r.reason,'uncertain_verification');
});
test('no match conflicts with an independently strong candidate fit',async()=>{
 const r=await judge(base,deps({selection:q=>choice(q.criteria,'none')}));
 assert.equal(r.status,'review');assert.equal(r.reason,'conflicting_judgments');
});
test('no match requires all offered candidates to have weak fit',async()=>{
 const r=await judge(base,deps({selection:q=>choice(q.criteria,'none'),fit_0:{type:'noul',noul:0.1}}));
 assert.equal(r.reason,'no_match');
});
test('provider cannot coerce an array into an accepted choice',async()=>{
 const r=await judge(base,deps({selection:q=>({...choice(q.criteria,'cups'),choice:['cups']})}));
 assert.equal(r.reason,'service_unavailable');
});
test('deadline also covers a stalled response body',async()=>{
 let cancelled=false;
 const r=await judge({...base,timeoutMs:100},{getApiKey:()=> 'test-key',fetchImpl:async(_url,{signal})=>{
  const body=new ReadableStream({start(controller){signal.addEventListener('abort',()=>{cancelled=true;controller.error(new Error('abort'));},{once:true});}});
  return new Response(body);
 }});
 assert.equal(r.reason,'service_unavailable');assert.equal(cancelled,true);
});
test('invalid probabilities and usage are rejected',async()=>{
 for(const corrupt of [
  data=>{data.answers.selection.probabilities.cups=-1;},
  data=>{data.answers.selection.probabilities.bikes=1;},
  data=>{delete data.answers.sufficient;},
  data=>{data.usage.input_tokens=-1;},
  data=>{data.model='unexpected-model';}
 ]) {
  const transport=deps();const original=transport.fetchImpl;
  transport.fetchImpl=async(...args)=>{const data=await (await original(...args)).json();corrupt(data);return new Response(JSON.stringify(data));};
  assert.equal((await judge(base,transport)).reason,'service_unavailable');
 }
});
