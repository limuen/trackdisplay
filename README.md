应公司业务要求，给轨迹回放加个滚动条，一开始我采用的是高德地图的折线绘制，但是如果要加上进度条并不太不合适，拖动滚动条，点位没有恢复的API，后来决定使用巡航轨迹，巡航轨迹支持更丰富的轨迹API，使用起来也更方便。

所用技术：vue，高德地图（amap），iview-slider

绘制轨迹使用的是高德地图的 轨迹展示 功能

对应demo地址：https://lbs.amap.com/api/amap-ui/demos/amap-ui-pathsimplifier/simple-demo

进度条使用的是iview中的滑块，如果想换element或者其他的组件库的slider自行更换Slider标签即可

实现后样式：
![tarckdisplay](https://qxcx.oss-cn-hangzhou.aliyuncs.com/4571601266247_.pic_hd.jpg)

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```


