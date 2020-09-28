import Vue from 'vue'
import App from './App.vue'
import iView from 'iview'
import AMap from 'vue-amap'
import 'iview/dist/styles/iview.css'

Vue.config.productionTip = false
Vue.use(iView)
Vue.use(AMap)

AMap.initAMapApiLoader({
  // 高德的key
  key: '7333fda4f079977bb5596730631c7075',
  // 插件集合
  plugin: ['AMapManager', 'AMap.Autocomplete', 'AMap.PlaceSearch', 'AMap.Scale', 'AMap.OverView', 'AMap.ToolBar', 'AMap.MapType', 'AMap.PolyEditor', 'AMap.CircleEditor','Geocoder','Geolocation', 'AMap.MarkerClusterer','AMap.PolyEditor', 'AMap.CircleEditor', 'AMap.MouseTool', 'AMap.Driving', 'AMap.CitySearch', 'AMap.InfoWindow', 'AMap.LngLat', 'AMap.DistrictSearch', 'AMap.TileLayer.Traffic', 'AMap.Heatmap', 'AMap.Autocomplete', 'AMap.PlaceSearch'],
  // 高德 sdk 版本，默认为 1.4.4
  v: '1.4.4'
})

new Vue({
  render: h => h(App),
}).$mount('#app')
