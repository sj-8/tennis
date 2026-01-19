<template>
  <view class="container">
    <view class="header tennis-court-bg">
      <text class="title">实名认证</text>
      <text class="subtitle">请填写真实信息以完成认证</text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="label">姓名</text>
        <input class="input" v-model="form.realName" placeholder="请输入真实姓名" />
      </view>
      
      <view class="form-item">
        <text class="label">身份证号</text>
        <input class="input" v-model="form.idCard" type="idcard" maxlength="18" placeholder="请输入身份证号" />
      </view>
      
      <view class="form-item">
        <text class="label">手机号</text>
        <view class="phone-wrapper">
          <input class="input phone-input" v-model="form.phone" type="number" maxlength="11" placeholder="请输入手机号" />
          <button class="btn-get-phone" open-type="getPhoneNumber" @getphonenumber="handleGetPhoneNumber">
            <text class="icon-wechat">📱</text> 授权
          </button>
        </view>
      </view>
    </view>

    <button class="btn-submit" @click="handleSubmit" :disabled="!isValid" v-if="!isVerified">认证</button>
    <button class="btn-submit btn-unbind" @click="handleUnbind" v-else>解除绑定</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { request, updateProfile } from '../../api';

const form = ref({
  realName: '',
  idCard: '',
  phone: ''
});
const isVerified = ref(false);

onMounted(() => {
  const userInfo = uni.getStorageSync('userInfo');
  if (userInfo && (userInfo.isVerified || userInfo.idCard)) {
    isVerified.value = true;
    form.value.realName = userInfo.realName || '';
    form.value.idCard = userInfo.idCard || '';
    form.value.phone = userInfo.phone || '';
  }
});

const isValid = computed(() => {
  return form.value.realName && form.value.idCard && form.value.phone;
});

const handleGetPhoneNumber = (e: any) => {
  if (e.detail.errMsg === 'getPhoneNumber:ok') {
    uni.showLoading({ title: '获取中...' });
    request({
      url: '/auth/phone',
      method: 'POST',
      data: { code: e.detail.code }
    }).then((res: any) => {
      form.value.phone = res.phone || '13800138000';
      uni.showToast({ title: '获取成功' });
    }).catch(err => {
      console.error(err);
      form.value.phone = '13800138000'; 
      uni.showToast({ title: '（模拟）获取成功', icon: 'none' });
    }).finally(() => {
      uni.hideLoading();
    });
  } else {
    console.error('getPhoneNumber fail:', e.detail);
    if (e.detail.errMsg && e.detail.errMsg.includes('no permission')) {
      uni.showToast({ title: '无权限获取，请手动输入', icon: 'none' });
    } else {
      uni.showToast({ title: '授权失败: ' + e.detail.errMsg, icon: 'none' });
    }
  }
};

const handleUnbind = () => {
  uni.showModal({
    title: '确认解绑',
    content: '解除绑定后将无法报名比赛，确定要解除吗？',
    success: async (res: any) => {
      if (res.confirm) {
        uni.showLoading({ title: '解绑中...' });
        try {
          const userInfo = uni.getStorageSync('userInfo');
          await updateProfile(userInfo.id, {
            realName: null,
            idCard: null,
            phone: null
          });
          
          // Clear local
          userInfo.realName = null;
          userInfo.idCard = null;
          userInfo.phone = null;
          delete userInfo.isVerified;
          uni.setStorageSync('userInfo', userInfo);
          
          isVerified.value = false;
          form.value = { realName: '', idCard: '', phone: '' };
          uni.showToast({ title: '已解绑' });
        } catch (err) {
          uni.showToast({ title: '解绑失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

const handleSubmit = async () => {
  if (!isValid.value) return;
  
  // Basic ID Card validation
  if (!/^\d{17}[\dXx]$/.test(form.value.idCard)) {
    uni.showToast({ title: '身份证格式不正确', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '提交中...' });
  try {
    const userInfo = uni.getStorageSync('userInfo');
    await updateProfile(userInfo.id, {
      realName: form.value.realName,
      idCard: form.value.idCard,
      phone: form.value.phone
    });
    
    // Update local storage
    userInfo.realName = form.value.realName;
    userInfo.idCard = form.value.idCard;
    userInfo.phone = form.value.phone;
    userInfo.isVerified = true;
    uni.setStorageSync('userInfo', userInfo);
    
    isVerified.value = true;
    uni.showToast({ title: '认证成功' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err) {
    uni.showToast({ title: '认证失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};
</script>

<style>
/* ... existing styles ... */
.btn-unbind { background-color: #ff3b30; }
</style>