/* js/timer.js —— 作答时间点记录模块 */
(function(global){
'use strict';

var startTime = null;   // 整套卷开始时间
var endTime   = null;   // 提交批改时间
var qRecords  = {};     // { qid: { first, last, edits } }
var tickTimer = null;   // 顶栏计时器句柄
var onTick    = null;   // 每秒回调

function start(){
  startTime = Date.now();
  endTime = null;
  qRecords = {};
}

/** 每次作答/修改时调用，记录该题的时间点 */
function record(qid){
  var now = Date.now();
  if(!qRecords[qid]){
	qRecords[qid] = { first: now, last: now, edits: 1 };
  } else {
	qRecords[qid].last = now;
	qRecords[qid].edits++;
  }
}

function stop(){
  endTime = Date.now();
}

function getTotalMs(){
  if(!startTime) return 0;
  return (endTime || Date.now()) - startTime;
}

function getQuestionStats(qid){
  var r = qRecords[qid];
  if(!r) return null;
  return {
	first: r.first,          // 首次作答时间点（时间戳）
	last:  r.last,           // 最后修改时间点（时间戳）
	duration: r.last - r.first, // 从首次作答到最终确定的时间跨度
	edits: r.edits           // 修改次数
  };
}

function getAllStats(){
  return {
	startTime: startTime,
	endTime: endTime,
	totalMs: getTotalMs(),
	questions: qRecords
  };
}

/** 毫秒 → 可读文本 */
function formatMs(ms){
  if(ms === null || ms === undefined) return '—';
  if(ms < 1000) return ms + ' 毫秒';
  var s = Math.round(ms / 1000);
  if(s < 60) return s + ' 秒';
  var m = Math.floor(s / 60);
  var rs = s % 60;
  return m + ' 分 ' + rs + ' 秒';
}

/** 时间戳 → HH:MM:SS */
function formatClock(ts){
  if(!ts) return '—';
  var d = new Date(ts);
  function p(n){ return n<10 ? '0'+n : ''+n; }
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

/** 启动顶栏计时器，每秒调用 onTick(总秒数) */
function startTick(cb){
  onTick = cb;
  stopTick();
  tickTimer = setInterval(function(){
	if(onTick) onTick(Math.floor(getTotalMs()/1000));
  }, 1000);
}
function stopTick(){
  if(tickTimer){ clearInterval(tickTimer); tickTimer = null; }
}

global.PaperTimer = {
  start: start,
  record: record,
  stop: stop,
  getTotalMs: getTotalMs,
  getQuestionStats: getQuestionStats,
  getAllStats: getAllStats,
  formatMs: formatMs,
  formatClock: formatClock,
  startTick: startTick,
  stopTick: stopTick
};

})(window);