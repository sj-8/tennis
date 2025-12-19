<template>
  <view class="container">
    <view class="header tennis-court-bg">
      <view class="user-info" v-if="userInfo">
        <image class="avatar" :src="userInfo.avatar || '/static/logo.png'" mode="aspectFill"></image>
        <view class="info-content">
          <text class="nickname">{{ userInfo.name || '微信用户' }}</text>
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

    <view class="section">
      <view class="cell" @click="copyOpenId" v-if="userInfo && userInfo.openid">
        <text class="label">我的 OpenID</text>
        <text class="value">{{ truncateString(userInfo.openid) }}</text>
        <text class="action">复制</text>
      </view>
      
      <view class="cell" v-if="userInfo">
        <text class="label">当前身份</text>
        <text class="value highlight">{{ userInfo.role === 'ADMIN' ? '超级管理员' : '普通选手' }}</text>
      </view>
    </view>

    <view class="section tips-section">
      <text class="tips-title">💡 如何成为管理员？</text>
      <text class="tips-content">
        1. 复制上方的 OpenID。
        2. 登录微信云托管控制台 -> MySQL 数据库。
        3. 执行以下 SQL 命令：
      </text>
      <view class="code-block">
        <text user-select>UPDATE Player SET role = 'ADMIN' WHERE openid = '{{ userInfo?.openid || "你的OpenID" }}';</text>
      </view>
    </view>
    
    <button class="btn-logout" @click="handleLogout" v-if="userInfo">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { request } from '../../api';

const userInfo = ref<any>(null);

const checkLogin = () => {
  const info = uni.getStorageSync('userInfo');
  if (info) {
    userInfo.value = info;
  } else {
    userInfo.value = null;
  }
};

const handleLogin = () => {
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
  uni.removeStorageSync('userInfo');
  uni.removeStorageSync('token');
  userInfo.value = null;
  uni.showToast({ title: '已退出' });
};

const copyOpenId = () => {
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
  if (!str) return '';
  if (str.length <= 10) return str;
  return str.substring(0, 6) + '...' + str.substring(str.length - 4);
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
.avatar { width: 64px; height: 64px; border-radius: 50%; border: 3px solid white; background: #fff; }
.avatar.placeholder { display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); }
.placeholder-text { font-size: 30px; color: white; }
.info-content { display: flex; flex-direction: column; }
.nickname { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
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
</style>
