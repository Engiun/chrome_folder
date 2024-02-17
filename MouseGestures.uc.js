// ==UserScript==
// @name                 Mousegestures.uc.js
// @include              chrome://browser/content/browser.xhtml
// @include              chrome://browser/content/browser.xul
// @charset              UTF-8
// ==/UserScript==
(() => {
	'use strict';
	let ucjsMouseGestures = {
		lastX: 0,
		lastY: 0,
		directionChain: '',
		isMouseDownL: false,
		isMouseDownR: false,
		hideFireContext: false,
		shouldFireContext: false,
		GESTURES: {
			'←': { name: '后退', cmd: () => document.getElementById("Browser:Back").doCommand() },
			'→': { name: '前进', cmd: () => document.getElementById("Browser:Forward").doCommand() },
			'↑↓': { name: '刷新', cmd: () => document.getElementById("Browser:Reload").doCommand() },
			'↓↑': { name: '忽视缓存重新刷新', cmd: () => document.getElementById("Browser:ReloadSkipCache").doCommand() },

			'→←': { name: '打开新标签', cmd: function () { BrowserOpenTab(); } },
			'←→': { name: '恢复关闭的标签', cmd: function () { try { document.getElementById('History:UndoCloseTab').doCommand(); } catch (ex) { if ('undoRemoveTab' in gBrowser) gBrowser.undoRemoveTab(); else throw "Session Restore feature is disabled." } } },

			'↑←': { name: '激活左边的标签页', cmd: function (event) { gBrowser.tabContainer.advanceSelectedTab(-1, true); } },
			'↑→': { name: '激活右边的标签页', cmd: function (event) { gBrowser.tabContainer.advanceSelectedTab(1, true); } },

			'↑←↑': { name: '激活第一个标签页', cmd: function (event) { gBrowser.selectedTab = (gBrowser.visibleTabs || gBrowser.mTabs)[0]; } },
			'↑→↑': { name: '激活最后一个标签页', cmd: function (event) { gBrowser.selectedTab = (gBrowser.visibleTabs || gBrowser.mTabs)[(gBrowser.visibleTabs || gBrowser.mTabs).length - 1]; } },


			'↓←': { name: '添加/移除书签', cmd: function () { document.getElementById("Browser:AddBookmarkAs").doCommand(); } },
			'↓→': { name: '关闭当前标签', cmd: function (event) { if (gBrowser.selectedTab.getAttribute("pinned") !== "true") { gBrowser.removeCurrentTab(); } } },


			'↑': { name: '转到页首', cmd: () => goDoCommand('cmd_scrollTop') },
			'↓': { name: '转到页尾', cmd: () => goDoCommand('cmd_scrollBottom') },


			'↓←': { name: '恢复刚关闭的标签', cmd: () => undoCloseTab() },
			'↓→': { name: '关闭当前标签', cmd: () => gBrowser.removeCurrentTab({ animate: true }) },
			'←↑': { name: '全屏切换', cmd: () => { document.getElementById("View:FullScreen").doCommand(); } },
			'→↑': { name: '打开新的标签页', cmd: () => BrowserOpenTab() },
			'←→': { name: '关闭右侧所有标签', cmd: () => gBrowser.removeTabsToTheEndFrom(gBrowser.selectedTab) },
			'→←': {
				name: '关闭左侧所有标签', cmd: () => {
					let currentIndex = gBrowser.selectedTab._tPos;
					for (let i = currentIndex - 1; i >= 0; i--) {
						if (!gBrowser.tabs[i].pinned) {
							gBrowser.removeTab(gBrowser.tabs[i]);
						}
					}
				}
			},


		},


		init: function () {
			let self = this;
			['mousedown', 'mousemove', 'mouseup', 'contextmenu', 'DOMMouseScroll'].forEach(type => {
				gBrowser.tabpanels.addEventListener(type, self, true);
			});
			gBrowser.tabpanels.addEventListener('unload', () => {
				['mousedown', 'mousemove', 'mouseup', 'contextmenu', 'DOMMouseScroll'].forEach(type => {
					gBrowser.tabpanels.removeEventListener(type, self, true);
				});
			}, false);
			this.createMessageDiv();
		},
		createMessageDiv: function () {
			// 创建用于显示消息的 div 元素
			this.messageDiv = document.createElement('div');
			this.messageDiv.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			z-index: 99999;
			background-color: rgba(0, 0, 0, 0.7);
			color: white;
			padding: 8px 15px;
			border-radius: 5px;
			display: none;
			font-size: 24px; /* 增加字体大小 */
			text-shadow: 0 0 10px #00e6e6, 0 0 20px #00e6e6, 0 0 30px #00e6e6, 0 0 40px #00e6e6; /* 发光效果 */
			box-shadow: 0 0 5px rgba(0, 230, 230, 0.75); /* 边框阴影 */
			animation: pulse 1.5s infinite; /* 动态效果 */
		`;

			// 添加 @keyframes 规则定义动态效果
			let styleSheet = document.createElement("style");
			styleSheet.type = "text/css";
			styleSheet.innerText = `
			@keyframes pulse {
				0% { transform: translate(-50%, -50%) scale(1); }
				50% { transform: translate(-50%, -50%) scale(1.1); }
				100% { transform: translate(-50%, -50%) scale(1); }
			}
		`;
			document.head.appendChild(styleSheet);
			document.body.appendChild(this.messageDiv);
		},
		showMessage: function (message) {
			// 显示消息
			this.messageDiv.textContent = message;
			this.messageDiv.style.display = 'block';
			setTimeout(() => this.messageDiv.style.display = 'none', 2000); // 2秒后隐藏消息
		},
		handleEvent: function (event) {
			switch (event.type) {
				case 'mousedown':
					if (event.button == 2) {
						(gBrowser.mPanelContainer || gBrowser.tabpanels).addEventListener("mousemove", this, false);
						this.isMouseDownR = true;
						this.hideFireContext = false;
						[this.lastX, this.lastY, this.directionChain] = [event.screenX, event.screenY, ''];
					}
					if (event.button == 0 && this.isMouseDownR) { // 检测左键点击且右键已按下
						window.minimize(); // 最小化浏览器窗口
						event.preventDefault(); // 阻止默认行为
						event.stopPropagation(); // 阻止事件冒泡
						this.isMouseDownR = false; // 重置右键按下状态
						this.stopGesture(); // 停止手势识别
					}
					break;
				case 'mousemove':
					if (this.isMouseDownR) {
						let [subX, subY] = [event.screenX - this.lastX, event.screenY - this.lastY];
						let [distX, distY] = [(subX > 0 ? subX : (-subX)), (subY > 0 ? subY : (-subY))];
						let direction;
						if (distX < 10 && distY < 10) return;
						if (distX > distY) direction = subX < 0 ? '←' : '→';
						else direction = subY < 0 ? '↑' : '↓';

						this.lastX = event.screenX;
						this.lastY = event.screenY;

						if (direction != this.directionChain.charAt(this.directionChain.length - 1)) {
							this.directionChain += direction;
							// 更新为调用 showMessage 方法
							let gestureName = this.GESTURES[this.directionChain] ? '手势: ' + this.directionChain + ' ' + this.GESTURES[this.directionChain].name : '未知手势:' + this.directionChain;
							this.showMessage(gestureName);
						}
					}
					break;
				case 'mouseup':
					if (this.isMouseDownR && event.button == 2) {
						if (this.directionChain) this.shouldFireContext = false;
						this.isMouseDownR = false;
						this.directionChain && this.stopGesture();
					}
					break;
				case 'contextmenu':
					if (this.isMouseDownR || this.hideFireContext) {
						this.shouldFireContext = true;
						this.hideFireContext = false;
						event.preventDefault();
						event.stopPropagation();
					}
					break;
				case 'DOMMouseScroll':
					if (this.isMouseDownR) {
						this.shouldFireContext = false;
						this.hideFireContext = true;
						this.directionChain = 'W' + (event.detail > 0 ? '+' : '-');
						this.stopGesture();
					}
					break;
			}
		},
		stopGesture: function () {
			if (this.GESTURES[this.directionChain]) this.GESTURES[this.directionChain].cmd();
			if (this.xdTrailArea) {
				this.xdTrailArea.parentNode.removeChild(this.xdTrailArea);
				this.xdTrailArea = null;
				this.xdTrailAreaContext = null;
			}
			this.directionChain = '';

			this.hideFireContext = true;
		}
	};
	ucjsMouseGestures.init();
})();