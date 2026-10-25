/* js/app.js —— 主逻辑 */
(function(){
'use strict';
var Q = window.Q, T = window.PaperTimer;

var $ = function(s,r){ return (r||document).querySelector(s); };
var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
var esc = Q.esc;

/* ---------- 全局状态 ---------- */
var state = {
  cfg: { subject:'chinese', level:1, count:8 },
  paper: null, answers: {}, graded: false, result: null
};
var SUBJECT_NAME = { chinese:'语文', math:'数学', english:'英语' };
var LEVEL_NAME   = { 1:'基础', 2:'中档', 3:'高考' };

var scrollEl  = $('#scroll');
var actionbar = $('#actionbar');
var btnSubmit = $('#btnSubmit');
var btnRegen  = $('#btnRegen');
var btnHome   = $('#btnHome');
var topTitle  = $('#topTitle');
var timerDisplay = $('#timerDisplay');

/* ---------- 出卷 ---------- */
function buildPaper(){
  var subject = state.cfg.subject;
  var count   = state.cfg.count;
  var qs = [];

  if(subject === 'math'){
	var gens = Q.shuffle(Q.mathGens.slice());
	for(var i=0;i<count;i++) qs.push(gens[i % gens.length]());
  } else {
	var CHOICE = (subject==='chinese') ? Q.CN_CHOICE : Q.EN_CHOICE;
	var BLANK  = (subject==='chinese') ? Q.CN_BLANK  : Q.EN_BLANK;
	var nc = Math.min(CHOICE.length, Math.round(count*0.55));
	var nb = count - nc;
	if(nb > BLANK.length) nb = BLANK.length;
	var a = Q.shuffle(CHOICE.slice()).slice(0, nc).map(Q.bankChoice);
	var b = Q.shuffle(BLANK.slice()).slice(0, nb).map(Q.bankBlank);
	qs = a.concat(b);
  }

  qs.forEach(function(q,i){ q.no = i+1; });

  state.paper = {
	subject: subject, level: state.cfg.level,
	questions: qs,
	total: qs.reduce(function(s,q){ return s + q.score; }, 0)
  };
  state.answers = {};
  state.graded  = false;
  state.result  = null;

  // 重置计时器
  T.start();
  T.startTick(updateTimerDisplay);

  render();
  scrollEl.scrollTop = 0;
}

/* ---------- 顶栏计时 ---------- */
function updateTimerDisplay(totalSec){
  if(!state.paper){ timerDisplay.hidden = true; return; }
  timerDisplay.hidden = false;
  var m = Math.floor(totalSec / 60);
  var s = totalSec % 60;
  timerDisplay.textContent = (m<10?'0'+m:m) + ':' + (s<10?'0'+s:s);
  timerDisplay.classList.toggle('warn', totalSec >= 30*60);
}

/* ---------- 渲染 ---------- */
function render(){
  if(!state.paper){
	topTitle.textContent = '智能试卷';
	btnHome.style.display = 'none';
	actionbar.hidden = true;
	timerDisplay.hidden = true;
	scrollEl.innerHTML = setupHTML();
	bindSetup();
  } else {
	topTitle.textContent = SUBJECT_NAME[state.paper.subject] + '试卷';
	btnHome.style.display = '';
	actionbar.hidden = false;
	btnSubmit.textContent = state.graded ? '已批改 ✓' : '提交批改';
	btnSubmit.disabled = state.graded;
	scrollEl.innerHTML = paperHTML();
  }
}

function setupHTML(){
  var c = state.cfg;
  return '' +
  '<div class="hero">' +
	'<div class="hero-icon">📝</div>' +
	'<div class="hero-title">智能出卷 · 即时批改</div>' +
	'<div class="hero-sub">语文 / 数学 / 英语 · 高职 · 高考</div>' +
  '</div>' +
  '<div class="card">' +
	'<div class="fld"><div class="fld-label">选择科目</div>' +
	  '<div class="seg" id="segSubject">' +
		'<button class="seg-btn' + (c.subject==='chinese'?' active':'') + '" data-v="chinese">语文</button>' +
		'<button class="seg-btn' + (c.subject==='math'   ?' active':'') + '" data-v="math">数学</button>' +
		'<button class="seg-btn' + (c.subject==='english'?' active':'') + '" data-v="english">英语</button>' +
	  '</div></div>' +
	'<div class="fld"><div class="fld-label">难度层次</div>' +
	  '<div class="seg" id="segLevel">' +
		'<button class="seg-btn' + (c.level===1?' active':'') + '" data-v="1">基础</button>' +
		'<button class="seg-btn' + (c.level===2?' active':'') + '" data-v="2">中档</button>' +
		'<button class="seg-btn' + (c.level===3?' active':'') + '" data-v="3">高考</button>' +
	  '</div></div>' +
	'<div class="fld"><div class="fld-label">题目数量</div>' +
	  '<div class="seg" id="segCount">' +
		'<button class="seg-btn' + (c.count===5 ?' active':'') + '" data-v="5">5 题</button>' +
		'<button class="seg-btn' + (c.count===8 ?' active':'') + '" data-v="8">8 题</button>' +
		'<button class="seg-btn' + (c.count===12?' active':'') + '" data-v="12">12 题</button>' +
	  '</div></div>' +
  '</div>' +
  '<button class="btn primary block" id="btnGen">生成试卷</button>' +
  '<div style="height:16px"></div>';
}

function bindSetup(){
  [['#segSubject','subject'],['#segLevel','level'],['#segCount','count']].forEach(function(pair){
	var el = $(pair[0]);
	if(!el) return;
	el.addEventListener('click', function(e){
	  var b = e.target.closest('.seg-btn');
	  if(!b) return;
	  $$('.seg-btn', el).forEach(function(x){ x.classList.toggle('active', x===b); });
	  state.cfg[pair[1]] = (pair[1]==='subject') ? b.dataset.v : Number(b.dataset.v);
	});
  });
  var g = $('#btnGen');
  if(g) g.addEventListener('click', buildPaper);
}

function paperHTML(){
  var p = state.paper;
  var out = '';
  if(state.graded) out += summaryHTML();
  out += '<div class="paper-titlebar">' +
		   '<div class="pt-name">' + SUBJECT_NAME[p.subject] + ' · ' + LEVEL_NAME[p.level] + '卷</div>' +
		   '<div class="pt-meta">共 ' + p.questions.length + ' 题 · 满分 ' + p.total + ' 分</div>' +
		 '</div>';
  out += p.questions.map(qHTML).join('');
  return out;
}

function qHTML(q){
  var ua = state.answers[q.id] || '';
  var body = '';

  if(q.type === 'choice'){
	body = '<div class="opts">' + q.options.map(function(o,i){
	  var L = 'ABCD'[i];
	  var cls = 'opt';
	  if(state.graded){
		if(L === q.answer) cls += ' ok';
		else if(L === ua)  cls += ' bad';
	  } else if(L === ua){
		cls += ' sel';
	  }
	  return '<button class="' + cls + '" data-q="' + q.id + '" data-v="' + L + '">' + esc(o) + '</button>';
	}).join('') + '</div>';
  } else {
	var ic = 'fillin';
	if(state.graded) ic += (q._ok ? ' ok' : ' bad');
	body = '<input class="' + ic + '" data-q="' + q.id + '" value="' + esc(ua) +
		   '" placeholder="请输入你的答案" autocomplete="off" ' +
		   (state.graded ? 'readonly' : '') + '>';
  }

  // 判题反馈 + 时间点信息
  var fb = '';
  if(state.graded){
	var ts = T.getQuestionStats(q.id);
	var timeLine = '';
	if(ts){
	  timeLine = '<div class="qtime">⏱ 首次作答 ' + T.formatClock(ts.first) +
				 ' · 最终修改 ' + T.formatClock(ts.last) +
				 ' · 跨度 ' + T.formatMs(ts.duration) +
				 ' · 修改 ' + ts.edits + ' 次</div>';
	}
	fb = '<div class="qfb ' + (q._ok ? 'ok' : 'err') + '">' +
		   '<div>' + (q._ok ? '✅ 回答正确' : '❌ 回答错误') + '</div>' +
		   '<div>正确答案：<b>' + (q.type === 'choice' ? q.answer + '（' + esc(q.answerText) + '）' : esc(q.answer)) + '</b></div>' +
		   (q.analysis ? '<div>解析：' + esc(q.analysis) + '</div>' : '') +
		   timeLine +
		 '</div>';
  }

  var stemHTML = esc(q.stem).replace(/\n/g, '<br>');
  var cardCls = 'qcard' + (state.graded ? (q._ok ? ' right' : ' wrong') : '');

  return '' +
  '<div class="' + cardCls + '">' +
	'<div class="qhead">' +
	  '<span class="qno">' + q.no + '</span>' +
	  '<span class="qtag">' + esc(q.point) + '</span>' +
	  '<span class="qscore">' + q.score + ' 分</span>' +
	  '<button class="hintdot" data-hint="' + q.id + '" aria-label="查看提示">?</button>' +
	'</div>' +
	'<div class="qstem">' + stemHTML + '</div>' +
	body +
	'<div class="hintbox" data-hintbox="' + q.id + '" hidden>' +
	  '<div class="hint-title">💡 解题提示</div>' +
	  '<div>' + esc(q.hint) + '</div>' +
	'</div>' +
	fb +
  '</div>';
}

/* ---------- 成绩单（含时间统计） ---------- */
function summaryHTML(){
  var r = state.result;
  var rate = Math.round(r.got / r.total * 100);
  var lv, color;
  if(rate >= 85){ lv = '优秀'; color = '#16a34a'; }
  else if(rate >= 70){ lv = '良好'; color = '#2563eb'; }
  else if(rate >= 60){ lv = '及格'; color = '#f59e0b'; }
  else { lv = '待提升'; color = '#ef4444'; }

  var rows = Object.keys(r.kp).map(function(name){
	var k = r.kp[name];
	var pct = Math.round(k.r / k.a * 100);
	var c = pct >= 80 ? '#22c55e' : (pct >= 60 ? '#f59e0b' : '#ef4444');
	return '<div class="kp">' +
			 '<span class="kp-name">' + esc(name) + '</span>' +
			 '<span class="kp-bar"><i class="kp-fill" style="width:' + pct + '%;background:' + c + '"></i></span>' +
			 '<span class="kp-val">' + k.r + '/' + k.a + '</span>' +
		   '</div>';
  }).join('');

  var tips = buildTips(r.kp).map(function(t){ return '<li>' + t + '</li>'; }).join('');

  // —— 时间统计面板 ——
  var timePanel = buildTimePanel();

  return '<div class="summary">' +
	'<div class="big-score" style="color:' + color + '">' + r.got + '<span class="small"> / ' + r.total + '</span></div>' +
	'<div class="sum-lv" style="color:' + color + '">' + lv + ' · 得分率 ' + rate + '%</div>' +
	'<div class="sum-title">知识点掌握情况</div>' + rows +
	'<div class="sum-title">作答时间分析</div>' + timePanel +
	'<div class="sum-title">学习建议</div>' +
	'<ul class="tips">' + tips + '</ul>' +
  '</div>';
}

function buildTimePanel(){
  var p = state.paper;
  var totalMs = T.getTotalMs();
  var n = p.questions.length;
  var avgMs = n ? Math.round(totalMs / n) : 0;

  // 找出最慢/最快
  var slowest = null, fastest = null;
  p.questions.forEach(function(q){
	var ts = T.getQuestionStats(q.id);
	if(!ts) return;
	if(!slowest || ts.duration > slowest.d) slowest = { q:q, d:ts.duration };
	if(!fastest || ts.duration < fastest.d) fastest = { q:q, d:ts.duration };
  });

  var cells =
	'<div class="timegrid">' +
	  '<div class="timecell"><div class="tlabel">总用时</div><div class="tvalue">' + T.formatMs(totalMs) + '</div></div>' +
	  '<div class="timecell"><div class="tlabel">平均每题</div><div class="tvalue">' + T.formatMs(avgMs) + '</div></div>' +
	  '<div class="timecell"><div class="tlabel">最耗时题目</div><div class="tvalue">' +
		(slowest ? ('第 ' + slowest.q.no + ' 题 · ' + T.formatMs(slowest.d)) : '—') + '</div></div>' +
	  '<div class="timecell"><div class="tlabel">最快速题目</div><div class="tvalue">' +
		(fastest ? ('第 ' + fastest.q.no + ' 题 · ' + T.formatMs(fastest.d)) : '—') + '</div></div>' +
	'</div>';

  // 横向时间轴
  var maxD = 1;
  p.questions.forEach(function(q){
	var ts = T.getQuestionStats(q.id);
	if(ts && ts.duration > maxD) maxD = ts.duration;
  });

  var timeline = '<div class="timeline">' + p.questions.map(function(q){
	var ts = T.getQuestionStats(q.id);
	var d = ts ? ts.duration : 0;
	var w = Math.round(d / maxD * 100);
	return '<div class="tl-row">' +
			 '<span class="tl-no">' + q.no + '</span>' +
			 '<span class="tl-bar"><i class="tl-fill" style="width:' + w + '%"></i></span>' +
			 '<span class="tl-time">' + T.formatMs(d) + '</span>' +
		   '</div>';
  }).join('') + '</div>';

  return cells + timeline;
}

function buildTips(kp){
  var weak = [], mid = [], good = [];
  Object.keys(kp).forEach(function(n){
	var r = kp[n].r / kp[n].a;
	if(r < 0.6) weak.push(n);
	else if(r < 0.85) mid.push(n);
	else good.push(n);
  });
  var tips = [];
  if(weak.length) tips.push('<b>' + weak.join('、') + '</b> 掌握薄弱，建议先回看教材中的定义、公式和例题，再做 3～5 道同类基础题。');
  if(mid.length)  tips.push('<b>' + mid.join('、') + '</b> 基本掌握，失分多半出在审题或计算细节上，建议限时做 2～3 道中档题。');
  if(good.length) tips.push('<b>' + good.join('、') + '</b> 掌握良好，可以尝试综合题或压轴题，进一步训练解题速度。');
  if(!tips.length) tips.push('本次作答全部正确，非常棒！建议适当挑战更高难度的题目。');
  tips.push('养成"错题本"习惯：把错题的题干、错因、正确思路记录在一起，每周末重做一遍。');
  return tips;
}

/* ---------- 批改 ---------- */
function isCorrect(q, ua){
  if(ua === undefined || ua === null || String(ua).trim() === '') return false;
  if(q.type === 'choice') return String(ua).toUpperCase() === q.answer;
  if(Q.norm(ua) === Q.norm(q.answer)) return true;
  var x = Q.toNum(ua), y = Q.toNum(q.answer);
  if(!isNaN(x) && !isNaN(y) && Math.abs(x - y) < 1e-9) return true;
  return false;
}

function grade(){
  var p = state.paper;
  var blank = p.questions.filter(function(q){ return String(state.answers[q.id] || '').trim() === ''; }).length;
  if(blank > 0 && !confirm('还有 ' + blank + ' 题未作答，确定提交批改吗？')) return;

  // 停止计时
  T.stop();
  T.stopTick();

  var got = 0, kp = {};
  p.questions.forEach(function(q){
	var ua = String(state.answers[q.id] || '');
	q._ok = isCorrect(q, ua);
	if(q._ok) got += q.score;
	if(!kp[q.point]) kp[q.point] = { r:0, a:0 };
	kp[q.point].a++;
	if(q._ok) kp[q.point].r++;
  });

  state.graded = true;
  state.result = { got: got, total: p.total, kp: kp };
  render();
  scrollEl.scrollTop = 0;
}

/* ---------- 事件绑定 ---------- */
scrollEl.addEventListener('click', function(e){
  // 提示圈
  var hb = e.target.closest('.hintdot');
  if(hb){
	var id = hb.dataset.hint;
	var box = scrollEl.querySelector('[data-hintbox="' + id + '"]');
	if(box){ box.hidden = !box.hidden; hb.classList.add('seen'); }
	return;
  }
  // 选项
  var opt = e.target.closest('.opt');
  if(opt && !state.graded){
	var qid = opt.dataset.q;
	var val = opt.dataset.v;
	state.answers[qid] = val;
	// ★ 记录时间点
	T.record(qid);
	$$('.opt[data-q="' + qid + '"]', scrollEl).forEach(function(b){
	  b.classList.toggle('sel', b.dataset.v === val);
	});
	return;
  }
});

scrollEl.addEventListener('input', function(e){
  var inp = e.target.closest('.fillin');
  if(inp && !state.graded){
	state.answers[inp.dataset.q] = inp.value;
	// ★ 记录时间点
	T.record(inp.dataset.q);
  }
});

btnSubmit.addEventListener('click', function(){ if(!state.graded) grade(); });
btnRegen.addEventListener('click', function(){ buildPaper(); });
btnHome.addEventListener('click', function(){
  state.paper = null; state.answers = {}; state.graded = false; state.result = null;
  T.stopTick();
  render(); scrollEl.scrollTop = 0;
});

render();
})();