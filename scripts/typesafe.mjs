import {execFileSync} from 'node:child_process';
const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const probability = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
function check(ok, message) { if (!ok) throw new Error(message); }
export function validateAnswers(data, request) {
  check(data && typeof data.model === 'string' && /^jev-[a-z0-9.-]{1,50}$/.test(data.model), 'Invalid provider model');
  check(data.answers && typeof data.answers === 'object' && !Array.isArray(data.answers), 'Missing answers');
  const answers = {};
  for (const [id,q] of Object.entries(request.questions)) {
    const a = data.answers[id];
    if (q.type === 'choice') {
      check(a?.type === 'choice' && typeof a.choice === 'string' && Object.hasOwn(q.criteria, a.choice) && probability(a.confidence), 'Invalid choice answer');
      const expected = Object.keys(q.criteria);
      check(a.probabilities && !Array.isArray(a.probabilities) && Object.keys(a.probabilities).length === expected.length && expected.every(k => Object.hasOwn(a.probabilities,k) && probability(a.probabilities[k])), 'Invalid distribution');
      check(Math.abs(Object.values(a.probabilities).reduce((x,y) => x+y,0) - 1) <= 0.02, 'Invalid probability sum');
      check(a.probabilities[a.choice] >= Math.max(...Object.values(a.probabilities)) - 0.00001, 'Choice does not match distribution');
      answers[id] = {type:a.type, choice:a.choice, confidence:a.confidence, probabilities:a.probabilities};
    } else {
      check(a?.type === 'noul' && probability(a.noul), 'Invalid binary answer');
      answers[id] = {type:'noul', noul:a.noul};
    }
  }
  const usage = data.usage;
  check(usage && Number.isSafeInteger(usage.input_tokens) && usage.input_tokens >= 0 && Number.isSafeInteger(usage.output_tokens) && usage.output_tokens >= 0, 'Missing usage');
  return {model: data.model, answers, usage: {input_tokens: usage.input_tokens, output_tokens: usage.output_tokens}};
}

export function runtimeApiKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  if (process.platform !== 'darwin') return '';
  try {
    return execFileSync('security', ['find-generic-password', '-a', 'typesafe-ai', '-s', 'typesafe_api_key', '-w'],
      {encoding: 'utf8', stdio: ['ignore','pipe','ignore'], timeout: 3000}).trim();
  } catch { return ''; }
}

async function boundedJson(response) {
  check(response.body?.getReader, 'Expected streaming HTTP response');
  const reader = response.body.getReader();
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      check(bytes <= 65536, 'Provider response exceeds 64 KB');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { reader.cancel().catch(() => {}); }
}

export async function evaluate(request, {apiKey, timeoutMs, fetchImpl = fetch}) {
  const start = performance.now();
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_,reject) => {
    timer = setTimeout(() => {controller.abort(); reject(new Error('deadline'));}, timeoutMs);
  });
  try {
    const task = (async () => {
      const response = await fetchImpl(ENDPOINT, {method:'POST', redirect:'error',
        headers:{Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json'},
        body:JSON.stringify(request), signal:controller.signal});
      if (!response.ok) {
        response.body?.cancel().catch(() => {});
        return {status:'unavailable', reason:`http_${response.status}`};
      }
      return {status:'evaluated', ...validateAnswers(await boundedJson(response), request)};
    })();
    return {...await Promise.race([task, timeout]), durationMs:Math.round(performance.now()-start)};
  } catch { return {status:'unavailable', reason:'timeout_network_or_invalid_response', durationMs:Math.round(performance.now()-start)}; }
  finally { clearTimeout(timer); controller.abort(); }
}
