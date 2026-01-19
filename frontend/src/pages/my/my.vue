<template>
  <view class="container">
    <view class="header tennis-court-bg">
      <view class="user-info" v-if="userInfo">
        <view class="avatar-container">
          <image class="avatar" v-if="userInfo.avatar" :src="userInfo.avatar" mode="aspectFill"></image>
          <view class="avatar placeholder" v-else>
            <text class="placeholder-text">{{ (userInfo.name || 'U').charAt(0).toUpperCase() }}</text>
          </view>
        </view>
        <view class="info-content">
          <view class="name-row">
            <text class="nickname">{{ userInfo.name || '微信用户' }}</text>
          </view>
          <view class="role-badge" v-if="userInfo.role === 'ADMIN'">
            <text class="role-text">管理员</text>
          </view>
        </view>
      </view>
      <view class="user-info" v-else @click="handleLogin">
        <view class="avatar placeholder">
          <text class="placeholder-text">?</text>
        </view>
        <text class="login-tip">点击登录</text>
      </view>
    </view>

    <!-- My Orders Section -->
    <view class="section order-section">
      <view class="section-header">
        <text class="section-title">我的订单</text>
      </view>
      <view class="order-grid">
        <view class="order-item">
          <text class="order-icon">🛒</text>
          <text class="order-label">待支付</text>
        </view>
        <view class="order-item">
          <text class="order-icon">🎫</text>
          <text class="order-label">已支付</text>
        </view>
        <view class="order-item">
          <text class="order-icon">📦</text>
          <text class="order-label">全部</text>
        </view>
      </view>
    </view>

    <!-- Basic Functions List -->
    <view class="section menu-section">
      <view class="section-header">
        <text class="section-title">基础功能</text>
      </view>
      
      <view class="menu-list">
        <view class="menu-item" @click="navigateTo('/pages/my/profile')">
          <view class="menu-left">
            <text class="menu-icon">👤</text>
            <text class="menu-text">个人信息</text>
          </view>
          <!-- <text class="arrow">></text> Removed arrow -->
        </view>
        
        <view class="menu-item" @click="navigateTo('/pages/my/records')">
          <view class="menu-left">
            <text class="menu-icon">📋</text>
            <text class="menu-text">参赛记录</text>
          </view>
          <!-- <text class="arrow">></text> -->
        </view>
        
        <view class="menu-item" @click="navigateTo('/pages/my/auth')">
          <view class="menu-left">
            <text class="menu-icon">🛡️</text>
            <text class="menu-text">实名认证</text>
          </view>
          <view class="menu-right">
             <text class="status-verified" v-if="userInfo && (userInfo.isVerified || userInfo.idCard)">已实名</text>
             <!-- <text class="arrow" v-else>></text> -->
          </view>
        </view>
        
        <view class="menu-item" @click="handleLogout" v-if="userInfo">
          <view class="menu-left">
            <text class="menu-icon">🔴</text>
            <text class="menu-text">退出登录</text>
          </view>
          <!-- <text class="arrow">></text> -->
        </view>
      </view>
    </view>

    <view class="section tips-section" v-if="userInfo">
      <text class="tips-title">💡 管理员通道</text>
      <view class="cell" @click="copyOpenId">
        <text class="label">我的 OpenID</text>
        <text class="value">{{ truncateString(userInfo.openid) }}</text>
        <text class="action">复制</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request, updateProfile } from '../../api';

const userInfo = ref<any>(null);

const checkLogin = () => {
  /**
   * 检查本地登录状态
   * 从 Storage 读取用户信息，如果存在则自动登录
   */
  const info = uni.getStorageSync('userInfo');
  if (info) {
    userInfo.value = info;
  } else {
    userInfo.value = null;
  }
};

const handleLogin = () => {
  /**
   * 处理登录逻辑
   * 1. 调用 uni.login 获取微信 Code
   * 2. 将 Code 发送给后端进行登录/注册
   * 3. 保存后端返回的 Token 和用户信息
   */
  uni.showLoading({ title: '登录中...' });
  
  // 1. Get Code
  uni.login({
    provider: 'weixin',
    success: (loginRes: any) => {
      console.log('Login res:', loginRes);
      
      // 2. Call backend login
      request({
        url: '/auth/login',
        method: 'POST',
        data: {
          code: loginRes.code
        }
      }).then((res: any) => {
        console.log('Backend login res:', res);
        if (res.token && res.player) {
          uni.setStorageSync('token', res.token);
          uni.setStorageSync('userInfo', res.player);
          userInfo.value = res.player;
          uni.showToast({ title: '登录成功' });
        } else {
          uni.showToast({ title: '登录失败', icon: 'none' });
        }
      }).catch(err => {
        console.error('Login error:', err);
        uni.showToast({ title: '登录出错', icon: 'none' });
      }).finally(() => {
        uni.hideLoading();
      });
    },
    fail: (err: any) => {
      console.error('uni.login fail:', err);
      uni.showToast({ title: '无法获取登录授权', icon: 'none' });
      uni.hideLoading();
    }
  });
};

