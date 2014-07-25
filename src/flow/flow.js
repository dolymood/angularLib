/**
 * @license MIT
 */
(function(window, document, undefined) {'use strict';

	/**
	 * Flow.js is a library providing multiple simultaneous, stable and
	 * resumable uploads via the HTML5 File API.
	 * @param [opts]
	 * @param {number} [opts.chunkSize]
	 * @param {bool} [opts.forceChunkSize]
	 * @param {number} [opts.simultaneousUploads]
	 * @param {bool} [opts.singleFile]
	 * @param {string} [opts.fileParameterName]
	 * @param {number} [opts.progressCallbacksInterval]
	 * @param {number} [opts.speedSmoothingFactor]
	 * @param {Object|Function} [opts.query]
	 * @param {Object} [opts.headers]
	 * @param {bool} [opts.withCredentials]
	 * @param {Function} [opts.preprocess]
	 * @param {string} [opts.method]
	 * @param {bool} [opts.prioritizeFirstAndLastChunk]
	 * @param {string} [opts.target]
	 * @param {number} [opts.maxChunkRetries]
	 * @param {number} [opts.chunkRetryInterval]
	 * @param {Array.<number>} [opts.permanentErrors]
	 * @param {Function} [opts.generateUniqueIdentifier]
	 * @constructor
	 */
	function Flow(opts) {
		/**
		 * Supported by browser?
		 * @type {boolean}
		 */
		
		// ie10 +
		// ie 不能通过formdata上传0kb的文件
		// 所以还是采用传统的方式
		var ie10 = window.navigator.msPointerEnabled;

		this.support = (
				typeof File !== 'undefined' &&
				typeof Blob !== 'undefined' &&
				typeof FileList !== 'undefined' &&
				(
					!!Blob.prototype.slice || !!Blob.prototype.webkitSlice || !!Blob.prototype.mozSlice ||
					false
				) // slicing files support
				&& !ie10
		);

		
		if (!this.support) {
			return ;
		}

		/**
		 * Check if directory upload is supported
		 * @type {boolean}
		 */
		this.supportDirectory = /WebKit/.test(window.navigator.userAgent);

		/**
		 * List of FlowFile objects
		 * @type {Array.<FlowFile>}
		 */
		this.files = [];

		this.uploadedFiles = [];

		// List of FlowFile or FlowFolder objects
		// 格式化后的files（file folder）
		this.parsedFilesHashMap = new HashMap();

		this.parsedFiles = [];

		/**
		 * Default options for flow.js
		 * @type {Object}
		 */
		this.defaults = {
			chunkSize: 1024 * 1024,
			maxSize: 300 * 1024 * 1024,
			forceChunkSize: false,
			simultaneousUploads: 3,
			singleFile: false,
			fileParameterName: 'file',
			progressCallbacksInterval: 500,
			speedSmoothingFactor: 0.1,
			query: {},
			headers: {},
			withCredentials: false,
			preprocess: null,
			method: 'multipart',
			prioritizeFirstAndLastChunk: false,
			target: '/',
			testChunks: true,
			generateUniqueIdentifier: null,
			maxChunkRetries: 0,
			chunkRetryInterval: null,
			permanentErrors: [404, 415, 500, 501],
			getFolderTarget: function(paths, folderObj, callback) {
				setTimeout(function() {
					callback({});
				}, 1000);
			},
			parseTarget: function(target, fileObj) {
				/**
				 * fileObj 会包含folderObj（如果是文件夹的话） 在folderObj
				 * 上有 allPathsKV 这个对象
				 allPathsKV => {
						'a/': 'entryId1',
						'a/b/': 'entryId2',
						'a/b/c/': 'entryId3',
						'a/c/': 'entryId4'
				 }
				 *
				 * 这样就可以构建上传url了
				 * ps: 在这里没考虑页面load之后去请求文件存放位置api得到结果
				 * 需要自己在上传前确保了请求已成功并且拿到了结果数据
				 */
				return target;
			}
		};

		/**
		 * Current options
		 * @type {Object}
		 */
		this.opts = {};

		/**
		 * List of events:
		 *  key stands for event name
		 *  value array list of callbacks
		 * @type {}
		 */
		this.events = {};



		var $ = this;

		this.on('fileSuccess', function(flowfile) {
			$.uploadedFiles.push(flowfile);
		});
		this.on('fileError', function(flowfile) {

		});
		
		/**
		 * On drop event
		 * @function
		 * @param {MouseEvent} event
		 */
		this.onDrop = function (event) {
			event.stopPropagation();
			event.preventDefault();
			var dataTransfer = event.dataTransfer;
			if (dataTransfer.items && dataTransfer.items[0] &&
				dataTransfer.items[0].webkitGetAsEntry) {
				$.webkitReadDataTransfer(event);
			} else {
				$.addFiles(dataTransfer.files, event);
			}
		};

		/**
		 * Prevent default
		 * @function
		 * @param {MouseEvent} event
		 */
		this.preventEvent = function (event) {
			event.preventDefault();
		};


		/**
		 * Current options
		 * @type {Object}
		 */
		this.opts = Flow.extend({}, this.defaults, opts || {});
	}

	Flow.prototype = {
		/**
		 * Set a callback for an event, possible events:
		 * fileSuccess(file), fileProgress(file), fileAdded(file, event),
		 * fileRetry(file), fileError(file, message), complete(),
		 * progress(), error(message, file), pause()
		 * @function
		 * @param {string} event
		 * @param {Function} callback
		 */
		on: function (event, callback) {
			event = event.toLowerCase();
			if (!this.events.hasOwnProperty(event)) {
				this.events[event] = [];
			}
			this.events[event].push(callback);
		},

		/**
		 * Remove event callback
		 * @function
		 * @param {string} [event] removes all events if not specified
		 * @param {Function} [fn] removes all callbacks of event if not specified
		 */
		off: function (event, fn) {
			if (event !== undefined) {
				event = event.toLowerCase();
				if (fn !== undefined) {
					if (this.events.hasOwnProperty(event)) {
						arrayRemove(this.events[event], fn);
					}
				} else {
					delete this.events[event];
				}
			} else {
				this.events = {};
			}
		},

		/**
		 * Fire an event
		 * @function
		 * @param {string} event event name
		 * @param {...} args arguments of a callback
		 * @return {bool} value is false if at least one of the event handlers which handled this event
		 * returned false. Otherwise it returns true.
		 */
		fire: function (event, args) {
			// `arguments` is an object, not array, in FF, so:
			args = Array.prototype.slice.call(arguments);
			event = event.toLowerCase();
			var preventDefault = false;
			if (this.events.hasOwnProperty(event)) {
				each(this.events[event], function (callback) {
					preventDefault = callback.apply(this, args.slice(1)) === false || preventDefault;
				});
			}
			if (event != 'catchall') {
				args.unshift('catchAll');
				preventDefault = this.fire.apply(this, args) === false || preventDefault;
			}
			return !preventDefault;
		},

		/**
		 * Read webkit dataTransfer object
		 * @param event
		 */
		webkitReadDataTransfer: function (event) {
			var $ = this;
			var queue = event.dataTransfer.items.length;
			var files = [];
			each(event.dataTransfer.items, function (item) {
				var entry = item.webkitGetAsEntry();
				if (!entry) {
					decrement();
					return ;
				}
				if (entry.isFile) {
					// due to a bug in Chrome's File System API impl - #149735
					fileReadSuccess(item.getAsFile(), entry.fullPath);
				} else {
					entry.createReader().readEntries(readSuccess, readError);
				}
			});
			function readSuccess(entries) {
				queue += entries.length;
				each(entries, function(entry) {
					if (entry.isFile) {
						var fullPath = entry.fullPath;
						entry.file(function (file) {
							fileReadSuccess(file, fullPath);
						}, readError);
					} else if (entry.isDirectory) {
						entry.createReader().readEntries(readSuccess, readError);
					}
				});
				decrement();
			}
			function fileReadSuccess(file, fullPath) {
				// relative path should not start with "/"
				file.relativePath = fullPath.substring(1);
				files.push(file);
				decrement();
			}
			function readError(fileError) {
				throw fileError;
			}
			function decrement() {
				if (--queue == 0) {
					$.addFiles(files, event);
				}
			}
		},

		/**
		 * Generate unique identifier for a file
		 * @function
		 * @param {FlowFile} file
		 * @returns {string}
		 */
		generateUniqueIdentifier: function (file) {
			var custom = this.opts.generateUniqueIdentifier;
			if (typeof custom === 'function') {
				return custom(file);
			}
			// Some confusion in different versions of Firefox
			var relativePath = file.relativePath || file.webkitRelativePath || file.fileName || file.name;
			return file.size + '-' + relativePath.replace(/[^0-9a-zA-Z_-]/img, '');
		},

		/**
		 * Upload next chunk from the queue
		 * @function
		 * @returns {boolean}
		 * @private
		 */
		uploadNextChunk: function (preventEvents) {
			// In some cases (such as videos) it's really handy to upload the first
			// and last chunk of a file quickly; this let's the server check the file's
			// metadata and determine if there's even a point in continuing.
			var found = false;
			if (this.opts.prioritizeFirstAndLastChunk) {
				each(this.files, function (file) {
					if (!file.paused && file.chunks.length &&
						file.chunks[0].status() === 'pending' &&
						file.chunks[0].preprocessState === 0) {
						file.chunks[0].send();
						found = true;
						return false;
					}
					if (!file.paused && file.chunks.length > 1 &&
						file.chunks[file.chunks.length - 1].status() === 'pending' &&
						file.chunks[0].preprocessState === 0) {
						file.chunks[file.chunks.length - 1].send();
						found = true;
						return false;
					}
				});
				if (found) {
					return found;
				}
			}

			// Now, simply look for the next, best thing to upload
			each(this.files, function (file) {
				if (!file.paused) {
					each(file.chunks, function (chunk) {
						if (chunk.status() === 'pending' && chunk.preprocessState === 0) {
							chunk.send();
							found = true;
							return false;
						}
					});
				}
				if (found) {
					return false;
				}
			});
			if (found) {
				return true;
			}

			// The are no more outstanding chunks to upload, check is everything is done
			var outstanding = false;
			each(this.files, function (file) {
				if (!file.isComplete()) {
					outstanding = true;
					return false;
				}
			});
			if (!outstanding && !preventEvents) {
				// All chunks have been uploaded, complete
				async(function () {
					this.fire('complete');
				}, this);
			}
			return false;
		},


		/**
		 * Assign a browse action to one or more DOM nodes.
		 * @function
		 * @param {Element|Array.<Element>} domNodes
		 * @param {boolean} isDirectory Pass in true to allow directories to
		 * @param {boolean} singleFile prevent multi file upload
		 * be selected (Chrome only).
		 */
		assignBrowse: function (domNodes, isDirectory, singleFile) {
			if (typeof domNodes.length === 'undefined') {
				domNodes = [domNodes];
			}

			each(domNodes, function (domNode) {
				var input;
				if (domNode.tagName === 'INPUT' && domNode.type === 'file') {
					input = domNode;
				} else {
					input = document.createElement('input');
					input.setAttribute('type', 'file');
					// display:none - not working in opera 12
					extend(input.style, {
						visibility: 'hidden',
						position: 'absolute'
					});
					// for opera 12 browser, input must be assigned to a document
					domNode.appendChild(input);
					// https://developer.mozilla.org/en/using_files_from_web_applications)
					// event listener is executed two times
					// first one - original mouse click event
					// second - input.click(), input is inside domNode
					domNode.addEventListener('click', function() {
						input.click();
					}, false);
				}
				if (!this.opts.singleFile && !singleFile) {
					input.setAttribute('multiple', 'multiple');
				}
				if (isDirectory) {
					input.setAttribute('webkitdirectory', 'webkitdirectory');
				}
				// When new files are added, simply append them to the overall list
				var $ = this;
				input.addEventListener('change', function (e) {
					$.addFiles(e.target.files, e);
					e.target.value = '';
				}, false);
			}, this);
		},

		/**
		 * Assign one or more DOM nodes as a drop target.
		 * @function
		 * @param {Element|Array.<Element>} domNodes
		 */
		assignDrop: function (domNodes) {
			if (typeof domNodes.length === 'undefined') {
				domNodes = [domNodes];
			}
			each(domNodes, function (domNode) {
				domNode.addEventListener('dragover', this.preventEvent, false);
				domNode.addEventListener('dragenter', this.preventEvent, false);
				domNode.addEventListener('drop', this.onDrop, false);
			}, this);
		},

		/**
		 * Un-assign drop event from DOM nodes
		 * @function
		 * @param domNodes
		 */
		unAssignDrop: function (domNodes) {
			if (typeof domNodes.length === 'undefined') {
				domNodes = [domNodes];
			}
			each(domNodes, function (domNode) {
				domNode.removeEventListener('dragover', this.preventEvent);
				domNode.removeEventListener('dragenter', this.preventEvent);
				domNode.removeEventListener('drop', this.onDrop);
			}, this);
		},

		/**
		 * Returns a boolean indicating whether or not the instance is currently
		 * uploading anything.
		 * @function
		 * @returns {boolean}
		 */
		isUploading: function () {
			var uploading = false;
			each(this.files, function (file) {
				if (file.isUploading()) {
					uploading = true;
					return false;
				}
			});
			return uploading;
		},

		// 同时在上传的文件数
		uploadingNums: function() {
			var num = 0;
			each(this.files, function (file) {
				if (file.isUploading()) {
					num++;
				}
			});
			return num;
		},

		/**
		 * Start or resume uploading.
		 * @function
		 */
		upload: function () {
			// Make sure we don't start too many uploads at once
			var uploadingNum = this.uploadingNums();
			if (uploadingNum >= this.opts.simultaneousUploads) {
				return;
			}
			// Kick off the queue
			this.fire('uploadStart');
			var started = false;
			for (var num = 1; num <= this.opts.simultaneousUploads - uploadingNum; num++) {
				started = this.uploadNextChunk(true) || started;
			}
			if (!started) {
				async(function () {
					this.fire('complete');
				}, this);
			}
		},

		/**
		 * Resume uploading.
		 * @function
		 */
		resume: function () {
			each(this.files, function (file) {
				file.resume();
			});
		},

		/**
		 * Pause uploading.
		 * @function
		 */
		pause: function () {
			each(this.files, function (file) {
				file.pause();
			});
		},

		/**
		 * Cancel upload of all FlowFile objects and remove them from the list.
		 * @function
		 */
		cancel: function () {
			for (var i = this.files.length - 1; i >= 0; i--) {
				this.files[i].cancel();
			}
		},

		/**
		 * Returns a number between 0 and 1 indicating the current upload progress
		 * of all files.
		 * @function
		 * @returns {number}
		 */
		progress: function () {
			var totalDone = 0;
			var totalSize = 0;
			// Resume all chunks currently being uploaded
			each(this.files, function (file) {
				totalDone += file.progress() * file.size;
				totalSize += file.size;
			});
			return totalSize > 0 ? totalDone / totalSize :
							this.isComplete() ? 1 : 0;
		},

		/**
		 * Add a HTML5 File object to the list of files.
		 * @function
		 * @param {File} file
		 * @param {Event} [event] event is optional
		 */
		addFile: function (file, event) {
			this.addFiles([file], event);
		},

		/**
		 * Add a HTML5 File object to the list of files.
		 * @function
		 * @param {FileList|Array} fileList
		 * @param {Event} [event] event is optional
		 */
		addFiles: function (fileList, event) {
			var files = [];
			each(fileList, function (file) {
				var isFolder = file.size % 4096 === 0 && (file.name || file.fileName) === '.';
				// Directories have size `0` and name `.`
				// Ignore already added files
				if (!isFolder &&
					!this.getFromUniqueIdentifier(this.generateUniqueIdentifier(file))) {
					var f = new FlowFile(this, file);
					if (this.fire('fileAdded', f, event)) {
						files.push(f);
					}
				}
			}, this);
			if (this.fire('filesAdded', files, event)) {
				each(files, function (file) {
					if (this.opts.singleFile && this.files.length > 0) {
						this.removeFile(this.files[0]);
					}
					this.files.push(file);
				}, this);
			}
			var hashMap = new HashMap();
			parseFlowFiles(hashMap, files);
			var newFs = this.updateParsedFiles(hashMap);
			this.parsedFiles.push.apply(this.parsedFiles, newFs);
			this.fire('filesSubmitted', files, event);
		},

		updateParsedFiles: function(hashMap) {
			var parsedFiles = this.parsedFilesHashMap;
			var newObj = [];
			each(hashMap.items, function(k) {
				var v = hashMap.getItem(k);
				if (v.constructor == HashMap) {
					// 文件夹
					v = new FlowFolder(this, v, k);
				}
				parsedFiles.setItem(k, v);
				newObj.push(v);
			}, this);
			return newObj;
		},


		/**
		 * Cancel upload of a specific FlowFile object from the list.
		 * @function
		 * @param {FlowFile} file
		 */
		removeFile: function (file) {
			for (var i = this.files.length - 1; i >= 0; i--) {
				if (this.files[i] === file) {
					this.files.splice(i, 1);
					file.abort();
				}
			}
		},

		removeParsedFile: function(file) {
			for (var i = this.parsedFiles.length - 1, k; i >= 0; i--) {
				k = this.parsedFiles[i];
				if (k === file) {
					this.parsedFiles.splice(i, 1);
				}
			}
			this.parsedFilesHashMap.removeItem(file);
		},

		/**
		 * Look up a FlowFile object by its unique identifier.
		 * @function
		 * @param {string} uniqueIdentifier
		 * @returns {boolean|FlowFile} false if file was not found
		 */
		getFromUniqueIdentifier: function (uniqueIdentifier) {
			var ret = false;
			each(this.files, function (file) {
				if (file.uniqueIdentifier === uniqueIdentifier) {
					ret = file;
				}
			});
			return ret;
		},

		/**
		 * Returns the total size of all files in bytes.
		 * @function
		 * @returns {number}
		 */
		getSize: function () {
			var totalSize = 0;
			each(this.files, function (file) {
				totalSize += file.size;
			});
			return totalSize;
		},

		/**
		 * Returns the total size uploaded of all files in bytes.
		 * @function
		 * @returns {number}
		 */
		sizeUploaded: function () {
			var size = 0;
			each(this.files, function (file) {
				size += file.sizeUploaded();
			});
			return size;
		},

		/**
		 * Returns remaining time to upload all files in seconds. Accuracy is based on average speed.
		 * If speed is zero, time remaining will be equal to positive infinity `Number.POSITIVE_INFINITY`
		 * @function
		 * @returns {number}
		 */
		timeRemaining: function () {
			var sizeDelta = 0;
			var averageSpeed = 0;
			each(this.files, function (file) {
				if (!file.paused && !file.error) {
					sizeDelta += file.size - file.sizeUploaded();
					averageSpeed += file.averageSpeed;
				}
			});
			if (sizeDelta && !averageSpeed) {
				return Number.POSITIVE_INFINITY;
			}
			if (!sizeDelta && !averageSpeed) {
				return 0;
			}
			return Math.floor(sizeDelta / averageSpeed);
		}
	};

	/**
	 * 将path转换为级别path
	 * @return {Array} 转换后的级别path
	 * @example
	 * 'a/b/c/dd.jpg' => ['a/', 'a/b/', 'a/b/c/']
	 */
	function parsePaths(path) {
		var ret = [];
		var paths = path.split('/');
		var len = paths.length;
		var i = 1;
		paths.splice(len - 1, 1);
		len--;
		if (paths.length) {
			while (i <= len) {
				ret.push(paths.slice(0, i++).join('/') + '/');
			}
		}
		return ret;
	}

	function parseFlowFiles(ret, flowFiles) {
		if (!flowFiles.length) return;
		each(flowFiles, function(flowFile) {
			var ppaths = parsePaths(flowFile.relativePath);
			if (ppaths.length) {
				// 包含文件夹路径
				each(ppaths, function(path, i) {
					var item = ret.getItem(path);
					if (!item) {
						item = new HashMap();
						ret.setItem(path, item);
					}
					if (ppaths[i + 1]) {
						// 子目录
					} else {
						// 文件
						item.setItem(flowFile.relativePath, flowFile);
					}
				});
				flowFile.path = ppaths[ppaths.length - 1];
			} else {
				// 不包含 不是在文件夹中的文件
				ret.setItem(flowFile.relativePath, flowFile);
			}
		});
		for (var i = 0, len = ret.items.length, k, v, ppaths; i < len; i++) {
			k = ret.items[i];
			v = ret.getItem(k);
			if (v.constructor == HashMap) {
				// 文件夹
				ppaths = parsePaths(k);
				if (ppaths[0] && ppaths[0] !== k) {
					ret.getItem(ppaths[0]).setItem(k, v);
					if (ret.delItem(k)) {
						i--;
						len--;
					}
				}
			}
		}
	}

	function HashMap() {
		this.items = [];
		this.itemsObj = {};
	}

	HashMap.prototype = {

		constructor: HashMap,

		setItem: function(item, obj) {
			if (!this.itemsObj[item] && this.itemsObj[item] !== obj) {
				this.itemsObj[item] = obj;
				this.items.push(item);
			}
			return this;
		},

		getItem: function(k) {
			return this.itemsObj[k];
		},

		removeItem: function(v) {
			var ret = false;
			each(this.items, function(k1, i) {
				if (this.itemsObj[k1] === v) {
					delete this.itemsObj[k1];
					this.items.splice(i , 1);
					ret = true;
				}
			}, this);
			return ret;
		},

		delItem: function(k) {
			var ret = false;
			each(this.items, function(k1, i) {
				if (k1 === k) {
					delete this.itemsObj[k];
					this.items.splice(i , 1);
					ret = true;
				}
			}, this);
			return ret;
		}

	};

	// 得到hashmap中所有的flowfile
	function getFlowFilesByHM(hashmap, folderObj) {
		var ret = [];
		each(hashmap.items, function(k) {
			var v = hashmap.getItem(k);
			if (v.constructor == HashMap) {
				ret.push.apply(ret, getFlowFilesByHM(v, folderObj));
			} else {
				// 是否在folder中
				folderObj && (v.folderObj = folderObj);
				ret.push(v);
			}
		});
		return ret;
	}

	// 得到hashmap中所有的paths信息
	// 以便用于先上传文件夹的path信息
	function getFolderPaths(items, rObj) {
		var ret = [];
		if (!rObj) rObj = {};
		each(items, function(k) {
			if (!rObj[k]) {
				var paths = parsePaths(k);
				each(paths, function(path) {
					if (!rObj[path]) {
						rObj[path] = 1;
						ret.push(path);
					}
				});
				rObj[k] = 1;
			}
		});
		return ret;
	}



/**
	 * FlowFolder class
	 * @name FlowFolder
	 * @param {Flow} flowObj
	 * @param {hashMap} 文件夹数据 hashMap
	 * @param {pathname} 文件夹名字(带/) 'rootPath/'
	 * @constructor
	 */
	function FlowFolder(flowObj, hashMap, pathname) {
		
		/**
		 * Reference to parent Flow instance
		 * @type {Flow}
		 */
		this.flowObj = flowObj;

		this.name = pathname.substr(0, pathname.length - 1);

		this.isFolder = true;

		this.averageSpeed = 0;

		this.allPathsKV = {};

		var allPaths = getFolderPaths(hashMap.items);

		allPaths.sort();

		var that = this;
		this.flowObj.opts.getFolderTarget(allPaths, this, function(data) {
			that.setGotTarget(data);
			that.files.forEach(function(v) {
				v.target = v.flowObj.opts.parseTarget(v.flowObj.opts.target, v);
			});
			that.resume();
		});

		/**
		 * 包含的files
		 * @type {Array}
		 */
		this.files = getFlowFilesByHM(hashMap, this);

		// 先让文件夹下的所有文件暂停
		// 等待得到路径信息得到后再上传resume
		this.pause();

	}

	FlowFolder.prototype = {

		/**
		 * Returns a boolean indicating whether or not the instance is currently
		 * uploading anything.
		 * @function
		 * @returns {boolean}
		 */
		isUploading: function () {

			var uploading = false;
			if (!this.isPaused() && !this.isComplete()) {
				return true
			}
			return uploading
			each(this.files, function (file) {
				if (file.isUploading()) {
					uploading = true;
					return false;
				}
			});
			return uploading;
		},

		isComplete: function () {
			var isComplete = true;
			each(this.files, function (file) {
				if (!file.isComplete()) {
					isComplete = false;
					return false;
				}
			});
			return isComplete;
		},

		isMaxSized: function() {
			var nmaxSized = false;
			each(this.files, function (file) {
				if (!file.maxSized) {
					nmaxSized = true;
					return false;
				}
			});
			return !nmaxSized;
		},

		hasError: function() {
			var nerr = false;
			each(this.files, function (file) {
				if (!file.error) {
					nerr = true;
					return false;
				}
			});
			return !nerr;
		},

		isPaused: function() {
			var paused = false;
			each(this.files, function (file) {
				if (file.paused) {
					paused = true;
					return false;
				}
			});
			return paused;
		},

		isStarted: function() {
			var started = false;
			each(this.files, function (file) {
				if (file.started) {
					started = true;
					return false;
				}
			});
			return started;
		},

		/**
		 * Retry aborted file upload
		 * @function
		 */
		retry: function () {
			each(this.files, function (file) {
				file.bootstrap();
			});
			this.flowObj.upload();
		},

		
		setGotTarget: function(data) {
			var allPathsKV = this.allPathsKV;
			each(data, function(v, key) {
				allPathsKV[key] = v;
			});
		},

		/**
		 * Resume uploading.
		 * @function
		 */
		resume: function () {
			each(this.files, function (file) {
				file.resume();
			});
		},

		/**
		 * Pause uploading.
		 * @function
		 */
		pause: function () {
			each(this.files, function (file) {
				file.pause();
			});
		},

		/**
		 * Cancel upload of all FlowFile objects and remove them from the list.
		 * @function
		 */
		cancel: function () {
			for (var i = this.files.length - 1; i >= 0; i--) {
				this.files[i].cancel(true);
			}
			this.flowObj.removeParsedFile(this);
		},

		/**
		 * Returns a number between 0 and 1 indicating the current upload progress
		 * of all files.
		 * @function
		 * @returns {number}
		 */
		progress: function () {
			var totalDone = 0;
			var totalSize = 0;
			// Resume all chunks currently being uploaded
			each(this.files, function (file) {
				totalDone += file.progress() * file.size;
				totalSize += file.size;
			});
			return totalSize > 0 ? totalDone / totalSize : 
							this.isComplete() ? 1 : 0;;
		},

		/**
		 * Returns the total size of all files in bytes.
		 * @function
		 * @returns {number}
		 */
		getSize: function () {
			var totalSize = 0;
			each(this.files, function (file) {
				totalSize += file.size;
			});
			return totalSize;
		},

		/**
		 * Returns the total size uploaded of all files in bytes.
		 * @function
		 * @returns {number}
		 */
		sizeUploaded: function () {
			var size = 0;
			each(this.files, function (file) {
				size += file.sizeUploaded();
			});
			return size;
		},

		// 平均速度
		aSpeed: function() {
			if (this.isComplete()) return 0;
			if (this.spt && this.averageSpeed) return this.averageSpeed;
			var that = this;
			if (this.spt) clearTimeout(this.spt);
			this.spt = setTimeout(function() {
				that.spt = null;
			}, 500);
			var averageSpeeds = [0];
			each(this.files, function (file) {
				if (!file.paused && !file.error) {
					averageSpeeds.push(file.aSpeed() || 0)
				}
			});
			var averageSpeed = Math.max.apply(Math, averageSpeeds);
			this.averageSpeed = averageSpeed || this.averageSpeed;
			return this.averageSpeed;
		},

		/**
		 * Returns remaining time to upload all files in seconds. Accuracy is based on average speed.
		 * If speed is zero, time remaining will be equal to positive infinity `Number.POSITIVE_INFINITY`
		 * @function
		 * @returns {number}
		 */
		timeRemaining: function () {
			var sizeDelta = 0;
			var averageSpeed = 0;
			each(this.files, function (file) {
				if (!file.paused && !file.error) {
					sizeDelta += file.size - file.sizeUploaded();
					averageSpeed += file.aSpeed();
				}
			});
			if (sizeDelta && !averageSpeed) {
				return Number.POSITIVE_INFINITY;
			}
			if (!sizeDelta && !averageSpeed) {
				return 0;
			}
			return Math.floor(sizeDelta / averageSpeed);
		}

	};







	/**
	 * FlowFile class
	 * @name FlowFile
	 * @param {Flow} flowObj
	 * @param {File} file
	 * @constructor
	 */
	function FlowFile(flowObj, file) {

		/**
		 * Reference to parent Flow instance
		 * @type {Flow}
		 */
		this.flowObj = flowObj;

		/**
		 * Reference to file
		 * @type {File}
		 */
		this.file = file;

		/**
		 * File name. Some confusion in different versions of Firefox
		 * @type {string}
		 */
		this.name = file.fileName || file.name;

		/**
		 * File size
		 * @type {number}
		 */
		this.size = file.size;

		/**
		 * Relative file path
		 * @type {string}
		 */
		this.relativePath = file.relativePath || file.webkitRelativePath || this.name;

		/**
		 * File unique identifier
		 * @type {string}
		 */
		this.uniqueIdentifier = flowObj.generateUniqueIdentifier(file);

		/**
		 * List of chunks
		 * @type {Array.<FlowChunk>}
		 */
		this.chunks = [];

		/**
		 * Indicated if file is paused
		 * @type {boolean}
		 */
		this.paused = false;

		/**
		 * Indicated if file has encountered an error
		 * @type {boolean}
		 */
		this.error = false;

		/**
		 * Average upload speed
		 * @type {number}
		 */
		this.averageSpeed = 0;

		/**
		 * Current upload speed
		 * @type {number}
		 */
		this.currentSpeed = 0;

		/**
		 * Date then progress was called last time
		 * @type {number}
		 * @private
		 */
		this._lastProgressCallback = Date.now();

		/**
		 * Previously uploaded file size
		 * @type {number}
		 * @private
		 */
		this._prevUploadedSize = 0;

		/**
		 * Holds previous progress
		 * @type {number}
		 * @private
		 */
		this._prevProgress = 0;

		this.target = this.flowObj.opts.parseTarget(this.flowObj.opts.target, this);

		this.bootstrap();
	}

	FlowFile.prototype = {

		hasError: function() {
			return this.error
		},
		/**
		 * Update speed parameters
		 * @link http://stackoverflow.com/questions/2779600/how-to-estimate-download-time-remaining-accurately
		 * @function
		 */
		measureSpeed: function () {
			var timeSpan = Date.now() - this._lastProgressCallback;
			if (!timeSpan) {
				return ;
			}
			var smoothingFactor = this.flowObj.opts.speedSmoothingFactor;
			var uploaded = this.sizeUploaded();
			// Prevent negative upload speed after file upload resume
			this.currentSpeed = Math.max((uploaded - this._prevUploadedSize) / timeSpan * 1000, 0);
			this.averageSpeed = smoothingFactor * this.currentSpeed + (1 - smoothingFactor) * this.averageSpeed;
			this._prevUploadedSize = uploaded;
		},

		aSpeed: function() {
			if (this.isComplete()) return 0;
			if (this.spt && this.averageSpeed) return this.averageSpeed;
			var that = this;
			if (this.spt) clearTimeout(this.spt);
			this.spt = setTimeout(function() {
				that.spt = null;
			}, 500);
			this.measureSpeed();
			return this.averageSpeed;
		},

		/**
		 * For internal usage only.
		 * Callback when something happens within the chunk.
		 * @function
		 * @param {string} event can be 'progress', 'success', 'error' or 'retry'
		 * @param {string} [message]
		 */
		chunkEvent: function (event, message) {
			switch (event) {
				case 'progress':
					if (Date.now() - this._lastProgressCallback <
						this.flowObj.opts.progressCallbacksInterval) {
						break;
					}
					this.measureSpeed();
					this.flowObj.fire('fileProgress', this);
					this.flowObj.fire('progress');
					this._lastProgressCallback = Date.now();
					break;
				case 'error':
					this.error = true;
					this.abort(true);
					this.flowObj.fire('fileError', this, message);
					this.flowObj.fire('error', message, this);
					break;
				case 'success':
					if (this.error) {
						return;
					}
					this.measureSpeed();
					this.flowObj.fire('fileProgress', this);
					this.flowObj.fire('progress');
					this._lastProgressCallback = Date.now();
					if (this.isComplete()) {
						this.currentSpeed = 0;
						this.averageSpeed = 0;
						this.flowObj.fire('fileSuccess', this, message);
					}
					break;
				case 'retry':
					this.flowObj.fire('fileRetry', this);
					break;
			}
		},

		isPaused: function() {
			return this.paused
		},

		/**
		 * Pause file upload
		 * @function
		 */
		pause: function() {
			this.paused = true;
			this.abort();
		},

		/**
		 * Resume file upload
		 * @function
		 */
		resume: function() {
			this.paused = false;
			this.flowObj.upload();
		},

		/**
		 * Abort current upload
		 * @function
		 */
		abort: function (reset) {
			this.currentSpeed = 0;
			this.averageSpeed = 0;
			var chunks = this.chunks;
			if (reset) {
				this.chunks = [];
			}
			each(chunks, function (c) {
				if (c.status() === 'uploading') {
					c.abort();
					this.flowObj.uploadNextChunk();
				}
			}, this);
		},

		/**
		 * Cancel current upload and remove from a list
		 * @function
		 */
		cancel: function (iFolder) {
			this.flowObj.removeFile(this);
			if (!iFolder) {
				this.flowObj.removeParsedFile(this);
			}
		},

		/**
		 * Retry aborted file upload
		 * @function
		 */
		retry: function () {
			this.bootstrap();
			this.flowObj.upload();
		},

		/**
		 * Clear current chunks and slice file again
		 * @function
		 */
		bootstrap: function () {
			this.abort(true);
			if (this.size > this.flowObj.opts.maxSize) {
				this.error = true;
				this.maxSized = true;
				return;
			}
			this.error = false;	
			// Rebuild stack of chunks from file
			this._prevProgress = 0;
			var round = this.flowObj.opts.forceChunkSize ? Math.ceil : Math.floor;
			var chunks = Math.max(
				round(this.file.size / this.flowObj.opts.chunkSize), 1
			);
			for (var offset = 0; offset < chunks; offset++) {
				this.chunks.push(
					new FlowChunk(this.flowObj, this, offset)
				);
			}
		},

		/**
		 * Get current upload progress status
		 * @function
		 * @returns {number} from 0 to 1
		 */
		progress: function () {
			if (this.error) {
				return 1;
			}
			if (this.chunks.length === 1) {
				this._prevProgress = Math.max(this._prevProgress, this.chunks[0].progress());
				return this._prevProgress;
			}
			// Sum up progress across everything
			var bytesLoaded = 0;
			each(this.chunks, function (c) {
				// get chunk progress relative to entire file
				bytesLoaded += c.progress() * (c.endByte - c.startByte);
			});
			var percent = bytesLoaded / this.size;
			// We don't want to lose percentages when an upload is paused
			this._prevProgress = Math.max(this._prevProgress, percent > 0.999 ? 1 : percent);
			return this._prevProgress;
		},

		/**
		 * Indicates if file is being uploaded at the moment
		 * @function
		 * @returns {boolean}
		 */
		isUploading: function () {
			var uploading = false;
			each(this.chunks, function (chunk) {
				if (chunk.status() === 'uploading') {
					uploading = true;
					return false;
				}
			});
			return uploading;
		},

		isMaxSized: function() {
			return !!this.maxSized
		},

		isStarted: function() {
			return this.started
		},

		/**
		 * Indicates if file is has finished uploading and received a response
		 * @function
		 * @returns {boolean}
		 */
		isComplete: function () {
			var outstanding = false;
			each(this.chunks, function (chunk) {
				var status = chunk.status();
				if (status === 'pending' || status === 'uploading' || chunk.preprocessState === 1) {
					outstanding = true;
					return false;
				}
			});
			return !outstanding;
		},

		/**
		 * Count total size uploaded
		 * @function
		 * @returns {number}
		 */
		sizeUploaded: function () {
			var size = 0;
			each(this.chunks, function (chunk) {
				size += chunk.sizeUploaded();
			});
			return size;
		},

		/**
		 * Returns remaining time to finish upload file in seconds. Accuracy is based on average speed.
		 * If speed is zero, time remaining will be equal to positive infinity `Number.POSITIVE_INFINITY`
		 * @function
		 * @returns {number}
		 */
		timeRemaining: function () {
			if (this.paused || this.error) {
				return 0;
			}
			var delta = this.size - this.sizeUploaded();
			if (delta && !this.averageSpeed) {
				return Number.POSITIVE_INFINITY;
			}
			if (!delta && !this.averageSpeed) {
				return 0;
			}
			return Math.floor(delta / this.averageSpeed);
		},

		/**
		 * Get file type
		 * @function
		 * @returns {string}
		 */
		getType: function () {
			return this.file.type && this.file.type.split('/')[1];
		},

		/**
		 * Get file extension
		 * @function
		 * @returns {string}
		 */
		getExtension: function () {
			return this.name.substr((~-this.name.lastIndexOf(".") >>> 0) + 2).toLowerCase();
		}
	};








	/**
	 * Class for storing a single chunk
	 * @name FlowChunk
	 * @param {Flow} flowObj
	 * @param {FlowFile} fileObj
	 * @param {number} offset
	 * @constructor
	 */
	function FlowChunk(flowObj, fileObj, offset) {

		/**
		 * Reference to parent flow object
		 * @type {Flow}
		 */
		this.flowObj = flowObj;

		/**
		 * Reference to parent FlowFile object
		 * @type {FlowFile}
		 */
		this.fileObj = fileObj;

		/**
		 * File size
		 * @type {number}
		 */
		this.fileObjSize = fileObj.size;

		/**
		 * File offset
		 * @type {number}
		 */
		this.offset = offset;

		/**
		 * Indicates if chunk existence was checked on the server
		 * @type {boolean}
		 */
		this.tested = false;

		/**
		 * Number of retries performed
		 * @type {number}
		 */
		this.retries = 0;

		/**
		 * Pending retry
		 * @type {boolean}
		 */
		this.pendingRetry = false;

		/**
		 * Preprocess state
		 * @type {number} 0 = unprocessed, 1 = processing, 2 = finished
		 */
		this.preprocessState = 0;

		/**
		 * Bytes transferred from total request size
		 * @type {number}
		 */
		this.loaded = 0;

		/**
		 * Total request size
		 * @type {number}
		 */
		this.total = 0;

		/**
		 * Size of a chunk
		 * @type {number}
		 */
		var chunkSize = this.flowObj.opts.chunkSize;

		/**
		 * Chunk start byte in a file
		 * @type {number}
		 */
		this.startByte = this.offset * chunkSize;

		/**
		 * Chunk end byte in a file
		 * @type {number}
		 */
		this.endByte = Math.min(this.fileObjSize, (this.offset + 1) * chunkSize);

		/**
		 * XMLHttpRequest
		 * @type {XMLHttpRequest}
		 */
		this.xhr = null;

		if (this.fileObjSize - this.endByte < chunkSize &&
				!this.flowObj.opts.forceChunkSize) {
			// The last chunk will be bigger than the chunk size,
			// but less than 2*chunkSize
			this.endByte = this.fileObjSize;
		}

		var $ = this;

		/**
		 * Catch progress event
		 * @param {ProgressEvent} event
		 */
		this.progressHandler = function(event) {
			if (event.lengthComputable) {
				$.loaded = event.loaded ;
				$.total = event.total;
			}
			$.fileObj.chunkEvent('progress');
		};

		/**
		 * Catch test event
		 * @param {Event} event
		 */
		this.testHandler = function(event) {
			var status = $.status();
			if (status === 'success') {
				$.tested = true;
				$.fileObj.chunkEvent(status, $.message());
				$.flowObj.uploadNextChunk();
			} else if (!$.fileObj.paused) {// Error might be caused by file pause method
				$.tested = true;
				$.send();
			}
		};

		/**
		 * Upload has stopped
		 * @param {Event} event
		 */
		this.doneHandler = function(event) {
			var status = $.status();
			if (status === 'success' || status === 'error') {
				$.fileObj.chunkEvent(status, $.message());
				$.flowObj.uploadNextChunk();
			} else {
				$.fileObj.chunkEvent('retry', $.message());
				$.pendingRetry = true;
				$.abort();
				$.retries++;
				var retryInterval = $.flowObj.opts.chunkRetryInterval;
				if (retryInterval !== null) {
					setTimeout(function () {
						$.send();
					}, retryInterval);
				} else {
					$.send();
				}
			}
		};
	}

	FlowChunk.prototype = {
		/**
		 * Get params for a request
		 * @function
		 */
		getParams: function () {
			return {
				flowChunkNumber: this.offset + 1,
				flowChunkSize: this.flowObj.opts.chunkSize,
				flowCurrentChunkSize: this.endByte - this.startByte,
				flowTotalSize: this.fileObjSize,
				flowIdentifier: this.fileObj.uniqueIdentifier,
				flowFilename: this.fileObj.name,
				flowRelativePath: this.fileObj.relativePath,
				flowTotalChunks: this.fileObj.chunks.length
			};
		},

		/**
		 * Get target option with query params
		 * @function
		 * @param params
		 * @returns {string}
		 */
		getTarget: function(params, target){
			if(target.indexOf('?') < 0) {
				target += '?';
			} else {
				target += '&';
			}
			return target + params.join('&');
		},

		/**
		 * Makes a GET request without any data to see if the chunk has already
		 * been uploaded in a previous session
		 * @function
		 */
		test: function () {
			// Set up request and listen for event
			this.xhr = new XMLHttpRequest();
			this.xhr.addEventListener("load", this.testHandler, false);
			this.xhr.addEventListener("error", this.testHandler, false);
			var data = this.prepareXhrRequest('GET');
			this.xhr.send(data);
		},

		/**
		 * Finish preprocess state
		 * @function
		 */
		preprocessFinished: function () {
			this.preprocessState = 2;
			this.send();
		},

		/**
		 * Uploads the actual data in a POST call
		 * @function
		 */
		send: function () {
			var preprocess = this.flowObj.opts.preprocess;
			this.fileObj.started = true;
			if (typeof preprocess === 'function') {
				switch (this.preprocessState) {
					case 0:
						preprocess(this);
						this.preprocessState = 1;
						return;
					case 1:
						return;
					case 2:
						break;
				}
			}
			if (this.flowObj.opts.testChunks && !this.tested) {
				this.test();
				return;
			}

			this.loaded = 0;
			this.total = 0;
			this.pendingRetry = false;

			var func = (this.fileObj.file.slice ? 'slice' :
				(this.fileObj.file.mozSlice ? 'mozSlice' :
					(this.fileObj.file.webkitSlice ? 'webkitSlice' :
						'slice')));
			var bytes = this.fileObj.file[func](this.startByte, this.endByte, this.fileObj.file.type);

			// Set up request and listen for event
			this.xhr = new XMLHttpRequest();
			this.xhr.upload.addEventListener('progress', this.progressHandler, false);
			this.xhr.addEventListener("load", this.doneHandler, false);
			this.xhr.addEventListener("error", this.doneHandler, false);

			var data = this.prepareXhrRequest('POST', this.flowObj.opts.method, bytes);

			this.xhr.send(data);
		},

		/**
		 * Abort current xhr request
		 * @function
		 */
		abort: function () {
			// Abort and reset
			var xhr = this.xhr;
			this.xhr = null;
			if (xhr) {
				xhr.abort();
			}
		},

		/**
		 * Retrieve current chunk upload status
		 * @function
		 * @returns {string} 'pending', 'uploading', 'success', 'error'
		 */
		status: function () {
			if (this.pendingRetry) {
				// if pending retry then that's effectively the same as actively uploading,
				// there might just be a slight delay before the retry starts
				return 'uploading';
			} else if (!this.xhr) {
				return 'pending';
			} else if (this.xhr.readyState < 4) {
				// Status is really 'OPENED', 'HEADERS_RECEIVED'
				// or 'LOADING' - meaning that stuff is happening
				return 'uploading';
			} else {
				if (this.xhr.status == 200) {
					// HTTP 200, perfect
					return 'success';
				} else if (this.flowObj.opts.permanentErrors.indexOf(this.xhr.status) > -1 ||
						this.retries >= this.flowObj.opts.maxChunkRetries) {
					// HTTP 415/500/501, permanent error
					return 'error';
				} else {
					// this should never happen, but we'll reset and queue a retry
					// a likely case for this would be 503 service unavailable
					this.abort();
					return 'pending';
				}
			}
		},

		/**
		 * Get response from xhr request
		 * @function
		 * @returns {String}
		 */
		message: function () {
			return this.xhr ? this.xhr.responseText : '';
		},

		/**
		 * Get upload progress
		 * @function
		 * @returns {number}
		 */
		progress: function () {
			if (this.pendingRetry) {
				return 0;
			}
			var s = this.status();
			if (s === 'success' || s === 'error') {
				return 1;
			} else if (s === 'pending') {
				return 0;
			} else {
				return this.total > 0 ? this.loaded / this.total : 0;
			}
		},

		/**
		 * Count total size uploaded
		 * @function
		 * @returns {number}
		 */
		sizeUploaded: function () {
			var size = this.endByte - this.startByte;
			// can't return only chunk.loaded value, because it is bigger than chunk size
			if (this.status() !== 'success') {
				size = this.progress() * size;
			}
			return size;
		},

		/**
		 * Prepare Xhr request. Set query, headers and data
		 * @param {string} method GET or POST
		 * @param {string} [paramsMethod] octet or form
		 * @param {Blob} [blob] to send
		 * @returns {FormData|Blob|Null} data to send
		 */
		prepareXhrRequest: function(method, paramsMethod, blob) {
			// Add data from the query options
			var query = this.flowObj.opts.query;
			if (typeof query === "function") {
				query = query(this.fileObj, this);
			}
			query = extend(this.getParams(), query);

			var target = this.fileObj.target;
			var data = null;
			if (method === 'GET' || paramsMethod === 'octet') {
				// Add data from the query options
				var params = [];
				each(query, function (v, k) {
					params.push([encodeURIComponent(k), encodeURIComponent(v)].join('='));
				});
				target = this.getTarget(params, target);
				data = blob || null;
			} else {
				// Add data from the query options
				data = new FormData();
				each(query, function (v, k) {
					data.append(k, v);
				});
				data.append(this.flowObj.opts.fileParameterName, blob, this.fileObj.file.name);
			}

			this.xhr.open(method, target);
			this.xhr.withCredentials = this.flowObj.opts.withCredentials;

			// Add data from header options
			each(this.flowObj.opts.headers, function (v, k) {
				this.xhr.setRequestHeader(k, v);
			}, this);

			return data;
		}
	};

	/**
	 * Remove value from array
	 * @param array
	 * @param value
	 */
	function arrayRemove(array, value) {
		var index = array.indexOf(value);
		if (index > -1) {
			array.splice(index, 1);
		}
	}

	 /**
		* Execute function asynchronously
		* @param fn
		* @param context
		*/
	function async(fn, context) {
		setTimeout(fn.bind(context), 0);
	}

	/**
	 * Extends the destination object `dst` by copying all of the properties from
	 * the `src` object(s) to `dst`. You can specify multiple `src` objects.
	 * @function
	 * @param {Object} dst Destination object.
	 * @param {...Object} src Source object(s).
	 * @returns {Object} Reference to `dst`.
	 */
	function extend(dst, src) {
		each(arguments, function(obj) {
			if (obj !== dst) {
				each(obj, function(value, key){
					dst[key] = value;
				});
			}
		});
		return dst;
	}
	Flow.extend = extend;

	/**
	 * Iterate each element of an object
	 * @function
	 * @param {Array|Object} obj object or an array to iterate
	 * @param {Function} callback first argument is a value and second is a key.
	 * @param {Object=} context Object to become context (`this`) for the iterator function.
	 */
	function each(obj, callback, context) {
		if (!obj) {
			return ;
		}
		var key;
		// Is Array?
		if (typeof(obj.length) !== 'undefined') {
			for (key = 0; key < obj.length; key++) {
				if (callback.call(context, obj[key], key) === false) {
					return ;
				}
			}
		} else {
			for (key in obj) {
				if (obj.hasOwnProperty(key) && callback.call(context, obj[key], key) === false) {
					return ;
				}
			}
		}
	}
	Flow.each = each;

	/**
	 * FlowFile constructor
	 * @type {FlowFile}
	 */
	Flow.FlowFile = FlowFile;

	/**
	 * FlowFile constructor
	 * @type {FlowChunk}
	 */
	Flow.FlowChunk = FlowChunk;

	/**
	 * Library version
	 * @type {string}
	 */
	Flow.version = '2.1.0';

	if ( typeof module === "object" && module && typeof module.exports === "object" ) {
		// Expose Flow as module.exports in loaders that implement the Node
		// module pattern (including browserify). Do not create the global, since
		// the user will be storing it themselves locally, and globals are frowned
		// upon in the Node module world.
		module.exports = Flow;
	} else {
		// Otherwise expose Flow to the global object as usual
		window.Flow = Flow;

		// Register as a named AMD module, since Flow can be concatenated with other
		// files that may use define, but not via a proper concatenation script that
		// understands anonymous AMD modules. A named AMD is safest and most robust
		// way to register. Lowercase flow is used because AMD module names are
		// derived from file names, and Flow is normally delivered in a lowercase
		// file name. Do this after creating the global so that if an AMD module wants
		// to call noConflict to hide this version of Flow, it will work.
		if ( typeof define === "function" && define.amd ) {
			define( "flow", [], function () { return Flow; } );
		}
	}
})(window, document);
