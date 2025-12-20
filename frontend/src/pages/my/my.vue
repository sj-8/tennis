<template>
  <view class="container">
    <view class="header tennis-court-bg">
      <view class="user-info" v-if="userInfo">
        <view class="avatar-container" @click="handleAvatarClick">
          <image class="avatar" v-if="userInfo.avatar" :src="userInfo.avatar" mode="aspectFill"></image>
          <view class="avatar placeholder" v-else>
            <text class="placeholder-text">{{ (userInfo.name || 'U').charAt(0).toUpperCase() }}</text>
          </view>
          <view class="edit-badge" v-if="userInfo">
            <text class="edit-icon">📷</text>
          </view>
        </view>
        <view class="info-content">
          <view class="name-row">
            <input 
              v-if="isEditing" 
              class="name-input" 
              v-model="editForm.name" 
              focus
              @blur="saveName"
              placeholder="请输入昵称"
            />
            <text v-else class="nickname" @click="startEditName">{{ userInfo.name || '微信用户' }} <text class="edit-hint">✎</text></text>
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
import { request, updateProfile } from '../../api';

const userInfo = ref<any>(null);
const isEditing = ref(false);
const editForm = ref({
  name: '',
  avatar: ''
});

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

const startEditName = () => {
  if (!userInfo.value) return;
  editForm.value.name = userInfo.value.name || '';
  isEditing.value = true;
};

const saveName = async () => {
  if (!editForm.value.name || editForm.value.name === userInfo.value.name) {
    isEditing.value = false;
    return;
  }
  
  try {
    const res = await updateProfile(userInfo.value.id, { name: editForm.value.name });
    userInfo.value = res;
    uni.setStorageSync('userInfo', res);
    uni.showToast({ title: '昵称已更新' });
  } catch (err) {
    console.error(err);
    uni.showToast({ title: '更新失败', icon: 'none' });
  } finally {
    isEditing.value = false;
  }
};

const handleAvatarClick = () => {
  if (!userInfo.value) return;
  
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      const tempFilePath = res.tempFilePaths[0];
      
      // Check size (1MB = 1048576 bytes)
      const size = res.tempFiles[0].size;
      if (size > 1048576) {
        uni.showToast({ title: '图片不能超过1MB', icon: 'none' });
        return;
      }
      
      uni.showLoading({ title: '上传中...' });
      
      uni.getFileSystemManager().readFile({
        filePath: tempFilePath,
        encoding: 'base64',
        success: async (readRes: any) => {
          const base64 = 'data:image/jpeg;base64,' + readRes.data;
          try {
             // 检查 base64 长度，如果太长可能会导致请求失败
             console.log('Avatar Base64 length:', base64.length);
             const updateRes = await updateProfile(userInfo.value.id, { avatar: base64 });
             userInfo.value = updateRes;
             uni.setStorageSync('userInfo', updateRes);
             uni.showToast({ title: '头像已更新' });
          } catch (err) {
             console.error('Upload avatar error:', err);
             uni.showToast({ title: '上传失败', icon: 'none' });
          } finally {
             uni.hideLoading();
          }
        },
        fail: (err: any) => {
            console.error('Read file failed:', err);
            uni.hideLoading();
            uni.showToast({ title: '读取图片失败', icon: 'none' });
        }
      });
    }
  });
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
</style>
