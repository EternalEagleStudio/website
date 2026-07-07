(function() {
  'use strict';
  
  // 获取 body 元素（确保类名为“注册”）
  const body = document.querySelector('body.注册');
  if (!body) return;

  // 原始四个颜色的 HSL 近似值（根据 #ee7752, #e73c7e, #23a6d5, #23d5ab 估算）
  const 色相 = [15, 330, 197, 165];    // 色相
  const 饱和度 = [82, 78, 72, 72];    // 饱和度 (%)
  const 明度 = [63, 57, 48, 48];     // 明度 (%)

  // 色相变化速度（度/毫秒）—— 速度越快，颜色变化越快
  const 速度 = 0.03; // 约每秒 30 度，12 秒循环一周

  function 更新梯度() {
	// 基于时间计算整体色相偏移量
	const now = Date.now() * 速度;
	const offset = now % 360;

	// 生成四个当前颜色（保持原始饱和度和明度）
	const 颜色 = 色相.map((hue, index) => {
	  const h = (hue + offset) % 360;
	  return `hsl(${h}, ${饱和度[index]}%, ${明度[index]}%)`;
	});

	// 构建 linear-gradient，角度保持 -45°
	const 梯度 = `linear-gradient(-45deg, ${颜色.join(', ')})`;
	body.style.backgroundImage = 梯度;

	// 继续下一帧动画
	requestAnimationFrame(更新梯度);
  }

  // 启动动画
  requestAnimationFrame(更新梯度);
})();