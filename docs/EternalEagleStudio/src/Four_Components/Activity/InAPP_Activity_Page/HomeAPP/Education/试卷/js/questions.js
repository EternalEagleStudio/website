/* js/questions.js —— 题目工厂 + 全部题库 */
(function(global){
'use strict';

/* ---------- 工具 ---------- */
function rnd(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function pick(a){ return a[rnd(0,a.length-1)]; }
function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=rnd(0,i); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
var SUB='₀₁₂₃₄₅₆₇₈₉';
function sub(n){ return String(n).split('').map(function(c){return SUB[+c];}).join(''); }
function coef(c,v){ if(c===0) return ''; var s=c>0?'+':'−'; var a=Math.abs(c); return s+(a===1?'':a)+v; }
function norm(s){
  return String(s).replace(/[\s\u3000]/g,'')
	.replace(/[，,。.；;：:！!？?、""''“”‘’（）()《》<>【】\[\]]/g,'')
	.replace(/[Ａ-Ｚａ-ｚ０-９]/g,function(c){ return String.fromCharCode(c.charCodeAt(0)-0xFEE0); })
	.toLowerCase();
}
function toNum(s){
  var t=norm(s);
  var m=t.match(/^(-?\d+)\/(-?\d+)$/);
  if(m) return (+m[1])/(+m[2]);
  if(/^-?\d+(\.\d+)?$/.test(t)) return +t;
  return NaN;
}

/* ---------- 题目工厂 ---------- */
var uid = 0;
function mcq(o){
  var correct = String(o.correct);
  var seen = {}, opts = [correct];
  seen[correct] = 1;
  (o.wrongs||[]).forEach(function(w){ var s=String(w); if(!seen[s] && opts.length<4){ seen[s]=1; opts.push(s); } });
  var guard = 0;
  while(opts.length < 4 && guard++ < 80){
	var n = Number(o.correct);
	var cand = isNaN(n) ? '选项' + guard : String(n + guard*3);
	if(!seen[cand]){ seen[cand]=1; opts.push(cand); }
  }
  var sh = shuffle(opts.slice());
  return {
	id: ++uid, type: 'choice', point: o.point, score: o.score || 5,
	stem: o.stem,
	options: sh.map(function(t,i){ return 'ABCD'[i] + '. ' + t; }),
	answer: 'ABCD'[sh.indexOf(correct)],
	answerText: correct,
	hint: o.hint, analysis: o.analysis
  };
}
function fbq(o){
  return { id:++uid, type:'fill', point:o.point, score:o.score||5, stem:o.stem,
		   answer:String(o.answer), hint:o.hint, analysis:o.analysis };
}

/* ============================================================
   数学 —— 随机参数化生成器
============================================================ */
var mathGens = [
  function(){
	var a1 = rnd(-5,5), d = pick([1,2,3,4,-1,-2,-3]), n = rnd(7,12);
	var an = a1 + (n-1)*d;
	return mcq({ point:'等差数列',
	  stem:'已知等差数列 {aₙ} 中，a₁ = ' + a1 + '，公差 d = ' + d + '，则 a' + sub(n) + ' = （　　）',
	  correct: an, wrongs:[a1 + n*d, an - d, an + 2*d, an + d],
	  hint:'提示：等差数列通项公式 aₙ = a₁ + (n − 1)d。注意括号里是 n − 1，不是 n。',
	  analysis:'a' + sub(n) + ' = a₁ + (' + n + ' − 1)d = ' + a1 + ' + ' + (n-1) + '×(' + d + ') = ' + an + '。' });
  },
  function(){
	var a1 = rnd(-3,4), d = pick([1,2,3]), n = rnd(5,10);
	var S = n*a1 + n*(n-1)/2*d;
	return mcq({ point:'等差数列求和',
	  stem:'已知等差数列 {aₙ} 中，a₁ = ' + a1 + '，公差 d = ' + d + '，则前 ' + n + ' 项和 S' + sub(n) + ' = （　　）',
	  correct: S, wrongs:[S + d, S - a1, S + n, S - d],
	  hint:'提示：等差数列前 n 项和公式 Sₙ = n·a₁ + n(n−1)/2·d。先算 n(n−1)/2 再乘 d，最后加上 n·a₁。',
	  analysis:'S' + sub(n) + ' = ' + n + '×(' + a1 + ') + ' + n + '×' + (n-1) + '/2×' + d + ' = ' + S + '。' });
  },
  function(){
	var a1 = pick([1,2,3,-1,-2]), q = pick([2,3,-2,-3]), n = rnd(4,6);
	var an = a1 * Math.pow(q, n-1);
	return mcq({ point:'等比数列',
	  stem:'已知等比数列 {aₙ} 中，a₁ = ' + a1 + '，公比 q = ' + q + '，则 a' + sub(n) + ' = （　　）',
	  correct: an, wrongs:[a1*Math.pow(q,n), an*q, a1*Math.pow(q,n-2), an/q],
	  hint:'提示：等比数列通项公式 aₙ = a₁·qⁿ⁻¹。先算指数 n − 1，再求 q 的幂，最后乘 a₁。',
	  analysis:'a' + sub(n) + ' = a₁·q^' + (n-1) + ' = ' + a1 + '×(' + q + ')^' + (n-1) + ' = ' + an + '。' });
  },
  function(){
	var a = pick([1,2,4,8]), b = pick([2,4,8,16]);
	var g = Math.sqrt(a*b);
	var gs = Number.isInteger(g) ? g : a*b;
	return mcq({ point:'等比中项',
	  stem:'若 ' + a + '，G，' + b + ' 成等比数列，则 G = （　　）',
	  correct: gs, wrongs:[(a+b)/2, a*b, -gs, gs+1],
	  hint:'提示：等比中项 G² = ab，所以 G = ±√(ab)。注意等比中项有两个（互为相反数），本题取正值。',
	  analysis:'G² = ' + a + '×' + b + ' = ' + (a*b) + '，G = ' + gs + '。' });
  },
  function(){
	var t = pick([[3,4,5],[5,12,13],[8,15,17],[7,24,25]]);
	return mcq({ point:'同角三角函数',
	  stem:'已知 α 为锐角，且 sin α = ' + t[0] + '/' + t[2] + '，则 cos α = （　　）',
	  correct: t[1] + '/' + t[2],
	  wrongs:[t[0] + '/' + t[1], t[1] + '/' + t[0], t[2] + '/' + t[1], t[0] + '/' + t[2]],
	  hint:'提示：利用平方关系 sin²α + cos²α = 1。因为 α 是锐角，所以 cos α 取正值。',
	  analysis:'cos α = √(1 − sin²α) = √(1 − ' + (t[0]*t[0]) + '/' + (t[2]*t[2]) + ') = ' + t[1] + '/' + t[2] + '。' });
  },
  function(){
	var t = pick([
	  {s:'sin 150°', v:'1/2', w:['−1/2','√3/2','−√3/2','1']},
	  {s:'cos 120°', v:'−1/2', w:['1/2','√3/2','−√3/2','−1']},
	  {s:'sin 210°', v:'−1/2', w:['1/2','√3/2','−√3/2','−1']},
	  {s:'cos 210°', v:'−√3/2', w:['√3/2','1/2','−1/2','−1']},
	  {s:'tan 135°', v:'−1', w:['1','−√3','√3','0']},
	  {s:'sin 240°', v:'−√3/2', w:['√3/2','−1/2','1/2','−1']}
	]);
	return mcq({ point:'诱导公式',
	  stem:'计算 ' + t.s + ' = （　　）',
	  correct: t.v, wrongs: t.w,
	  hint:'提示：先判断角所在象限，再确定符号，最后用诱导公式化成锐角三角函数。口诀："奇变偶不变，符号看象限"。',
	  analysis:t.s + ' = ' + t.v + '。' });
  },
  function(){
	var t = pick([
	  {A:30,B:45,a:2,b:'2√2'},
	  {A:60,B:45,a:'√3',b:'√2'},
	  {A:45,B:60,a:'√2',b:'√3'},
	  {A:30,B:60,a:1,b:'√3'}
	]);
	return mcq({ point:'正弦定理',
	  stem:'在△ABC 中，已知 A = ' + t.A + '°，B = ' + t.B + '°，a = ' + t.a + '，则 b = （　　）',
	  correct: t.b,
	  wrongs:['1','2','√2','√3','2√3','√6/2'].filter(function(x){return x!==t.b;}),
	  hint:'提示：用正弦定理 a/sin A = b/sin B，所以 b = a·sin B / sin A。把特殊角的正弦值代入计算。',
	  analysis:'由正弦定理 b = a·sin B / sin A = ' + t.a + '×sin ' + t.B + '° / sin ' + t.A + '° = ' + t.b + '。' });
  },
  function(){
	var t = pick([
	  {a:3,b:8,c:7,C:60},{a:5,b:8,c:7,C:60},{a:7,b:15,c:13,C:60},
	  {a:8,b:15,c:13,C:60},{a:5,b:16,c:19,C:120},{a:7,b:8,c:13,C:120}
	]);
	var wrongs = t.C===60 ? ['30°','45°','90°','120°','135°'] : ['30°','45°','60°','90°','150°'];
	return mcq({ point:'余弦定理',
	  stem:'在△ABC 中，已知 a = ' + t.a + '，b = ' + t.b + '，c = ' + t.c + '，则角 C = （　　）',
	  correct: t.C + '°', wrongs: wrongs,
	  hint:'提示：已知三边求角，用余弦定理 cos C = (a² + b² − c²) ÷ (2ab)。算完 cos C 后，再根据特殊角判断 C。',
	  analysis:'cos C = (' + t.a + '² + ' + t.b + '² − ' + t.c + '²) ÷ (2×' + t.a + '×' + t.b + ') = ' + (t.C===60?'1/2':'−1/2') + '，所以 C = ' + t.C + '°。' });
  },
  function(){
	var t = pick([
	  {a:3,b:4,C:30,S:3},{a:2,b:6,C:30,S:3},{a:4,b:5,C:30,S:5},
	  {a:2,b:4,C:60,S:'2√3'},{a:3,b:4,C:60,S:'3√3'},{a:5,b:6,C:120,S:'15√3/2'}
	]);
	return mcq({ point:'三角形面积',
	  stem:'在△ABC 中，已知 a = ' + t.a + '，b = ' + t.b + '，C = ' + t.C + '°，则△ABC 的面积 S = （　　）',
	  correct: t.S,
	  wrongs:['3','4','5','6','2√3','3√3','4√3'],
	  hint:'提示：三角形面积公式 S = ½·a·b·sin C。先把 sin C 的值代进去，再算 ½·a·b 与它的乘积。',
	  analysis:'S = ½·a·b·sin C = ½×' + t.a + '×' + t.b + '×sin ' + t.C + '° = ' + t.S + '。' });
  },
  function(){
	var a = rnd(-3,3), b = rnd(-4,4), x0 = pick([1,2,-1]);
	var val = 3*x0*x0 + 2*a*x0 + b;
	var fstr = 'x³' + coef(a,'x²') + coef(b,'x');
	return mcq({ point:'导数运算',
	  stem:'已知函数 f(x) = ' + fstr + '，则 f′(' + x0 + ') = （　　）',
	  correct: val, wrongs:[val + 2, val - 3, 3*x0*x0 + a*x0 + b, val + 6],
	  hint:'提示：先求导 f′(x) = 3x² + 2ax + b，再把 x = ' + x0 + ' 代入逐项计算。',
	  analysis:'f′(x) = 3x² ' + (2*a>=0?'+ ':'− ') + Math.abs(2*a) + 'x ' + (b>=0?'+ ':'− ') + Math.abs(b) + '，代入 x = ' + x0 + ' 得 f′(' + x0 + ') = ' + val + '。' });
  },
  function(){
	var a = rnd(1,4);
	var f = a + 'x² − 2x';
	return mcq({ point:'导数与单调性',
	  stem:'函数 f(x) = ' + f + ' 的单调递增区间是（　　）',
	  correct:'(1/' + a + '，+∞)',
	  wrongs:['(−∞，1/' + a + ')','(−∞，' + a + ')','(' + a + '，+∞)','(0，+∞)'],
	  hint:'提示：求导 f′(x) = 2ax − 2，令 f′(x) > 0 解不等式，解出的 x 范围就是单调递增区间。',
	  analysis:'f′(x) = ' + (2*a) + 'x − 2 > 0，解得 x > 1/' + a + '，所以单调递增区间为 (1/' + a + '，+∞)。' });
  },
  function(){
	var t = pick([[3,10],[2,5],[4,15],[3,20],[5,12],[7,20],[2,9],[5,16]]);
	var red = t[0], total = t[1];
	return mcq({ point:'古典概型',
	  stem:'袋中装有 ' + total + ' 个大小、质地完全相同的小球，其中有 ' + red + ' 个红球。从袋中随机摸出一个球，摸到红球的概率是（　　）',
	  correct: red + '/' + total,
	  wrongs:[(total-red) + '/' + total, red + '/' + (total-red), '1/' + total, red + '/' + (total+red)],
	  hint:'提示：古典概型 P(A) = 事件 A 包含的基本事件数 ÷ 基本事件总数，也就是"红球个数 ÷ 球的总数"。',
	  analysis:'P = ' + red + '/' + total + '。' });
  },
  function(){
	var t = pick([[0.3,0.7],[0.25,0.75],[0.4,0.6],[0.15,0.85],[0.35,0.65]]);
	return mcq({ point:'对立事件概率',
	  stem:'已知事件 A 发生的概率 P(A) = ' + t[0] + '，则其对立事件 Ā 发生的概率 P(Ā) = （　　）',
	  correct: t[1], wrongs:[t[0], t[0]*2, 1 - t[0]*2, t[0] + 0.1],
	  hint:'提示：对立事件概率之和为 1，即 P(A) + P(Ā) = 1。所以 P(Ā) = 1 − P(A)。',
	  analysis:'P(Ā) = 1 − P(A) = 1 − ' + t[0] + ' = ' + t[1] + '。' });
  },
  function(){
	var k = rnd(2,5), m = rnd(2,4), p = rnd(1,3);
	var val = k + m + p;
	return mcq({ point:'对数运算',
	  stem:'计算 log₂' + Math.pow(2,k) + ' + log₃' + Math.pow(3,m) + ' + lg' + Math.pow(10,p) + ' = （　　）',
	  correct: val, wrongs:[val+1, val-1, k*m*p, k+m],
	  hint:'提示：利用 log_a(aⁿ) = n。把每个真数都写成底数的幂，再依次求值相加。',
	  analysis:'log₂' + Math.pow(2,k) + ' = ' + k + '，log₃' + Math.pow(3,m) + ' = ' + m + '，lg' + Math.pow(10,p) + ' = ' + p + '，所以原式 = ' + val + '。' });
  },
  function(){
	var t = pick([
	  {a:'2^0.3',b:'2^0.5',c:'0.5^0.3',ans:'0.5^0.3 < 2^0.3 < 2^0.5'},
	  {a:'3^0.2',b:'3^0.4',c:'0.4^0.2',ans:'0.4^0.2 < 3^0.2 < 3^0.4'},
	  {a:'0.5^0.3',b:'0.5^0.5',c:'2^0.3',ans:'0.5^0.5 < 0.5^0.3 < 2^0.3'}
	]);
	return mcq({ point:'指数函数',
	  stem:'比较下列三个数的大小：a = ' + t.a + '，b = ' + t.b + '，c = ' + t.c + '，则（　　）',
	  correct: t.ans,
	  wrongs:['a < b < c','b < a < c','c < a < b','a < c < b'].filter(function(x){return x!==t.ans;}),
	  hint:'提示：同底数幂比较大小看指数函数的单调性；底数不同、指数相同时，可以利用"中间量 1"来比较。',
	  analysis:'正确大小顺序：' + t.ans + '。' });
  },
  function(){
	var pool = [1,2,3,4,5,6,7,8,9];
	var A = shuffle(pool.slice()).slice(0,4).sort(function(x,y){return x-y;});
	var shared = shuffle(A.slice()).slice(0,2).sort(function(x,y){return x-y;});
	var rest = shuffle(pool.filter(function(x){return A.indexOf(x)<0;})).slice(0,2);
	var B = shuffle(shared.concat(rest)).sort(function(x,y){return x-y;});
	var inter = A.filter(function(x){return B.indexOf(x)>=0;}).sort(function(x,y){return x-y;});
	var uni = A.concat(B).filter(function(v,i,arr){return arr.indexOf(v)===i;}).sort(function(x,y){return x-y;});
	var diff = A.filter(function(x){return B.indexOf(x)<0;});
	function fmt(s){ return '{' + s.join('，') + '}'; }
	return mcq({ point:'集合运算',
	  stem:'已知集合 A = ' + fmt(A) + '，B = ' + fmt(B) + '，则 A ∩ B = （　　）',
	  correct: fmt(inter),
	  wrongs:[fmt(A), fmt(B), fmt(uni), fmt(diff)],
	  hint:'提示：交集 A ∩ B 指"既属于 A 又属于 B"的元素组成的集合，即两个集合的公共元素。',
	  analysis:'A 与 B 的公共元素是 ' + inter.join('、') + '，所以 A ∩ B = ' + fmt(inter) + '。' });
  },
  function(){
	var U = [1,2,3,4,5,6,7,8];
	var A = shuffle(U.slice()).slice(0,4).sort(function(x,y){return x-y;});
	var comp = U.filter(function(x){return A.indexOf(x)<0;}).sort(function(x,y){return x-y;});
	function fmt(s){ return '{' + s.join('，') + '}'; }
	return mcq({ point:'集合运算',
	  stem:'设全集 U = ' + fmt(U) + '，集合 A = ' + fmt(A) + '，则 ∁ᵤA = （　　）',
	  correct: fmt(comp),
	  wrongs:[fmt(A), fmt(U), fmt(U.slice(0,4)), fmt(U.slice(4))],
	  hint:'提示：补集 ∁ᵤA 是指在全集 U 中但不在集合 A 中的所有元素组成的集合。',
	  analysis:'U 中除去 A 的元素，剩下的就是 ∁ᵤA = ' + fmt(comp) + '。' });
  },
  function(){
	var p = rnd(1,5), q = p + rnd(1,5);
	var b = p + q, c = p * q;
	return mcq({ point:'一元二次不等式',
	  stem:'不等式 x² − ' + b + 'x + ' + c + ' > 0 的解集是（　　）',
	  correct:'{x | x < ' + p + ' 或 x > ' + q + '}',
	  wrongs:['{x | ' + p + ' < x < ' + q + '}', '{x | x < ' + q + ' 或 x > ' + p + '}', '{x | x > ' + p + '}', '{x | x < ' + p + '}'],
	  hint:'提示：先把左边因式分解成 (x − p)(x − q) > 0 的形式，再按口诀"大于取两边，小于取中间"写解集。',
	  analysis:'x² − ' + b + 'x + ' + c + ' = (x − ' + p + ')(x − ' + q + ') > 0，故 x < ' + p + ' 或 x > ' + q + '。' });
  },
  function(){
	var p = rnd(1,4), q = p + rnd(1,4);
	return mcq({ point:'分式不等式',
	  stem:'不等式 (x − ' + p + ')/(x − ' + q + ') < 0 的解集是（　　）',
	  correct:'{x | ' + p + ' < x < ' + q + '}',
	  wrongs:['{x | x < ' + p + ' 或 x > ' + q + '}', '{x | x < ' + q + '}', '{x | x > ' + p + '}', '{x | x ≠ ' + q + '}'],
	  hint:'提示：分式不等式 (x−p)/(x−q) < 0 等价于 (x−p)(x−q) < 0，再按"小于取中间"写解集，注意分母不能为 0。',
	  analysis:'原式等价于 (x − ' + p + ')(x − ' + q + ') < 0，解得 ' + p + ' < x < ' + q + '。' });
  },
  function(){
	var a = rnd(2,6);
	return mcq({ point:'绝对值不等式',
	  stem:'不等式 |x − ' + a + '| < 3 的解集是（　　）',
	  correct:'{x | ' + (a-3) + ' < x < ' + (a+3) + '}',
	  wrongs:['{x | x < ' + (a+3) + '}', '{x | x > ' + (a-3) + '}', '{x | ' + (a-3) + ' ≤ x ≤ ' + (a+3) + '}', '{x | x < ' + (a-3) + ' 或 x > ' + (a+3) + '}'],
	  hint:'提示：|x − a| < b 等价于 −b < x − a < b，再解这个双边不等式即可。',
	  analysis:'−3 < x − ' + a + ' < 3，各边加 ' + a + ' 得 ' + (a-3) + ' < x < ' + (a+3) + '。' });
  },
  function(){
	var a = rnd(-4,4), b = rnd(-4,4), c = rnd(-4,4), d = rnd(-4,4);
	var re = a + c, im = b + d;
	return mcq({ point:'复数运算',
	  stem:'已知复数 z₁ = ' + a + (b>=0?' + ':' − ') + Math.abs(b) + 'i，z₂ = ' + c + (d>=0?' + ':' − ') + Math.abs(d) + 'i，则 z₁ + z₂ = （　　）',
	  correct: re + (im>=0?' + ':' − ') + Math.abs(im) + 'i',
	  wrongs:[(a+c) + (b-d>=0?' + ':' − ') + Math.abs(b-d) + 'i', (a-c) + (b+d>=0?' + ':' − ') + Math.abs(b+d) + 'i',
			  (a*c-b*d) + ' + ' + (a*d+b*c) + 'i', re + (im+1>=0?' + ':' − ') + Math.abs(im+1) + 'i'],
	  hint:'提示：复数加减法就是把实部与实部相加减，虚部与虚部相加减，即 (a+bi) + (c+di) = (a+c) + (b+d)i。',
	  analysis:'z₁ + z₂ = (' + a + ' + ' + c + ') + (' + b + ' + ' + d + ')i = ' + re + (im>=0?' + ':' − ') + Math.abs(im) + 'i。' });
  },
  function(){
	var a = rnd(-4,4), b = rnd(1,5);
	return mcq({ point:'共轭复数',
	  stem:'已知复数 z = ' + a + ' + ' + b + 'i，则 z 的共轭复数 z̄ = （　　）',
	  correct: a + ' − ' + b + 'i',
	  wrongs:[a + ' + ' + b + 'i', '−' + a + ' + ' + b + 'i', '−' + a + ' − ' + b + 'i', a + ' + ' + (b+1) + 'i'],
	  hint:'提示：共轭复数就是把虚部的符号改变，实部不变，即 a + bi 的共轭复数是 a − bi。',
	  analysis:'z̄ = ' + a + ' − ' + b + 'i。' });
  },
  function(){
	var t = pick([[3,4,5],[5,12,13],[6,8,10],[8,15,17],[9,12,15],[7,24,25]]);
	var a = t[0], b = t[1], r = t[2];
	if(Math.random()<0.5) b = -b;
	if(Math.random()<0.5) a = -a;
	return mcq({ point:'复数的模',
	  stem:'已知复数 z = ' + a + (b>=0?' + ':' − ') + Math.abs(b) + 'i，则 |z| = （　　）',
	  correct: r, wrongs:[r+1, r-2, Math.abs(a)+Math.abs(b), t[0]+t[1]],
	  hint:'提示：复数 z = a + bi 的模 |z| = √(a² + b²)。注意 i² = −1，但求模时只用实部和虚部的平方和。',
	  analysis:'|z| = √(' + a + '² + (' + b + ')²) = √(' + (a*a) + ' + ' + (b*b) + ') = ' + r + '。' });
  },
  function(){
	var x1 = rnd(-4,4), y1 = rnd(-4,4), x2 = rnd(-4,4), y2 = rnd(-4,4);
	var dot = x1*x2 + y1*y2;
	return mcq({ point:'平面向量',
	  stem:'已知向量 a = (' + x1 + '，' + y1 + ')，b = (' + x2 + '，' + y2 + ')，则 a·b = （　　）',
	  correct: dot, wrongs:[dot+2, dot-3, x1*y1 + x2*y2, x1*x2 - y1*y2],
	  hint:'提示：向量的数量积（内积）等于对应坐标乘积之和：a·b = x₁x₂ + y₁y₂。',
	  analysis:'a·b = ' + x1 + '×(' + x2 + ') + ' + y1 + '×(' + y2 + ') = ' + dot + '。' });
  },
  function(){
	var t = pick([
	  {x1:1,y1:2,x2:2,y2:-1,ans:'垂直',w:['平行','重合','夹角为 30°']},
	  {x1:2,y1:3,x2:4,y2:6,ans:'平行',w:['垂直','重合','夹角为 60°']},
	  {x1:-1,y1:2,x2:3,y2:4,ans:'既不平行也不垂直',w:['平行','垂直','重合']},
	  {x1:1,y1:1,x2:1,y2:-1,ans:'垂直',w:['平行','重合','夹角为 45°']}
	]);
	return mcq({ point:'向量平行与垂直',
	  stem:'已知向量 a = (' + t.x1 + '，' + t.y1 + ')，b = (' + t.x2 + '，' + t.y2 + ')，则 a 与 b 的关系是（　　）',
	  correct: t.ans, wrongs: t.w,
	  hint:'提示：a⊥b ⇔ a·b = 0；a∥b ⇔ x₁y₂ − x₂y₁ = 0。先算数量积，再算行列式，判断属于哪种关系。',
	  analysis:'a·b = ' + (t.x1*t.x2 + t.y1*t.y2) + '，x₁y₂ − x₂y₁ = ' + (t.x1*t.y2 - t.x2*t.y1) + '，所以 a 与 b ' + t.ans + '。' });
  },
  function(){
	var x1 = rnd(1,4), y1 = rnd(1,5), x2 = rnd(5,8), y2 = rnd(1,5);
	var dy = y2 - y1, dx = x2 - x1;
	var g = (function(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=b; b=a%b; a=t; } return a; })(dy,dx);
	var ns = dy/g, ds = dx/g;
	if(ds<0){ ns=-ns; ds=-ds; }
	var ans = ds===1 ? String(ns) : ns + '/' + ds;
	return mcq({ point:'直线的斜率',
	  stem:'已知直线 l 经过点 A(' + x1 + '，' + y1 + ') 和 B(' + x2 + '，' + y2 + ')，则直线 l 的斜率 k = （　　）',
	  correct: ans, wrongs:[dx/dy, -ns + '/' + ds, (ns+1) + '/' + ds, ns + '/' + (ds+1)],
	  hint:'提示：经过两点 P₁(x₁,y₁)、P₂(x₂,y₂) 的直线斜率 k = (y₂ − y₁)/(x₂ − x₁)。注意分母是横坐标之差，不能颠倒。',
	  analysis:'k = (y₂ − y₁)/(x₂ − x₁) = (' + y2 + ' − ' + y1 + ')/(' + x2 + ' − ' + x1 + ') = ' + ans + '。' });
  },
  function(){
	var a = rnd(1,5), b = rnd(1,5), c = rnd(1,8);
	return mcq({ point:'直线方程',
	  stem:'直线 ' + a + 'x + ' + b + 'y − ' + c + ' = 0 的斜率为（　　）',
	  correct:'−' + a + '/' + b,
	  wrongs:[a + '/' + b, '−' + b + '/' + a, b + '/' + a, String(a)],
	  hint:'提示：直线一般式 Ax + By + C = 0 的斜率 k = −A/B（B ≠ 0）。注意分子分母的位置。',
	  analysis:'由 ' + a + 'x + ' + b + 'y − ' + c + ' = 0 得 y = (−' + a + '/' + b + ')x + ' + c + '/' + b + '，斜率 k = −' + a + '/' + b + '。' });
  },
  function(){
	var p = rnd(1,3) * pick([1,-1]);
	var q = rnd(1,3) * pick([1,-1]);
	var r = rnd(2,5);
	while(r*r > p*p + q*q) r = rnd(2,5);
	var D = 2*p, E = 2*q;
	var F = p*p + q*q - r*r;
	function ft(c, v){ if(c===0) return ''; var a=Math.abs(c); return (c>0?' + ':' − ') + (a===1?'':a) + v; }
	var eq = 'x² + y²' + ft(D,'x') + ft(E,'y') + ft(F,'') + ' = 0';
	return mcq({ point:'圆的方程',
	  stem:'圆 ' + eq + ' 的半径是（　　）',
	  correct: r, wrongs:[r+1, r-1, r+2, Math.abs(p)+Math.abs(q), p*p+q*q],
	  hint:'提示：将一般方程 x² + y² + Dx + Ey + F = 0 配方，化为标准方程 (x − h)² + (y − k)² = r²，其中 h = −D/2，k = −E/2，半径 r = √(h² + k² − F)。',
	  analysis:'配方得 (x ' + (p>0?'− '+p:'+ '+Math.abs(p)) + ')² + (y ' + (q>0?'− '+q:'+ '+Math.abs(q)) + ')² = ' + (r*r) + '，所以半径 r = ' + r + '。' });
  },
  function(){
	var t = pick([
	  {a:5,b:4,e:'3/5'},{a:5,b:3,e:'4/5'},{a:4,b:3,e:'√7/4'},{a:3,b:2,e:'√5/3'}
	]);
	return mcq({ point:'椭圆离心率',
	  stem:'椭圆 x²/' + (t.a*t.a) + ' + y²/' + (t.b*t.b) + ' = 1 的离心率是（　　）',
	  correct: t.e,
	  wrongs:[t.a + '/' + t.b, t.b + '/' + t.a, '1/' + t.a, t.b + '/' + (t.a+1)],
	  hint:'提示：椭圆离心率 e = c/a，其中 c² = a² − b²（a > b > 0）。先由方程读出 a²、b²，再求 c，最后算 e。',
	  analysis:'a² = ' + (t.a*t.a) + '，b² = ' + (t.b*t.b) + '，c² = a² − b² = ' + (t.a*t.a - t.b*t.b) + '，所以 e = c/a = ' + t.e + '。' });
  },
  function(){
	var t = pick([{a:3,b:4,e:'5/3'},{a:4,b:3,e:'5/4'},{a:5,b:12,e:'13/5'}]);
	return mcq({ point:'双曲线离心率',
	  stem:'双曲线 x²/' + (t.a*t.a) + ' − y²/' + (t.b*t.b) + ' = 1 的离心率是（　　）',
	  correct: t.e,
	  wrongs:[t.a + '/' + t.b, t.b + '/' + t.a, (t.a+1) + '/' + t.b, '1/' + t.a],
	  hint:'提示：双曲线离心率 e = c/a，其中 c² = a² + b²。与椭圆不同，这里是"加号"。',
	  analysis:'a² = ' + (t.a*t.a) + '，b² = ' + (t.b*t.b) + '，c² = a² + b² = ' + (t.a*t.a + t.b*t.b) + '，所以 e = c/a = ' + t.e + '。' });
  },
  function(){
	function C(n,k){ if(k<0||k>n) return 0; k=Math.min(k,n-k); var r=1; for(var i=1;i<=k;i++) r=r*(n-k+i)/i; return Math.round(r); }
	var n = rnd(5,8), k = rnd(2,3);
	while(k >= n) k = rnd(2,3);
	var ans = C(n,k);
	return mcq({ point:'排列组合',
	  stem:'从 ' + n + ' 名同学中选出 ' + k + ' 名参加一项活动，不同的选法共有（　　）',
	  correct: ans, wrongs:[ans+2, ans-1, ans*2, n*k],
	  hint:'提示：只选不排（选出来的人没有顺序区别），用组合数公式 C(n,k) = n! ÷ [k!(n−k)!]。',
	  analysis:'C(' + n + '，' + k + ') = ' + ans + '（种）。' });
  },
  function(){
	var n = rnd(4,6), k = rnd(1,2);
	function C(n,k){ if(k<0||k>n) return 0; k=Math.min(k,n-k); var r=1; for(var i=1;i<=k;i++) r=r*(n-k+i)/i; return Math.round(r); }
	return mcq({ point:'二项式定理',
	  stem:'在 (x + 2)ⁿ 的展开式中，若 n = ' + n + '，则 x^' + (n-k) + ' 的系数是（　　）',
	  correct: C(n,k) * Math.pow(2, k),
	  wrongs:[C(n,k), C(n,k)*Math.pow(2,k+1), C(n,k+1), n*Math.pow(2,k)],
	  hint:'提示：二项展开式通项 T_{r+1} = C(n,r)·x^{n−r}·a^r。先根据 x 的次数确定 r，再算组合数与 a^r 的乘积。',
	  analysis:'T_{r+1} = C(' + n + '，' + k + ')·x^' + (n-k) + '·2^' + k + ' = ' + (C(n,k)*Math.pow(2,k)) + '·x^' + (n-k) + '，所以系数为 ' + (C(n,k)*Math.pow(2,k)) + '。' });
  },
  function(){
	var odd = [{s:'f(x) = x³'},{s:'f(x) = x³ + x'},{s:'f(x) = x³ − x'},{s:'f(x) = 2x'},{s:'f(x) = 5x³'}];
	var even = [{s:'f(x) = x² + 1'},{s:'f(x) = x⁴ − x²'},{s:'f(x) = |x|'},{s:'f(x) = 3x²'},{s:'f(x) = x²'}];
	var neither = [{s:'f(x) = x + 1'},{s:'f(x) = x² + x'},{s:'f(x) = 2x + 1'},{s:'f(x) = x³ + 1'}];
	var askOdd = Math.random() < 0.5;
	var correct, wrongs, ask;
	if(askOdd){ correct = pick(odd); wrongs = shuffle(even.concat(neither)).slice(0,3).map(function(x){return x.s;}); ask = '奇函数'; }
	else { correct = pick(even); wrongs = shuffle(odd.concat(neither)).slice(0,3).map(function(x){return x.s;}); ask = '偶函数'; }
	return mcq({ point:'函数奇偶性',
	  stem:'下列函数中，是' + ask + '的是（　　）',
	  correct: correct.s, wrongs: wrongs,
	  hint: ask === '奇函数'
		? '提示：奇函数满足 f(−x) = −f(x)，图象关于原点对称。把 −x 代入函数式，看能否提出负号。'
		: '提示：偶函数满足 f(−x) = f(x)，图象关于 y 轴对称。把 −x 代入函数式，看是否与原来相同。',
	  analysis:'选项 ' + correct.s + ' 满足 ' + (ask==='奇函数'?'f(−x) = −f(x)':'f(−x) = f(x)') + '，是' + ask + '。' });
  },
  function(){
	var a = rnd(2,5);
	return mcq({ point:'指数函数',
	  stem:'函数 y = ' + a + 'ˣ 的定义域和值域分别是（　　）',
	  correct:'R，(0，+∞)',
	  wrongs:['R，R','(0，+∞)，R','[0，+∞)，(0，+∞)','R，[0，+∞)'],
	  hint:'提示：指数函数 y = aˣ（a > 0 且 a ≠ 1）的自变量 x 可以取任意实数，函数值永远为正数。',
	  analysis:'y = ' + a + 'ˣ 的定义域为 R，值域为 (0，+∞)。' });
  },
  function(){
	var a = rnd(1,5);
	return mcq({ point:'对数函数',
	  stem:'函数 y = lg(x − ' + a + ') 的定义域是（　　）',
	  correct:'(' + a + '，+∞)',
	  wrongs:['[' + a + '，+∞)','R','(−∞，' + a + ')','(0，+∞)'],
	  hint:'提示：对数函数的真数必须大于 0，即 x − a > 0，解这个不等式即可。',
	  analysis:'由 x − ' + a + ' > 0 得 x > ' + a + '，所以定义域为 (' + a + '，+∞)。' });
  },
  function(){
	function f(x){ if(x <= 0) return x + 4; return x*x - 1; }
	var f1 = f(-3), f2 = f(f1);
	return mcq({ point:'分段函数',
	  stem:'已知函数 f(x) = { x + 4，x ≤ 0；x² − 1，x > 0 }，则 f(f(−3)) = （　　）',
	  correct: f2, wrongs:[f1, f2+2, f2-2, -12],
	  hint:'提示：分段函数求值要从内到外：先看内层自变量 −3 落在哪一段，代入求出内层值；再把结果作为新自变量，重新判断落在哪一段，再代入。',
	  analysis:'因为 −3 ≤ 0，所以 f(−3) = −3 + 4 = 1；因为 1 > 0，所以 f(1) = 1² − 1 = 0。' });
  },
  function(){
	var base = rnd(1,6), d = rnd(1,3);
	var arr = [base, base+d, base+2*d, base+3*d, base+4*d];
	var mean = base + 2*d, varr = 2*d*d;
	return mcq({ point:'统计初步',
	  stem:'已知一组数据：' + arr.join('，') + '，则这组数据的方差是（　　）',
	  correct: varr, wrongs:[varr+d, varr-d, varr+2, d*d],
	  hint:'提示：先求平均数 x̄，再用方差公式 s² = [(x₁−x̄)² + … + (xₙ−x̄)²] ÷ n 计算。',
	  analysis:'平均数 x̄ = ' + mean + '，平方和为 ' + (arr.reduce(function(s,v){return s+(v-mean)*(v-mean);},0)) + '，所以方差 s² = ' + varr + '。' });
  },
  function(){
	var t = pick([
	  {p:'x > 3', q:'x > 1', ans:'充分不必要条件'},
	  {p:'x > 1', q:'x > 3', ans:'必要不充分条件'},
	  {p:'x > 2', q:'x > 2', ans:'充要条件'},
	  {p:'x > 2', q:'x < 0', ans:'既不充分也不必要条件'},
	  {p:'x = 1', q:'x² = 1', ans:'充分不必要条件'},
	  {p:'x² = 1', q:'x = 1', ans:'必要不充分条件'}
	]);
	return mcq({ point:'充分必要条件',
	  stem:'设 p：' + t.p + '，q：' + t.q + '，则 p 是 q 的（　　）',
	  correct: t.ans,
	  wrongs:['充分不必要条件','必要不充分条件','充要条件','既不充分也不必要条件'].filter(function(x){return x!==t.ans;}),
	  hint:'提示：判断"p 是 q 的什么条件"，先看 p ⇒ q 是否成立（充分性），再看 q ⇒ p 是否成立（必要性）。可以用数轴或集合包含关系来判断。',
	  analysis:'p 对应集合与 q 对应集合的关系决定：p 是 q 的' + t.ans + '。' });
  },
  function(){
	var t = pick([
	  {f:'y = 2x + 1', ans:'R 上单调递增', w:['R 上单调递减','(0，+∞) 上递增','(−∞，0) 上递减']},
	  {f:'y = −3x + 2', ans:'R 上单调递减', w:['R 上单调递增','(0，+∞) 上递减','(−∞，0) 上递增']},
	  {f:'y = x²', ans:'(0，+∞) 上单调递增', w:['R 上单调递增','R 上单调递减','(0，+∞) 上单调递减']},
	  {f:'y = −x²', ans:'(0，+∞) 上单调递减', w:['R 上单调递增','R 上单调递减','(0，+∞) 上单调递增']}
	]);
	return mcq({ point:'函数单调性',
	  stem:'关于函数 ' + t.f + ' 的单调性，下列说法正确的是（　　）',
	  correct: t.ans, wrongs: t.w,
	  hint:'提示：一次函数 y = kx + b 的单调性由 k 的正负决定；二次函数 y = ax² 的单调性分对称轴两侧讨论。',
	  analysis:t.f + ' 的单调性：' + t.ans + '。' });
  },
  function(){
	var a = rnd(2,4);
	return mcq({ point:'对数运算',
	  stem:'计算 log' + a + '1 + log' + a + a + ' = （　　）',
	  correct: 1, wrongs:[a, a+1, 0, 2],
	  hint:'提示：log_a 1 = 0，log_a a = 1。记住这两个特殊值，很多对数题都能化简。',
	  analysis:'log' + a + '1 = 0，log' + a + a + ' = 1，所以原式 = 0 + 1 = 1。' });
  }
];

/* ============================================================
   语文题库
============================================================ */
var CN_CHOICE = [
  { point:'字音辨析',
	stem:'下列词语中，加点字的读音全都正确的一项是（　　）',
	options:['慰藉（jiè）　栖息（qī）　锲而不舍（qiè）',
			 '慰藉（jí）　栖息（xī）　锲而不舍（qì）',
			 '慰藉（jiè）　栖息（xī）　锲而不舍（qì）',
			 '慰藉（jí）　栖息（qī）　锲而不舍（qiè）'],
	ans:0,
	hint:'提示："慰藉"的"藉"读 jiè（安慰）；"栖息"的"栖"读 qī；"锲而不舍"的"锲"读 qiè（雕刻）。',
	analysis:'A 项读音全部正确。B、C、D 三项中"藉""栖""锲"至少有一个读音错误。' },
  { point:'字形辨析',
	stem:'下列词语中，没有错别字的一项是（　　）',
	options:['迫不及待','一愁莫展','变本加利','谈笑风声'], ans:0,
	hint:'提示：逐个回忆词语的规范写法。重点辨析"筹/愁""厉/利""生/声"这几组易混字。',
	analysis:'B 应为"一筹莫展"；C 应为"变本加厉"；D 应为"谈笑风生"。只有 A 项书写正确。' },
  { point:'词语辨析',
	stem:'依次填入下列横线处的词语，最恰当的一项是（　　）\n① 经过三年的努力，他终于____了自己的梦想。\n② 学校____了一系列活动来丰富同学们的课余生活。\n③ 他的建议非常____，值得我们认真考虑。',
	options:['实现　开展　合理','完成　举行　合适','实现　举行　合适','完成　开展　合理'], ans:0,
	hint:'提示："实现梦想"是固定搭配；"开展活动"强调铺开、推进；"合理"侧重合乎道理，"合适"侧重符合实际情况。',
	analysis:'①"实现梦想"；②"开展活动"；③"建议合理"。故选 A。' },
  { point:'成语运用',
	stem:'下列句子中，成语使用恰当的一项是（　　）',
	options:['他的演讲深入浅出，令人叹为观止。','面对困难，他首当其冲，第一个退缩了。','同学们在操场上龙飞凤舞地跑步。','这本书写得差强人意，大家都非常失望。'], ans:0,
	hint:'提示：注意成语的适用对象和感情色彩。"首当其冲"指最先受到冲击；"差强人意"指大体上还能使人满意，是褒义。',
	analysis:'A 项"叹为观止"使用恰当。B 项"首当其冲"指最先受到攻击或遭遇灾难。C 项"龙飞凤舞"形容书法笔势舒展活泼。D 项"差强人意"意为大体令人满意，与"失望"矛盾。' },
  { point:'成语运用',
	stem:'下列句子中，成语使用不恰当的一项是（　　）',
	options:['他做事总是小心翼翼，从不马虎。','同学们在操场上鳞次栉比地跑步。','他的字写得龙飞凤舞，非常工整。','这次考试他考得很差，真是差强人意。'], ans:1,
	hint:'提示：注意成语的适用对象。"鳞次栉比"形容房屋等排列密集；"龙飞凤舞"形容书法笔势舒展，不是工整。',
	analysis:'B 项"鳞次栉比"多形容房屋等建筑排列密集，不能形容跑步。故选 B。' },
  { point:'病句辨析',
	stem:'下列句子中，没有语病的一项是（　　）',
	options:['通过这次社会实践活动，使我明白了团结的重要性。','能否取得优异成绩，关键在于平时是否努力。','他大约二十岁左右就参加了工作。','我们要防止交通事故不再发生。'], ans:1,
	hint:'提示：常见语病有四类——成分残缺、两面对一面、语义重复、否定不当。',
	analysis:'A 项滥用介词"通过"导致主语残缺；C 项"大约"与"左右"语义重复；D 项"防止……不再发生"否定不当。故选 B。' },
  { point:'病句辨析',
	stem:'下列句子中，没有语病的一项是（　　）',
	options:['通过这次活动，使我受益匪浅。','我们要防止交通事故不再发生。','他的写作水平明显改进了。','这本书的内容非常丰富，值得一读。'], ans:3,
	hint:'提示：注意"水平"常与"提高"搭配，而不是"改进"；"通过……使……"是典型的缺主语句式。',
	analysis:'A 项"通过……使……"导致主语残缺；B 项否定不当；C 项"水平"应搭配"提高"。故选 D。' },
  { point:'标点符号',
	stem:'下列句子中，标点符号使用正确的一项是（　　）',
	options:['他问我："你什么时候回来？"','他问我："你什么时候回来"？','他问我："你什么时候回来？"。','他问我，"你什么时候回来？"'], ans:0,
	hint:'提示：完整引用别人的话，句末标点应放在引号内；引号内如果是问句，问号要放在引号内，句号不能重复。',
	analysis:'A 项问号在引号内，使用正确。B 项问号应在引号内。C 项问号后不能再加句号。D 项提示语后用冒号，不用逗号。' },
  { point:'语句衔接',
	stem:'填入下面横线处的句子，与上下文衔接最恰当的一项是（　　）\n读书是一种乐趣。____，____，____。一本好书，能让人沉浸其中，忘记时间的流逝。',
	options:['它像一把钥匙　打开知识的大门　让人在智慧的海洋中遨游',
			 '它像一把钥匙　让人在智慧的海洋中遨游　打开知识的大门',
			 '打开知识的大门　它像一把钥匙　让人在智慧的海洋中遨游',
			 '让人在智慧的海洋中遨游　它像一把钥匙　打开知识的大门'], ans:0,
	hint:'提示：先看比喻句的本体与喻体是否对应，再看三个分句之间的逻辑顺序——一般是"先形象比喻，再具体作用，最后递进升华"。',
	analysis:'"它像一把钥匙"承接前文"读书是一种乐趣"作比喻，"打开知识的大门"承接"钥匙"，"让人在智慧的海洋中遨游"进一步升华。故选 A。' },
  { point:'文学常识',
	stem:'下列关于文学常识的表述，正确的一项是（　　）',
	options:['《红楼梦》的作者是罗贯中。','《诗经》是我国第一部诗歌总集，分为风、雅、颂三部分。','鲁迅原名周作人，是我国现代伟大的文学家。','《巴黎圣母院》的作者是俄国作家列夫·托尔斯泰。'], ans:1,
	hint:'提示：回忆课本中的作家作品常识，特别留意作家姓名、国籍、朝代这三类容易混淆的信息。',
	analysis:'A 项《红楼梦》作者是曹雪芹；C 项鲁迅原名周树人；D 项《巴黎圣母院》作者是法国作家雨果。故选 B。' },
  { point:'文学常识',
	stem:'下列作品与作者对应正确的一项是（　　）',
	options:['《雷雨》——老舍','《骆驼祥子》——曹禺','《茶馆》——老舍','《背影》——鲁迅'], ans:2,
	hint:'提示：回忆课本中出现过的现代作家作品。《雷雨》是话剧，《骆驼祥子》是小说，《背影》是散文。',
	analysis:'A 项《雷雨》作者是曹禺；B 项《骆驼祥子》作者是老舍；D 项《背影》作者是朱自清。故选 C。' },
  { point:'文化常识',
	stem:'下列关于古代文化常识的表述，不正确的一项是（　　）',
	options:['"四书"指《大学》《中庸》《论语》《孟子》。','"五经"指《诗》《书》《礼》《易》《春秋》。','"六艺"指礼、乐、射、御、书、数。','"三皇五帝"中的"三皇"指尧、舜、禹。'], ans:3,
	hint:'提示：回忆课内涉及的文化常识。"三皇"通常指伏羲、神农、黄帝；"五帝"一般指黄帝、颛顼、帝喾、尧、舜。',
	analysis:'D 项表述有误。"三皇"通常指伏羲、神农、黄帝，尧、舜、禹是"五帝"中的后三位。故选 D。' },
  { point:'修辞手法',
	stem:'下列句子中，没有使用比喻修辞的一项是（　　）',
	options:['月亮像一个大圆盘。','他的性格像他父亲。','那一朵朵荷花，像亭亭玉立的少女。','春雨像牛毛，像细丝。'], ans:1,
	hint:'提示：比喻要求本体和喻体是本质不同的两类事物，且二者有相似点。如果本体和喻体是同类事物，只是比较，就不是比喻。',
	analysis:'B 项"他的性格"与"他父亲"是同类事物之间的比较，不构成比喻。A、C、D 三项都是比喻。故选 B。' },
  { point:'修辞手法',
	stem:'"墙上芦苇，头重脚轻根底浅；山间竹笋，嘴尖皮厚腹中空"这副对联使用的主要修辞手法是（　　）',
	options:['对偶、拟人','比喻、夸张','对偶、比喻','排比、反问'], ans:2,
	hint:'提示：上下两句字数相等、结构相同，是对偶；用"芦苇""竹笋"来讽刺某种人，是比喻（借物喻人）。',
	analysis:'上下两句字数相等、结构对称，使用了对偶；同时以"芦苇""竹笋"喻人，使用了比喻。故选 C。' },
  { point:'文言实词',
	stem:'下列句子中，对加点词的解释不正确的一项是（　　）',
	options:['温故而知新（故：旧的，指学过的知识）','学而不思则罔（罔：迷惑）','三人行，必有我师焉（焉：怎么）','择其善者而从之（从：跟从，学习）'], ans:2,
	hint:'提示：结合课内文言文《〈论语〉十二章》的语境理解词义。注意"焉"在句末常作兼词，相当于"于此"。',
	analysis:'C 项"焉"是兼词，相当于"于此、在其中"，不是"怎么"。故选 C。' },
  { point:'文言虚词',
	stem:'下列句子中，"之"的用法与其他三项不同的一项是（　　）',
	options:['学而时习之','知之者不如好之者','择其善者而从之','予独爱莲之出淤泥而不染'], ans:3,
	hint:'提示：注意区分"之"作代词和作结构助词（取消句子独立性）两种用法。',
	analysis:'A、B、C 三项中的"之"都是代词，指代前文内容；D 项中的"之"用于主谓之间，取消句子独立性。故选 D。' },
  { point:'文言翻译',
	stem:'对"三人行，必有我师焉"翻译最恰当的一项是（　　）',
	options:['三个人一起走，一定有我的老师在里面。','几个人同行，其中必定有可以做我老师的人。','三个人行走，必须要有我的老师。','三个人走路，一定有我的老师在旁边。'], ans:1,
	hint:'提示："三"在文言中常表示"多"而非确数"三"；"师"是"老师"；"焉"是兼词，"在其中"的意思。',
	analysis:'"三人"应译为"几个人"，"师"译为"老师"，"焉"译为"在其中"。B 项翻译最准确。故选 B。' },
  { point:'诗歌鉴赏',
	stem:'对"海内存知己，天涯若比邻"这两句诗赏析不恰当的一项是（　　）',
	options:['这两句诗一改送别诗的伤感基调，格调高昂。','"天涯"与"比邻"形成对比，突出友情的力量。','诗人用夸张的手法，表达了对友人的深厚情谊。','这两句诗流露出诗人对友人离去后孤独生活的担忧。'], ans:3,
	hint:'提示：这首诗是王勃的《送杜少府之任蜀州》，整体情感是乐观豁达的，不是伤感担忧。',
	analysis:'D 项赏析错误。这两句诗表达的是乐观豁达的胸襟，而非对友人离去后孤独生活的担忧。故选 D。' },
  { point:'语言得体',
	stem:'下列句子中，表达得体的一项是（　　）',
	options:['我刚写了一篇文章，请您拜读。','这是我的拙作，请您指正。','您的意见很好，我一定采纳。','明天我一定光临寒舍。'], ans:1,
	hint:'提示：注意谦辞和敬辞的区分。"拜读""光临"是敬辞，用于对方；"拙作""寒舍"是谦辞，用于自己。',
	analysis:'A 项"拜读"是敬辞，用于读别人的作品；D 项"光临"是敬辞，"寒舍"是谦辞，二者混用。故选 B。' }
];

var CN_BLANK = [
  { point:'古诗文默写', stem:'长风破浪会有时，________。（李白《行路难》）', answer:'直挂云帆济沧海',
	hint:'提示：出自李白《行路难（其一）》的结尾两句，表达诗人对未来的坚定信心。',
	analysis:'正确填写：直挂云帆济沧海。' },
  { point:'古诗文默写', stem:'沉舟侧畔千帆过，________。（刘禹锡《酬乐天扬州初逢席上见赠》）', answer:'病树前头万木春',
	hint:'提示：出自刘禹锡的酬答诗，以"沉舟""病树"自比，却写出新事物必将取代旧事物的哲理。',
	analysis:'正确填写：病树前头万木春。' },
  { point:'古诗文默写', stem:'人生自古谁无死？________。（文天祥《过零丁洋》）', answer:'留取丹心照汗青',
	hint:'提示：出自文天祥《过零丁洋》的尾联，"丹心"指赤诚之心，"汗青"指史册。',
	analysis:'正确填写：留取丹心照汗青。' },
  { point:'古诗文默写', stem:'先天下之忧而忧，________。（范仲淹《岳阳楼记》）', answer:'后天下之乐而乐',
	hint:'提示：出自范仲淹《岳阳楼记》的名句，与上句形成对偶，"先"对"后"。',
	analysis:'正确填写：后天下之乐而乐。' },
  { point:'古诗文默写', stem:'野火烧不尽，________。（白居易《赋得古原草送别》）', answer:'春风吹又生',
	hint:'提示：出自白居易咏草名句，上句写毁灭，下句写新生，注意"又"字不能漏。',
	analysis:'正确填写：春风吹又生。' },
  { point:'古诗文默写', stem:'欲穷千里目，________。（王之涣《登鹳雀楼》）', answer:'更上一层楼',
	hint:'提示：出自王之涣《登鹳雀楼》，后两句蕴含着"站得高才能看得远"的哲理。',
	analysis:'正确填写：更上一层楼。' },
  { point:'古诗文默写', stem:'山重水复疑无路，________。（陆游《游山西村》）', answer:'柳暗花明又一村',
	hint:'提示：出自陆游《游山西村》的颔联，常用来比喻在困境中出现转机。',
	analysis:'正确填写：柳暗花明又一村。' },
  { point:'古诗文默写', stem:'________，天涯若比邻。（王勃《送杜少府之任蜀州》）', answer:'海内存知己',
	hint:'提示：出自王勃《送杜少府之任蜀州》的颈联，上句写空间之近，下句写情谊之深。',
	analysis:'正确填写：海内存知己。' },
  { point:'古诗文默写', stem:'落红不是无情物，________。（龚自珍《己亥杂诗》）', answer:'化作春泥更护花',
	hint:'提示：出自龚自珍《己亥杂诗》的尾联，借落花自喻，表达继续为国效力的情怀。',
	analysis:'正确填写：化作春泥更护花。' },
  { point:'古诗文默写', stem:'________，西北望，射天狼。（苏轼《江城子·密州出猎》）', answer:'会挽雕弓如满月',
	hint:'提示：出自苏轼《江城子·密州出猎》的结尾，表达词人渴望报效朝廷的豪情。',
	analysis:'正确填写：会挽雕弓如满月。' },
  { point:'古诗文默写', stem:'了却君王天下事，________。（辛弃疾《破阵子·为陈同甫赋壮词以寄之》）', answer:'赢得生前身后名',
	hint:'提示：出自辛弃疾《破阵子》的结尾，表达词人建功立业的理想。',
	analysis:'正确填写：赢得生前身后名。' },
  { point:'古诗文默写', stem:'出淤泥而不染，________。（周敦颐《爱莲说》）', answer:'濯清涟而不妖',
	hint:'提示：出自周敦颐《爱莲说》，"濯"是洗涤，"清涟"指清澈的水波。',
	analysis:'正确填写：濯清涟而不妖。' }
];

/* ============================================================
   英语题库
============================================================ */
var EN_CHOICE = [
  { point:'主谓一致', stem:'My brother ____ to school by bike every day.',
	options:['go','goes','going','gone'], ans:1,
	hint:'提示：句中有 every day，说明用一般现在时；主语 my brother 是第三人称单数。',
	analysis:'主语 My brother 为第三人称单数，一般现在时动词加 -es，故用 goes。' },
  { point:'现在完成时', stem:'I ____ in this city since 2010.',
	options:['live','lived','have lived','am living'], ans:2,
	hint:'提示：since + 时间点常与现在完成时连用，表示从过去持续到现在的动作或状态。',
	analysis:'since 2010 表示从过去持续到现在，需用现在完成时 have/has + 过去分词，故用 have lived。' },
  { point:'非谓语动词', stem:'The book ____ by Mo Yan is very popular among young people.',
	options:['writing','written','wrote','writes'], ans:1,
	hint:'提示：book 与 write 之间是被动关系（书是被写的），作定语时要用过去分词。',
	analysis:'book 与 write 为被动关系，作后置定语需用过去分词 written。' },
  { point:'固定句型', stem:'It is important ____ English well if you want a good job.',
	options:['learn','learning','to learn','learned'], ans:2,
	hint:'提示：It is + adj. + to do sth. 是英语中非常常见的句型，it 是形式主语。',
	analysis:'It is + adj. + to do sth. 句型，真正主语是动词不定式 to learn。' },
  { point:'主谓一致', stem:'Neither Tom nor his parents ____ at home now.',
	options:['is','are','was','has'], ans:1,
	hint:'提示：neither...nor... 连接主语时，谓语动词遵循"就近原则"，与最近的那个主语保持一致。',
	analysis:'靠近谓语的是 his parents（复数），故用 are。' },
  { point:'时态与延续性动词', stem:'— How long have you ____ the bike?  — For two years.',
	options:['bought','had','buy','buying'], ans:1,
	hint:'提示：How long 提问的是一段时间，要用延续性动词；buy 是瞬间动词，不能与一段时间连用。',
	analysis:'buy 为瞬间动词，应换成 have 的过去分词 had。' },
  { point:'形容词辨析', stem:'— Let\'s go out for a walk. — Great! The weather is ____ today.',
	options:['terrible','wonderful','awful','bad'], ans:1,
	hint:'提示：看到答语中的 Great!，说明说话人对天气持肯定、赞美的态度。',
	analysis:'由答语 Great! 可知说话人心情愉快，说明天气很好，故用 wonderful。' },
  { point:'情态动词', stem:'You ____ finish it today. There is no hurry.',
	options:['mustn\'t','needn\'t','can\'t','shouldn\'t'], ans:1,
	hint:'提示：后一句"There is no hurry"（不用着急）是关键信息，说明"没有必要"而不是"禁止"。',
	analysis:'There is no hurry 表示"不必着急"，故用 needn\'t。' },
  { point:'定语从句', stem:'The man ____ is standing under the tree is our new teacher.',
	options:['who','which','whom','what'], ans:0,
	hint:'提示：先行词 the man 指人，在从句中作主语，所以要用关系代词 who。',
	analysis:'先行词 the man 指人，关系词在从句中作主语，故用 who。' },
  { point:'定语从句', stem:'This is the factory ____ my father worked ten years ago.',
	options:['which','that','where','when'], ans:2,
	hint:'提示：先行词 the factory 是地点，从句结构完整，缺少地点状语，所以用关系副词 where。',
	analysis:'先行词为地点，从句缺状语，故用关系副词 where。' },
  { point:'状语从句', stem:'____ it was raining heavily, they went on working in the field.',
	options:['Although','Because','If','So'], ans:0,
	hint:'提示：前后分句之间是"让步"关系——虽然下着大雨，他们仍然继续干活。',
	analysis:'前后为让步关系，用 Although 引导让步状语从句，意为"尽管"。' },
  { point:'状语从句', stem:'I will call you ____ I arrive in Beijing.',
	options:['as soon as','as long as','so that','even if'], ans:0,
	hint:'提示：句意是"我一到北京就给你打电话"，表示"一……就……"用 as soon as。',
	analysis:'as soon as 表示"一……就……"，符合句意。' },
  { point:'名词性从句', stem:'____ he said at the meeting surprised all of us.',
	options:['What','That','Which','It'], ans:0,
	hint:'提示：从句缺少宾语（he said 后面没有宾语），需要一个既能引导从句、又能在从句中作宾语的关系词。',
	analysis:'从句 he said 后缺宾语，需用 what 引导主语从句并在从句中作 said 的宾语。' },
  { point:'宾语从句', stem:'Could you tell me ____?',
	options:['where is the post office','where the post office is','where the post office was','where was the post office'], ans:1,
	hint:'提示：宾语从句要用陈述语序（主语在前，谓语在后），不能用疑问语序。',
	analysis:'宾语从句用陈述语序 where the post office is。故选 B。' },
  { point:'虚拟语气', stem:'If I ____ you, I would accept the offer without hesitation.',
	options:['am','was','were','be'], ans:2,
	hint:'提示：这是与现在事实相反的虚拟条件句，if 从句中 be 动词一律用 were。',
	analysis:'与现在事实相反的虚拟条件句，if 从句谓语用过去式，be 动词一律用 were。' },
  { point:'倒装句', stem:'Only when I got to the classroom ____ that I had left my book at home.',
	options:['I realized','did I realize','I did realize','realized I'], ans:1,
	hint:'提示：Only + 状语（从句）置于句首时，主句要用部分倒装，即把助动词提到主语前面。',
	analysis:'Only + 状语从句置于句首，主句用部分倒装，一般过去时借助 did，故用 did I realize。' },
  { point:'情景交际', stem:'— I\'m sorry I\'m late. I missed the bus.  — ____',
	options:['Never mind.','You\'re welcome.','That\'s right.','All right.'], ans:0,
	hint:'提示：对方在为迟到道歉，答语应该是表示"没关系、别在意"。',
	analysis:'对方在道歉，Never mind 意为"没关系"，符合语境。' },
  { point:'情景交际', stem:'— Would you like some coffee?  — ____',
	options:['Yes, please.','Yes, I would.','No, I wouldn\'t.','Here you are.'], ans:0,
	hint:'提示：Would you like...? 的肯定答语常用 Yes, please.；否定答语常用 No, thanks.。',
	analysis:'Would you like...? 的肯定答语是 Yes, please.。故选 A。' },
  { point:'介词搭配', stem:'Our teacher is very strict ____ us but also very kind to us.',
	options:['with','in','at','on'], ans:0,
	hint:'提示：be strict with sb. 表示"对某人严格"，be strict in sth. 表示"对某事严格"。',
	analysis:'be strict with sb. 意为"对某人严格"，为固定搭配。' },
  { point:'动词辨析', stem:'— How much did you ____ for this dictionary?  — About fifty yuan.',
	options:['cost','take','spend','pay'], ans:3,
	hint:'提示：主语是人时用 spend 或 pay；pay 的常用结构是 pay money for sth.。',
	analysis:'主语是人，且结构为 pay money for sth.，故选 pay。' },
  { point:'冠词', stem:'He is ____ honest boy and he is popular among his classmates.',
	options:['a','an','the','/'], ans:1,
	hint:'提示：honest 的 h 不发音，开头音素是元音音素，所以要用不定冠词 an。',
	analysis:'honest 以元音音素开头，用 an。故选 B。' },
  { point:'代词', stem:'The book is not mine. ____ is on the desk over there.',
	options:['My','Mine','Me','I'], ans:1,
	hint:'提示：空格处需要作主语的物主代词，且后面没有名词，所以用名词性物主代词 Mine。',
	analysis:'空格作主语，且后面没有名词，需用名词性物主代词 Mine。' },
  { point:'比较级', stem:'The more you read, ____ you will be.',
	options:['the clever','the cleverer','cleverer','the cleverest'], ans:1,
	hint:'提示："the + 比较级，the + 比较级"表示"越……越……"。',
	analysis:'"the + 比较级，the + 比较级"结构，clever 的比较级是 cleverer。故选 B。' },
  { point:'非谓语动词', stem:'I heard someone ____ in the next room just now.',
	options:['sing','sang','to sing','sung'], ans:0,
	hint:'提示：hear sb. do sth. 表示"听到某人做了某事"（强调动作全过程）。',
	analysis:'hear sb. do sth. 表示听到动作的全过程，用动词原形 sing。故选 A。' },
  { point:'现在完成时', stem:'They ____ already ____ the work.',
	options:['have, finished','has, finished','have, finish','has, finish'], ans:0,
	hint:'提示：already 常与现在完成时连用，结构为 have/has + 过去分词。主语 They 是复数。',
	analysis:'主语 They 是复数，用 have；already 常与现在完成时连用，故用 have already finished。' },
  { point:'被动语态', stem:'The homework ____ by the students yesterday.',
	options:['finished','was finished','is finished','finishes'], ans:1,
	hint:'提示：homework 与 finish 是被动关系，且 yesterday 表示过去，所以用一般过去时的被动语态。',
	analysis:'一般过去时被动语态：was/were + 过去分词。故用 was finished。' },
  { point:'词汇辨析', stem:'— What do you think of the film?  — It\'s ____. I want to see it again.',
	options:['boring','bored','interesting','interested'], ans:2,
	hint:'提示：-ing 形容词通常修饰事物（令人……的），-ed 形容词通常修饰人（感到……的）。',
	analysis:'形容电影"令人感兴趣的"用 interesting。故选 C。' }
];

var EN_BLANK = [
  { point:'非谓语动词', stem:'He is good at ________ (swim).', answer:'swimming',
	hint:'提示：be good at 中的 at 是介词，介词后面要接动名词（v-ing）形式。',
	analysis:'at 是介词，后接动名词。swim 是重读闭音节，双写 m 再加 -ing，即 swimming。' },
  { point:'名词复数', stem:'There are many ________ (leaf) on the ground.', answer:'leaves',
	hint:'提示：many 后面接可数名词复数。以 f / fe 结尾的名词变复数时，一般把 f 变成 v 再加 -es。',
	analysis:'leaf 是以 f 结尾的名词，变复数时把 f 变为 v 再加 -es，即 leaves。' },
  { point:'形容词最高级', stem:'This is the ________ (good) film I have ever seen.', answer:'best',
	hint:'提示：句中有 the 和 I have ever seen，是典型的最高级语境。good 是不规则变化。',
	analysis:'the + 最高级 + 定语从句，good 的最高级是 best。' },
  { point:'被动语态', stem:'English ________ (speak) all over the world.', answer:'is spoken',
	hint:'提示：English 和 speak 是被动关系，且是客观事实，用一般现在时的被动语态。',
	analysis:'一般现在时被动语态结构为 am/is/are + 过去分词，故填 is spoken。' },
  { point:'一般过去时', stem:'He ________ (go) to Beijing last week.', answer:'went',
	hint:'提示：last week 是明确的过去时间状语，谓语动词要用一般过去时。go 是不规则动词。',
	analysis:'last week 表示过去时间，go 的过去式为 went。' },
  { point:'物主代词', stem:'This book is not mine. It is ________ (she).', answer:'hers',
	hint:'提示：空格后没有名词，说明要用名词性物主代词（表示"她的东西"）。',
	analysis:'she 的名词性物主代词是 hers。' },
  { point:'副词', stem:'He sings very ________ (good).', answer:'well',
	hint:'提示：修饰动词 sing 要用副词，而 good 是形容词，只能修饰名词。',
	analysis:'修饰动词 sings 需要副词，good 的副词形式是 well。' },
  { point:'现在完成时', stem:'They ________ (be) to Beijing twice.', answer:'have been',
	hint:'提示：twice 表示"两次"，强调到目前为止的经历，用现在完成时。主语 they 是复数。',
	analysis:'they 是复数，现在完成时用 have + 过去分词，be 的过去分词是 been，故填 have been。' },
  { point:'形容词比较级', stem:'This book is much ________ (interesting) than that one.', answer:'more interesting',
	hint:'提示：than 是比较级的标志词，多音节形容词的比较级在前面加 more。',
	analysis:'interesting 是多音节形容词，比较级加 more，故填 more interesting。' },
  { point:'主将从现', stem:'If it ________ (rain) tomorrow, we will stay at home.', answer:'rains',
	hint:'提示：if 引导的条件状语从句中，主句用一般将来时，从句要用一般现在时表示将来。',
	analysis:'主句 will stay 为一般将来时，if 从句用一般现在时，主语 it 是第三人称单数，故填 rains。' },
  { point:'现在进行时', stem:'Listen! Someone ________ (sing) in the next room.', answer:'is singing',
	hint:'提示：Listen! 是现在进行时的标志词，表示说话时正在进行的动作。someone 作主语视为单数。',
	analysis:'Listen! 提示动作正在进行，用现在进行时。someone 视为第三人称单数，故填 is singing。' },
  { point:'动名词', stem:'She is good at ________ (dance).', answer:'dancing',
	hint:'提示：be good at 中的 at 是介词，后面接动名词形式。',
	analysis:'at 是介词，后接动名词，dance 去 e 加 -ing，即 dancing。' },
  { point:'一般将来时', stem:'They ________ (visit) the museum next Sunday.', answer:'will visit',
	hint:'提示：next Sunday 是将来时间状语，用一般将来时 will + 动词原形。',
	analysis:'next Sunday 表示将来，用 will visit。' },
  { point:'过去进行时', stem:'At eight o\'clock last night, I ________ (watch) TV.', answer:'was watching',
	hint:'提示：At eight o\'clock last night 表示过去某个具体时刻，用过去进行时 was/were + doing。主语 I 用 was。',
	analysis:'主语 I 用 was，watch 的现在分词是 watching，故填 was watching。' },
  { point:'情态动词', stem:'You ________ (not) smoke here. It\'s a hospital.', answer:'mustn\'t',
	hint:'提示：在医院等场所"禁止"吸烟，用 mustn\'t（禁止、不许），语气最强。',
	analysis:'表示"禁止"用 mustn\'t，故填 mustn\'t。' },
  { point:'名词所有格', stem:'This is ________ (Tom) bike.', answer:'Tom\'s',
	hint:'提示：表示"汤姆的自行车"，人名后加 \'s 构成所有格。',
	analysis:'人名 Tom 后加 \'s，故填 Tom\'s。' }
];

/* ---------- 题库 → 题目对象 ---------- */
function bankChoice(item){
  var pairs = item.options.map(function(t,i){ return {t:t, ok:(i===item.ans)}; });
  shuffle(pairs);
  var ai = -1;
  pairs.forEach(function(p,i){ if(p.ok) ai = i; });
  return {
	id:++uid, type:'choice', point:item.point, score:5, stem:item.stem,
	options: pairs.map(function(p,i){ return 'ABCD'[i] + '. ' + p.t; }),
	answer: 'ABCD'[ai], answerText: pairs[ai].t,
	hint:item.hint, analysis:item.analysis
  };
}
function bankBlank(item){
  return { id:++uid, type:'fill', point:item.point, score:5, stem:item.stem,
		   answer:item.answer, hint:item.hint, analysis:item.analysis };
}

/* ---------- 导出 ---------- */
global.Q = {
  rnd: rnd, pick: pick, shuffle: shuffle, esc: esc,
  sub: sub, coef: coef, norm: norm, toNum: toNum,
  mathGens: mathGens,
  CN_CHOICE: CN_CHOICE, CN_BLANK: CN_BLANK,
  EN_CHOICE: EN_CHOICE, EN_BLANK: EN_BLANK,
  bankChoice: bankChoice, bankBlank: bankBlank
};

})(window);