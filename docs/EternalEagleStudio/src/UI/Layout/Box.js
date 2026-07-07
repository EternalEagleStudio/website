'use strict';

// 获取根元素（:root），用于修改 CSS 变量
const 根元素 = document.documentElement;

// 更新内容区相关变量（显示方式、对齐方式、文本对齐）
function 内容区(显示值, 对齐方式值, 文本对齐值) {
	if (显示值 !== undefined) {
		根元素.style.setProperty('--显示', 显示值);
	}
	if (对齐方式值 !== undefined) {
		根元素.style.setProperty('--对齐方式', 对齐方式值);
	}
	if (文本对齐值 !== undefined) {
		根元素.style.setProperty('--对齐', 文本对齐值);
	}
}

// 更新内边距（接受数值，自动加 px）
function 内边距(数值) {
	根元素.style.setProperty('--内边距', 数值 + 'px');
}

// 更新边框（接受完整的边框字符串，例如 "5px solid red"）
// 也可以拆分为三个控件分别更新，这里演示组合方式
function 边框(边框字符串) {
	根元素.style.setProperty('--边框', 边框字符串);
}

// 更新外边距（接受数值，自动加 px）
function 外边距(数值) {
	根元素.style.setProperty('--外边距', 数值 + 'px');
}

// 更新背景色（接受颜色字符串，如 "#ff0000" 或 "red"）
function 背景色(颜色值) {
	根元素.style.setProperty('--背景色', 颜色值);
}

// 页面加载完成后，绑定控件事件
document.addEventListener('DOMContentLoaded', function() {
	// 1. 内边距滑块
	const 获取内边距 = document.getElementById('内边距');
	if (获取内边距) {
		获取内边距.addEventListener('input', function(e) {
			内边距(e.target.value);
		});
		// 初始化设置一次，确保与默认CSS变量同步（可选）
		内边距(获取内边距.value);
	}

	// 2. 边框控件（宽度 + 颜色 + 样式）
	const 边框宽度 = document.getElementById('边框宽度');
	const 边框颜色 = document.getElementById('边框颜色');
	const 边框样式 = document.getElementById('边框样式'); // 可选，如 "solid"

	function 更新边框() {
		const 宽度 = 边框宽度 ? 边框宽度.value + 'px' : '2px';
		const 颜色 = 边框颜色 ? 边框颜色.value : '#333';
		const 样式 = 边框样式 ? 边框样式.value : 'solid';
		边框(`${宽度} ${样式} ${颜色}`);
	}

	if (边框宽度) 边框宽度.addEventListener('input', 更新边框);
	if (边框颜色 ) 边框颜色 .addEventListener('input', 更新边框);
	if (边框样式) 边框样式.addEventListener('change', 更新边框);
	// 初始化边框
	更新边框();

	// 3. 外边距滑块
	const 获取外边距 = document.getElementById('外边距');
	if (获取外边距) {
		获取外边距.addEventListener('input', function(e) {
			外边距(e.target.value);
		});
		外边距(获取外边距.value);
	}

	// 4. 背景色选择器
	const 选择背景色 = document.getElementById('背景色');
	if (选择背景色) {
		选择背景色.addEventListener('input', function(e) {
			背景色(e.target.value);
		});
		背景色(选择背景色.value);
	}

	// 5. 内容区控件：显示方式（display）
	const 显示方式 = document.getElementById('显示方式');
	if (显示方式) {
		显示方式.addEventListener('change', function(e) {
			内容区(e.target.value, undefined, undefined); // 只更新显示方式
		});
	}

	// 6. 对齐方式（align-items）
	const 对齐方式 = document.getElementById('align-items-select');
	if (对齐方式) {
		对齐方式.addEventListener('change', function(e) {
			内容区(undefined, e.target.value, undefined);
		});
	}

	// 7. 文本对齐（text-align）
	const 文本对齐 = document.getElementById('text-align-select');
	if (文本对齐) {
		文本对齐.addEventListener('change', function(e) {
			内容区(undefined, undefined, e.target.value);
		});
	}

	// 如果你希望用一个函数同时更新多个内容区属性，也可以单独为每个属性写一个函数。
});