alert("转义.js 已加载");

//转义输入
export function 转义(文本) {
	'use strict';
	if (typeof 文本 !=='string') return 文本;
	return 文本
	
	.replace(/&/g, '&amp;')     // & 必须最先替换
	.replace(/</g, '&lt;')      // <
	.replace(/>/g, '&gt;')      // >
	.replace(/"/g, '&quot;')    // "
	.replace(/'/g, '&#39;')     // '
	.replace(/©/g, '&copy;')    // ©
	.replace(/#/g, '&num;')     // #
	.replace(/§/g, '&sect;')    // §
	.replace(/¥/g, '&yen;')     // ¥
	.replace(/\$/g, '&dollar;') // $
	.replace(/£/g, '&pound;')   // £
	.replace(/¢/g, '&cent;')    // ¢
	.replace(/%/g, '&percnt;')  // %
	.replace(/\*/g, '&ast;')    // *
	.replace(/@/g, '&commat;')  // @
	.replace(/\^/g, '&Hat;')     // ^
	.replace(/±/g, '&plusmn;')  // ±
	.replace(/ /g, '&nbsp;');   // 空格 | empty
}