<script setup lang="ts">
import { onLaunch, onShow, onHide, onError, onPageNotFound } from "@dcloudio/uni-app";

// Declare wx global for TypeScript
declare const wx: any;

onLaunch(() => {
  console.log("App Launch");
  // #ifdef MP-WEIXIN
  if (!wx.cloud) {
    console.error('请使用 2.2.3 或以上的基础库以使用云能力');
  } else {
    wx.cloud.init({
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      env: 'prod-8g8j609ye88db758',
      traceUser: true,
    });
  }
  // #endif
});

onError((err) => {
  console.error('Global Error:', err);
  // Optional: Report to analytics or log service
  // uni.showToast({ title: '程序发生错误', icon: 'none' }); // Maybe too intrusive for every error?
});

onPageNotFound((res) => {
  uni.redirectTo({ url: '/pages/index/index' });
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
