<template>
  <div class="map-outbox">
    <!-- 地图 -->
    <div id="container"></div>
    <!-- 进度条 -->
    <div class="map-control">
      <Icon
        v-if="!isPlay"
        class="play-icon"
        type="ios-play"
        @click="isPlay=true;navgControl(playIcon)"
      />
      <Icon v-else class="play-icon" type="ios-pause" @click="isPlay=false;navgControl('pause')" />
      <span class="passed-time">{{passedTime}}</span>
      <Slider class="map-slider" v-model="sliderVal" :tip-format="hideFormat" :step="0.0001"></Slider>
      <div class="map-times" @mouseenter="isTimesChoose=true" @mouseleave="isTimesChoose=false">
        <div class="times-show">倍速 {{times}}</div>
        <div class="choose-box">
          <ul v-show="isTimesChoose">
            <li
              v-for="item in speedList"
              :key="item"
              :class="{active:times===item}"
              @click="changeSpeed(item)"
            >倍速 {{item}}</li>
          </ul>
        </div>
      </div>
      <span class="passed-time">{{totalTime}}</span>
    </div>
  </div>
</template>

<script>
import { linePath, marks } from "./index.js";
import car from "../assets/car.png";

export default {
  name: "HelloWorld",
  data() {
    return {
      map: null,
      isOnSlider: false, //是否为手动鼠标拉动进度条
      playIcon: "resume", //开始按钮是重新开始还是继续
      isTimesChoose: false, //选择速度弹窗的open/close
      passedTime: "00:00:00", //已经走了的时间
      totalTime: "00:00:00", //已经走了的时间
      isPlay: false, //是否为播放
      sliderVal: 0, //进度条滑动速度
      speed: 100, //初始速度，km、h
      times: 1, //几倍速度播放
      navgtr: null, //巡航器
      speedList: [8, 4, 2, 1],
      pathList: [],
      trackList: []
    };
  },
  mounted() {
    let param = {
      resizeEnable: true,
      zoom: 15
    };
    this.map = new AMap.Map("container", param);
    this.init();
  },
  methods: {
    init() {
      // 创建起始和经过的icon
      let iconList = [];
      marks.forEach(item => {
        this.addMarker(item);
      });

      // 轨迹
      let trackList = linePath;
      let len = trackList.length;
      let startPoint = trackList[0];
      let endPoint = trackList[len - 1];
      this.pathList.splice(0, this.pathList.length);
      trackList.forEach(item => {
        this.pathList.push([item.longitude, item.latitude]);
        item.stampTime = new Date(item.time).getTime(); //当前时间戳
      });
      // 下一段路程经历了多少s,intervalTime,nextDistance:下一段路程：m,nextDistance:下一段路速度：km/h
      trackList.forEach((item, i) => {
        let next = trackList[i + 1];
        if (next) {
          item.intervalTime = (next.stampTime - item.stampTime) / 1000;
          item.nextDistance = this.distanceFun(
            [item.longitude, item.latitude],
            [next.longitude, next.latitude]
          );
          item.nextSpeed =
            item.nextDistance / 1000 / (item.intervalTime / 60 / 60);
        }
      });
      // 订单记录总时间，hh:mm:ss
      this.totalTime = this.getTime(
        (endPoint.stampTime - startPoint.stampTime) / 1000
      );
      this.trackList = trackList;
      this.setPath();
      this.drag();
    },
    setPath() {
      let that = this;

      AMapUI.load(["ui/misc/PathSimplifier", "lib/$"], function(
        PathSimplifier
      ) {
        if (!PathSimplifier.supportCanvas) {
          console.log("当前环境不支持 Canvas！");
          return;
        }
        let trackList = that.trackList;
        let len = trackList.length;
        let startPoint = trackList[0];
        let endPoint = trackList[len - 1];
        // 轨迹总数
        function onload() {
          that.pathSimplifierIns.renderLater();
        }
        function onerror() {
          infoContent;
          console.log("图片加载失败！");
        }

        // 历史轨迹巡航器
        that.pathSimplifierIns = new PathSimplifier({
          zIndex: 100,
          //autoSetFitView:false,
          map: that.map, //所属的地图实例

          getPath: function(pathData) {
            return pathData.path;
          },
          getHoverTitle: function(pathData) {
            return pathData.index;
          },
          autoSetFitView: true,
          // 巡航器样式
          renderOptions: {
            pathNavigatorStyle: {
              initRotateDegree: 0,
              width: 20,
              height: 32,
              autoRotate: true,
              lineJoin: "round",
              content: PathSimplifier.Render.Canvas.getImageContent(
                car,
                onload,
                onerror
              ),
              fillStyle: null,
              strokeStyle: null,
              lineWidth: 1,
              pathLinePassedStyle: {
                lineWidth: 6,
                strokeStyle: "#2cdf4d"
              }
            },
            pathLineStyle: {
              lineWidth: 6,
              strokeStyle: "#2e9c08"
            },
            pathLineHoverStyle: {
              lineWidth: 0,
              borderWidth: 0
            },
            pathLineSelectedStyle: {
              lineWidth: 6,
              borderWidth: 0,
              strokeStyle: "#2e9c08"
            },
            pathTolerance: 0,
            keyPointTolerance: -1,
            renderAllPointsIfNumberBelow: 0 //绘制路线节点，如不需要可设置为-1
          }
        });

        //历史轨迹巡航器设置数据
        that.pathSimplifierIns.setData([
          {
            name: "轨迹",
            path: that.pathList
          }
        ]);
        that.pathSimplifierIns.setFitView(-1);

        let startSpeed = that.speedFun(
          that.pathList[0],
          that.pathList[1],
          startPoint.intervalTime
        );
        startSpeed === 0 && (startSpeed = 0.1);

        //对第一条线路（即索引 0）创建一个巡航器
        that.navgtr = that.pathSimplifierIns.createPathNavigator(0, {
          loop: false, //循环播放
          speed: startSpeed * that.times //巡航速度，单位千米/小时
        });
        console.log(startPoint);
        //构建自定义信息窗体
        let infoContent = `<p class="info-window">时间：<span>${startPoint.time} `;
        let infoWindow = new AMap.InfoWindow({
          anchor: "bottom-center",
          content: infoContent
        });

        infoWindow.open(that.map, that.pathList[0]);
        // 移动过程中
        that.navgtr.on("move", function() {
          that.playIcon = "resume";
          let idx = this.getCursor().idx; //走到了第几个点
          let tail = this.getCursor().tail; //至下一个节点的比例位置
          let totalIdx = idx + tail;

          // 计算下一个距离速度
          let point = trackList[idx];
          if (idx < len - 1) {
            point.nextSpeed === 0 && (point.nextSpeed = 0.1);
            that.navgtr.setSpeed(point.nextSpeed * that.times);
          }

          // 剩余公里数，窗体随时移动展示
          point &&
            point.time &&
            infoWindow.setContent(
              `<p class="info-window">时间：<span>${point.time}`
            );
          infoWindow.open(that.map, that.navgtr.getPosition());
          // 进度条实时展示tail
          !that.isOnSlider && (that.sliderVal = (totalIdx / len) * 100);
          // 已经播放时间
          // let sTime = (pointObj.stampTime-startStampTime)/1000;
          let sTime = parseInt(
            (((endPoint.stampTime - startPoint.stampTime) / 1000) *
              that.sliderVal) /
              100
          );

          that.passedTime = that.getTime(sTime);
          // 如果到头了，回到初始状态
          if (that.navgtr.isCursorAtPathEnd()) {
            that.playIcon = "start";
            that.isPlay = false;
            that.sliderVal = 100;
            that.passedTime = that.totalTime;
          }
        });

        that.navgtr.on("start resume", function() {
          that.navgtr._startTime = Date.now();
          that.navgtr._startDist = this.getMovedDistance();
        });
        that.navgtr.on("stop pause", function() {
          that.navgtr._movedTime = Date.now() - that.navgtr._startTime;
          that.navgtr._movedDist =
            this.getMovedDistance() - that.navgtr._startDist;
        });
      });
    },
    // 开始、暂停、继续等操作
    navgControl(action) {
      if (action === "start") {
        let that = this;
        this.sliderVal = 0;
        this.passedTime = "00:00:00";
        setTimeout(() => {
          that.navgtr[action]();
        }, 300);
      } else {
        this.navgtr[action]();
      }
    },
    // 格式化时间
    getTime(sTime) {
      let ss;
      let mm = "00";
      let hh = "00";
      if (sTime > 60) {
        let s = sTime % 60;
        ss = s > 9 ? s : "0" + s;
        let mTime = parseInt(sTime / 60);
        if (mTime > 60) {
          let m = mTime % 60;
          mm = m > 9 ? m : "0" + m;
          hh = parseInt(mTime / 60);
        } else {
          mm = mTime > 9 ? mTime : "0" + mTime;
        }
      } else {
        ss = sTime > 9 ? sTime : "0" + sTime;
      }
      return hh + ":" + mm + ":" + ss;
    },
    hideFormat() {
      return null;
    },
    // 计算两个坐标点之间的距离
    distanceFun(point1, point2) {
      // point1:[longitude,latitude]
      let p1 = new AMap.LngLat(point1[0], point1[1]);
      let p2 = new AMap.LngLat(point2[0], point2[1]);
      let distance = Math.round(p1.distance(p2));
      return distance;
    },
    speedFun(point1, point2, time) {
      // point1,point2:经纬度数组，time:时间，s
      let distance = this.distanceFun(point1, point2);
      if (distance === 0) {
        return 0;
      } else {
        let speed = distance / 1000 / (time / 60 / 60);
        // speed:km/h
        return speed;
      }
    },
    drag(isRemove) {
      let that = this;
      let el = document.getElementsByClassName("ivu-slider-button-wrap")[0];
      let el2 = document.getElementsByClassName("ivu-slider-wrap")[0];

      if (isRemove) {
        el && el.removeEventListener("mousedown", that.openSlider, false);
        document.removeEventListener("mouseup", that.closeSlider, false);
        el2 && el2.removeEventListener("click", that.sliderChange, false);
        return false;
      }
      el2.addEventListener("click", that.sliderChange, false);
      el.addEventListener("mousedown", that.openSlider, false);
      // 此处用document是因为，滑动较为随意时，mouseup可能不是作用在el上
      document.addEventListener("mouseup", that.closeSlider, false);
    },
    openSlider() {
      this.isOnSlider = true;
    },
    closeSlider() {
      this.isOnSlider = false;
    },
    // 修改倍速
    changeSpeed(times) {
      this.isTimesChoose = false;
      this.times = times;
    },
    sliderChange(val) {
      let newVal = typeof newVal === "number" ? val : this.sliderVal;
      let num = parseInt((newVal / 100) * this.pathList.length);
      let decimal =
        String((newVal / 100) * this.pathList.length).split(".")[1] || 0;
      this.navgtr.moveToPoint(num, Number("0." + decimal));
      this.pathSimplifierIns.renderLater();
    },
    addMarker(item) {
      let marker = new AMap.Marker({
        icon:
          "//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png",
        position: [item.longitude, item.latitude],
        offset: new AMap.Pixel(-13, -30)
      });
      marker.setMap(this.map);
    },
    // 新增假如当前是子组件关闭的时候判断是播放还是其他状态，防止setSpeed报错null
    cancelsubmitfotm() {
      if (this.isPlay === true) {
        this.isPlay = false;
        this.navgControl("pause");
      }
      this.navgtr = null;
      this.drag(true);
      this.$emit("handleqktraV2IdId", this.traV2Id);
      this.dialogFormVisible = false;
    }
  },
  beforeDestroy() {
    this.navgtr = null;
    this.drag(true);
  },
  watch: {
    sliderVal(newVal) {
      if (!this.isOnSlider) {
        return false;
      }
      this.sliderChange(newVal);
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.map-outbox {
  width: 1240px;
  padding: 20px;
  border: 1px solid #ddd;
  margin: auto;
}
#container {
  width: 1200px;
  height: 600px;
}
.amap-info-close {
  display: none;
}
.info-window span {
  color: #2e75f1;
}
.ivu-slider-bar {
  color: #fff;
  background: #fff;
  transition: all 0.2s linear;
}
.ivu-slider-button-wrap {
  transition: all 0.2s linear;
  top: -5px;
}
.ivu-slider-wrap {
  background-color: rgba(255, 255, 255, 0.5);
}
.ivu-slider-button {
  border: none;
  box-shadow: 0 0 0 3.5px rgba(230, 230, 230, 0.4);
}
.order-map,
.map-outbox {
  position: relative;
  min-height: 70vh;
}
.color-tag {
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 200;
  font-size: 14px;
}
.color-tag li {
  display: inline-block;
  border-radius: 4px;
  width: 100px;
  height: 36px;
  line-height: 36px;
  text-align: center;
  background-color: #fff;
  cursor: pointer;
  margin-right: 2px;
}
.color-tag li.color-org {
  background-color: #ff8533;
  color: #fff;
}
.color-tag li.color-green {
  background-color: #46c51a;
  color: #fff;
}
.map-control {
  position: absolute;
  bottom: 0;
  width: 100%;
  left: 0;
  z-index: 200;
  height: 80px;
  line-height: 80px;
  color: #fff;
  background-image: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  padding: 0 40px;
}
.play-icon {
  font-size: 36px;
}
.map-slider {
  display: inline-block;
  width: 75%;
  margin-left: 15px;
  position: relative;
  top: 14px;
}
.passed-time {
  position: relative;
  top: 2px;
  display: inline-block;
  margin-left: 15px;
  font-size: 14px;
}
.map-times {
  display: inline-block;
  position: relative;
  margin-left: 15px;
}
.map-times .times-show {
  padding: 0 10px;
  line-height: 24px;
  font-size: 13px;
  border: 1px solid #fff;
  border-radius: 4px;
  cursor: default;
}
.map-times .choose-box {
  position: absolute;
  top: -135px;
  left: -6px;
  height: 162px;
  transition: all 0.5s linear;
}
.map-times ul {
  background: rgba(0, 0, 0, 0.7);
  padding: 10px;
  width: 70px;
  text-align: center;
  border-radius: 3px;
}
.map-times li {
  height: 26px;
  line-height: 26px;
  cursor: pointer;
}
.map-times li.active {
  color: #ff8533;
}
.map-times li:hover {
  font-size: 13px;
}
/* .marker {
  position: absolute;
  top: -20px;
  right: -118px;
  color: #fff;
  padding: 4px 10px;
  box-shadow: 1px 1px 1px rgba(10, 10, 10, 0.2);
  white-space: nowrap;
  font-size: 12px;
  font-family: "";
  background-color: #25a5f7;
  border-radius: 3px;
} */
.amap-icon img {
  width: 25px;
  height: 34px;
}
</style>
