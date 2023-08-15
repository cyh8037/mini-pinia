### pinia

#### 注入

```js
app.provide(piniaSymbol, pinia);
app.config.globalProperties.$pinia = pinia;
```

#### 响应式

采用`effectScope`，可以随时通过`.stop`终止响应式

#### 扁平化管理

单例模式，只会创建一个 pinia 实例对象，store 是一个 map 对象，通过 id 管理不同的子 store
