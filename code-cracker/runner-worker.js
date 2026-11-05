importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
let runtime;
self.onmessage = async ({data}) => {
 try {
  runtime ||= await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
  self.postMessage({type:'ready'});
  runtime.globals.set('payload_json',JSON.stringify(data));
  const result=runtime.runPython(`
import sys, json, io, contextlib, ast
p = json.loads(payload_json)
source = p['source']
events = []
stream = io.StringIO()
steps = 0
last_output = ''
def trace(frame, event, arg):
    global steps, last_output
    if frame.f_code.co_filename != '<student>':
        return trace
    if event not in ('line', 'return', 'exception'):
        return trace
    steps += 1
    if steps > 12000:
        raise RuntimeError('This run took more than 12,000 steps. Check whether a loop can finish, or use a shorter message.')
    if stream.tell() > 20000:
        raise RuntimeError('There is a lot of printed output. Try a shorter message or check your loop.')
    values = {}
    for k,v in frame.f_locals.items():
        if not k.startswith('_') and type(v) in (str,int,float,bool,type(None)):
            values[k] = str(v)[:240]
    output = stream.getvalue()
    events.append({'line':frame.f_lineno,'function':frame.f_code.co_name,'kind':event,'values':values,'output':output[len(last_output):], 'returned':str(arg)[:240] if event == 'return' else None})
    last_output = output
    return trace
result = None
error = None
try:
    tree = ast.parse(source, filename='<student>')
    # This is a learning editor, not a general-purpose Python terminal.
    for node in ast.walk(tree):
        if isinstance(node,(ast.Import,ast.ImportFrom)):
            raise ValueError('Imports are not needed for these exercises. Use strings, loops, and functions.')
        if isinstance(node,ast.Name) and ((node.id.startswith('__') and node.id != '__name__') or node.id in ('eval','exec','open','compile','globals','locals','breakpoint','input') and p['mode'] != 'main'):
            raise ValueError('This exercise only needs simple string operations and functions.')
    env = {'__name__':'__main__' if p['mode']=='main' else 'exercise', 'input':lambda prompt='': p.get('message','')}
    with contextlib.redirect_stdout(stream):
        sys.settrace(trace)
        exec(compile(tree,'<student>','exec'),env)
        if p['mode'] != 'main':
            result = env[p['functionName']](*p['args'])
        sys.settrace(None)
except BaseException as exc:
    sys.settrace(None)
    error = type(exc).__name__ + ': ' + str(exc)[:500]
json.dumps({'events':events,'output':stream.getvalue()[:20000], 'result':result if type(result) in (str,int,float,bool,type(None)) else str(result)[:500], 'error':error})
`);
  self.postMessage({type:'result',data:JSON.parse(result)});
 } catch(error) {self.postMessage({type:'error',error:'Python could not start or run. Check your connection and try again. '+String(error.message).slice(0,200)});}
};
