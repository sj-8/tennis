<template>
  <view class="container">
    <view class="form-group">
      <view class="form-item">
        <text class="label">头像</text>
        <view class="avatar-wrapper" @click="handleAvatarClick">
          <image class="avatar" v-if="userInfo.avatar" :src="userInfo.avatar" mode="aspectFill"></image>
          <view class="avatar placeholder" v-else>
            <text class="placeholder-text">{{ (userInfo.name || 'U').charAt(0).toUpperCase() }}</text>
          </view>
          <!-- <text class="arrow">></text> -->
        </view>
      </view>

      <view class="form-item">
        <text class="label">昵称</text>
        <input class="input" v-model="editForm.name" placeholder="请输入昵称" @blur="saveName" />
      </view>

      <view class="form-item">
        <text class="label">性别</text>
        <picker @change="handleGenderChange" :value="genderIndex" :range="genderOptions">
          <view class="picker-value">
            {{ userInfo.gender || '未设置' }}
            <!-- <text class="arrow">></text> -->
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">地区</text>
        <picker @change="handleRegionChange" :value="cityIndex" :range="jiangsuCities">
          <view class="picker-value">
            {{ userInfo.region ? '江苏省 ' + userInfo.region : '未设置' }}
            <!-- <text class="arrow">></text> -->
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">出生年月</text>
        <picker mode="date" @change="handleBirthdayChange" :value="userInfo.birthday || '2000-01-01'">
          <view class="picker-value">
            {{ formatDate(userInfo.birthday) || '未设置' }}
            <!-- <text class="arrow">></text> -->
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">年龄</text>
        <text class="value">{{ calculateAge(userInfo.birthday) }}</text>
      </view>
      
      <view class="form-item" @click="copyOpenId">
        <text class="label">OpenID</text>
        <text class="value sm">{{ truncateString(userInfo.openid) }}</text>
        <text class="copy-btn">复制</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { request, updateProfile } from '../../api';

const userInfo = ref<any>({});
const genderOptions = ['男', '女'];
const jiangsuCities = ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'];
const editForm = ref({ name: '' });

const genderIndex = computed(() => {
  if (!userInfo.value || !userInfo.value.gender) return 0;
  return genderOptions.indexOf(userInfo.value.gender);
});

const cityIndex = computed(() => {
  if (!userInfo.value || !userInfo.value.region) return 0;
  return jiangsuCities.indexOf(userInfo.value.region);
});

onMounted(() => {
  const info = uni.getStorageSync('userInfo');
  if (info) {
    userInfo.value = info;
    editForm.value.name = info.name || '';
  }
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateAge = (birthday: string) => {
  if (!birthday) return '未知';
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age + '岁';
};

const truncateString = (str: string) => {
  if (!str) return '';
  if (str.length <= 10) return str;
  return str.substring(0, 6) + '...' + str.substring(str.length - 4);
};

const copyOpenId = () => {
  if (userInfo.value?.openid) {
    uni.setClipboardData({
      data: userInfo.value.openid,
      success: () => uni.showToast({ title: '已复制' })
    });
  }
};

const saveName = async () => {
  if (!editForm.value.name || editForm.value.name === userInfo.value.name) return;
  try {
    const res = await updateProfile(userInfo.value.id, { name: editForm.value.name });
    userInfo.value = res;
    uni.setStorageSync('userInfo', res);
  } catch (err) {
    console.error(err);
  }
};

const handleGenderChange = async (e: any) => {
  const gender = genderOptions[e.detail.value];
  try {
    const res = await updateProfile(userInfo.value.id, { gender });
    userInfo.value = res;
    uni.setStorageSync('userInfo', res);
  } catch (err) {
    console.error(err);
  }
};

const handleRegionChange = async (e: any) => {
  const region = jiangsuCities[e.detail.value];
  try {
    const res = await updateProfile(userInfo.value.id, { region });
    userInfo.value = res;
    uni.setStorageSync('userInfo', res);
  } catch (err) {
    console.error(err);
  }
};

const handleBirthdayChange = async (e: any) => {
  const birthday = e.detail.value;
  try {
    const res = await updateProfile(userInfo.value.id, { birthday });
    userInfo.value = res;
    uni.setStorageSync('userInfo', res);
  } catch (err) {
    console.error(err);
  }
};

const handleAvatarClick = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res: any) => {
      const tempFilePath = res.tempFilePaths[0];
      const ext = tempFilePath.split('.').pop() || 'jpg';
      const cloudPath = `avatars/${userInfo.value.openid}_${Date.now()}.${ext}`;
      
      uni.showLoading({ title: '上传中...' });
      // @ts-ignore
      wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
        success: async (uploadRes: any) => {
          try {
             const updateRes = await updateProfile(userInfo.value.id, { avatar: uploadRes.fileID });
             userInfo.value = updateRes;
             uni.setStorageSync('userInfo', updateRes);
             uni.showToast({ title: '已更新' });
          } catch (err) {
             uni.showToast({ title: '保存失败', icon: 'none' });
          }
        },
        complete: () => uni.hideLoading()
      });
    }
  });
};
</script>

<style>
.container { padding: 10px; background-color: #f5f5f5; min-height: 100vh; }
.form-group { background: #fff; border-radius: 10px; overflow: hidden; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f5f5f5; }
.form-item:last-child { border-bottom: none; }
.label { font-size: 16px; color: #333; }
.value { font-size: 16px; color: #666; }
.value.sm { font-size: 12px; }
.input { text-align: right; font-size: 16px; color: #333; }
.avatar-wrapper { display: flex; align-items: center; }
.avatar { width: 50px; height: 50px; border-radius: 50%; margin-right: 10px; }
.avatar.placeholder { background: #eee; display: flex; align-items: center; justify-content: center; color: #999; font-weight: bold; font-size: 20px; }
.arrow { color: #ccc; margin-left: 5px; font-family: monospace; }
.picker-value { display: flex; align-items: center; color: #666; font-size: 16px; }
.copy-btn { font-size: 12px; color: #3C6382; background: #e3f2fd; padding: 2px 6px; border-radius: 4px; margin-left: 10px; }
</style>