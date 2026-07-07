/**
 * 创建一个数据应用实例
 * @param {string} folderName - 文件夹名称（用于标识数据归属）
 * @param {string} configFileName - 配置文件名（用于持久化标识）
 * @returns {Object} 包含初始化及数据操作方法的对象
 */
export function DataAPP(folderName, configFileName) {
	// ========== 私有配置 ==========
	let 文件夹名 = folderName;
	let 配置文件名 = configFileName;

	// 加密密钥示例（实际使用时请从安全环境获取，切勿硬编码）
	const 加密密钥 = {
		密钥: new TextEncoder().encode("1234567890abcdef")
	};

	// ========== 内部状态 ==========
	let 应用上下文 = null;           // 可存储任意上下文信息
	let 已初始化标志 = false;        // 使用布尔值而非 Boolean 对象
	let 数据存储 = {};               // 简单的内存数据存储 { key: value }

	// ========== 私有辅助函数 ==========

	/**
	 * 检查是否已初始化，若未初始化则抛出错误
	 * @throws {Error} 当应用未初始化时抛出
	 */
	function 检查初始化() {
		if (!已初始化标志) {
			throw new Error('应用未初始化，请先调用初始化方法');
		}
	}

	/**
	 * 模拟数据持久化（实际可替换为 localStorage、IndexedDB 或 API 调用）
	 * @private
	 */
	function 持久化数据() {
		// 这里仅作示例，实际应实现具体存储逻辑
		console.log(`[持久化] 数据已保存至 ${文件夹名}/${配置文件名}`);
		// 例如使用 localStorage: localStorage.setItem(配置文件名, JSON.stringify(数据存储));
	}

	// ========== 公开方法 ==========

	/**
	 * 初始化应用，必须在使用其他方法前调用
	 * @param {*} context - 上下文信息（可选）
	 */
	function 初始化(context) {
		应用上下文 = context;
		已初始化标志 = true;
		console.log(`应用已初始化，文件夹：${文件夹名}，配置文件：${配置文件名}`);
		// 可在此处尝试加载已有数据
		// 加载数据();
	}

	/**
	 * 注册新数据（若键已存在则覆盖）
	 * @param {string} key - 数据键名
	 * @param {*} value - 数据值
	 */
	function 注册数据(key, value) {
		检查初始化();
		数据存储[key] = value;
		持久化数据();
		console.log(`数据已注册：${key} =`, value);
	}

	/**
	 * 保存数据（与注册数据功能类似，可作为别名）
	 * @param {string} key - 数据键名
	 * @param {*} value - 数据值
	 */
	function 保存数据(key, value) {
		注册数据(key, value); // 直接复用注册逻辑
	}

	/**
	 * 加载数据（从存储中读取所有数据或指定键的数据）
	 * @param {string} [key] - 可选，指定键名，不传则返回全部数据
	 * @returns {*} 指定键的数据或全部数据对象
	 */
	function 加载数据(key) {
		检查初始化();
		if (key === undefined) {
			return { ...数据存储 }; // 返回副本避免外部直接修改
		}
		return 数据存储.hasOwnProperty(key) ? 数据存储[key] : undefined;
	}

	/**
	 * 修改已存在的数据（若键不存在则添加）
	 * @param {string} key - 数据键名
	 * @param {*} value - 新值
	 */
	function 修改数据(key, value) {
		检查初始化();
		数据存储[key] = value;
		持久化数据();
		console.log(`数据已修改：${key} =`, value);
	}

	/**
	 * 通用更新方法（可自定义行为）
	 * @param {string} key - 数据键名
	 * @param {*} value - 新值
	 */
	function update(key, value) {
		修改数据(key, value); // 默认行为同修改数据
	}

	/**
	 * 清空所有数据
	 */
	function 清空数据() {
		检查初始化();
		数据存储 = {};
		持久化数据();
		console.log('所有数据已清空');
	}

	/**
	 * 删除指定键的数据
	 * @param {string} key - 要删除的数据键名
	 * @returns {boolean} 是否成功删除（键存在时返回 true）
	 */
	function 删除数据(key) {
		检查初始化();
		if (数据存储.hasOwnProperty(key)) {
			delete 数据存储[key];
			持久化数据();
			console.log(`数据已删除：${key}`);
			return true;
		}
		console.warn(`键 ${key} 不存在，删除失败`);
		return false;
	}

	// ========== 返回公共 API ==========
	return {
		初始化,
		注册数据,
		保存数据,
		加载数据,
		修改数据,
		update,
		清空数据,
		删除数据,
		// 提供只读配置获取方法
		getFolderName: () => 文件夹名,
		getConfigFileName: () => 配置文件名,
		// 可选择性暴露加密密钥（谨慎！）
		// getEncryptionKey: () => 加密密钥.密钥,
	};
}