const handleLogout = () => {
  // 退出登录：清除本地存储并重置状态
  uni.removeStorageSync('userInfo');
  uni.removeStorageSync('token');
  userInfo.value = null;
  uni.showToast({ title: '已退出' });
};

const navigateTo = (url: string) => {
  uni.navigateTo({ url });
};

const copyOpenId = () => {
  // 复制 OpenID 到剪贴板，方便用户设置管理员
  if (userInfo.value?.openid) {
    uni.setClipboardData({
      data: userInfo.value.openid,
      success: () => {
        uni.showToast({ title: 'OpenID 已复制' });
      }
    });
  }
};

const truncateString = (str: string) => {
  // 截断长字符串，只显示前6位和后4位
  if (!str) return '';
  if (str.length <= 10) return str;
  return str.substring(0, 6) + '...' + str.substring(str.length - 4);
};

const handleAvatarClick = () => {
  // 以前是点击上传，现在点击跳转到个人信息页面
  navigateTo('/pages/my/profile');
};

onShow(() => {
  checkLogin();
});
</script>

<style>
.container { padding: 0; background-color: #f5f5f5; min-height: 100vh; }
.header { 
  padding: 40px 20px; 
  border-bottom-left-radius: 20px; 
  border-bottom-right-radius: 20px; 
  box-shadow: 0 4px 10px rgba(58, 95, 11, 0.3);
  color: white;
  display: flex;
  align-items: center;
}
.user-info { display: flex; align-items: center; gap: 15px; }
.avatar-container {
  position: relative;
  width: 80px;
  height: 80px;
}
.avatar { 
  width: 100%; 
  height: 100%; 
  border-radius: 50%; 
  border: 3px solid white; 
  background: #fff; 
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
.edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: #FFD700;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}
.edit-icon { font-size: 14px; }

.name-row { display: flex; align-items: center; margin-bottom: 5px; height: 32px; }
.nickname { font-size: 20px; font-weight: bold; color: white; display: flex; align-items: center; }
.edit-hint { font-size: 14px; margin-left: 8px; opacity: 0.8; }
.name-input { 
  background: rgba(255,255,255,0.2); 
  border: 1px solid rgba(255,255,255,0.5); 
  border-radius: 4px; 
  color: white; 
  padding: 0 8px; 
  height: 28px; 
  font-size: 16px; 
  width: 150px;
}

.avatar.placeholder { display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); width: 80px; height: 80px; }
.placeholder-text { font-size: 30px; color: white; }
.info-content { display: flex; flex-direction: column; }

.role-badge { background: #FFD700; padding: 2px 8px; border-radius: 10px; align-self: flex-start; }
.role-text { color: #3A5F0B; font-size: 10px; font-weight: bold; }
.login-tip { font-size: 18px; font-weight: bold; }

.section { background: white; margin: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.cell { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; }
.cell:last-child { border-bottom: none; }
.label { font-size: 14px; color: #333; }
.value { font-size: 14px; color: #666; }
.value.highlight { color: #3A5F0B; font-weight: bold; }
.action { font-size: 12px; color: #3C6382; background: #e3f2fd; padding: 2px 8px; border-radius: 4px; }

.tips-section { padding: 15px; }
.tips-title { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; display: block; }
.tips-content { font-size: 12px; color: #666; line-height: 1.6; display: block; margin-bottom: 10px; }
.code-block { background: #333; color: #FFD700; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all; }

.btn-logout { margin: 30px 20px; background: white; color: #ff3b30; font-size: 14px; }

/* New Styles for Refactored Layout */
.order-section { margin-top: -20px; position: relative; z-index: 10; }
.section-header { padding: 15px; border-bottom: 1px solid #f0f0f0; }
.section-title { font-size: 14px; font-weight: bold; color: #333; }
.order-grid { display: flex; padding: 20px 0; }
.order-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.order-icon { font-size: 24px; }
.order-label { font-size: 12px; color: #666; }

.menu-list { display: flex; flex-direction: column; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; }
.menu-item:last-child { border-bottom: none; }
.menu-left { display: flex; align-items: center; gap: 10px; }
.menu-icon { font-size: 18px; width: 24px; text-align: center; }
.menu-text { font-size: 14px; color: #333; }
.menu-right { display: flex; align-items: center; }
.status-verified { color: #3A5F0B; font-size: 14px; font-weight: bold; margin-right: 5px; }
.arrow { color: #ccc; font-family: monospace; font-size: 14px; }
</style>
