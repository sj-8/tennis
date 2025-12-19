<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
/* Global Styles */
page {
  background-color: #f8f8f8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  /* 网球主题变量 */
  --tennis-yellow: #FFD700;
  --tennis-green: #3A5F0B;
  --tennis-green-light: #4E7A12;
}

/* 网球场地背景纹理 */
.tennis-court-bg {
  background-color: var(--tennis-green);
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.1) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 2px, transparent 2px);
  background-size: 50px 50px;
  position: relative;
}

/* 按钮悬停交互效果 */
button {
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}

button:active {
  transform: scale(0.96);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

/* 标题旁的装饰线 */
.tennis-title-deco {
  display: inline-block;
  width: 8px;
  height: 24px;
  background-color: var(--tennis-yellow);
  margin-right: 8px;
  border-radius: 4px;
  vertical-align: middle;
}
</style>
