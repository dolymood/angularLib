angularLib
==========

## angular为基础的一些组件封装

> 依赖于angular requireJS（AMD写法）

> src下的：
>> `lang.js`: 做了一些基对angular的扩展

>> `browserPrefix.js`: 浏览器前缀的一些检测

### 目前主要包含的组件有：

> `deledates`: angular的事件代理

> `dialog`: dialog弹框
>> `confirm`: 基于dialog的confirm框

> `flow`: 文件上传（对于支持文件夹上传的浏览器会将文件夹整合到一块，看起来可以是一个文件夹在上传）

> `imageViewer`: 多个图片预览查看，支持鼠标键盘快捷键切换，可拖拽图片预览（有待进一步优化）

> `keydown`: 键盘按键指令，需要在属性上指定key-code（默认13 enter键），可以指定在任意元素上（已添加tab-index）

> `mousewheel`: 鼠标滚轮指令，做了firefox兼容处理

> `placeholder`: 针对不支持placeholder的浏览器做的指令兼容

> `scrollLoad`: 滚动加载指令，也支持某一区域元素的滚动加载

> `selection`: 选择指令，选择input类元素中的内容，支持选择部分内容，通过属性指定选择区域（sln-start：开始位置-默认0，sln-end: 结束位置-默认最后末尾）

PS: 有一些是在别人的代码基础上做了修改，根据需求做了进一步的修改:

> `dialog`: [modal](https://github.com/angular-ui/bootstrap/tree/master/src/modal)

> `flow`: [ng-flow](https://github.com/flowjs/ng-flow)

> `scrollLoad`: [ngInfiniteScroll](https://github.com/sroze/ngInfiniteScroll)

> ...

暂时这么多，后续更新中...
