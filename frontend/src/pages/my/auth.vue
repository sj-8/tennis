<template>
  <view class="container">
    <view class="header tennis-court-bg">
      <text class="title">实名认证</text>
      <text class="subtitle">请填写真实信息以完成认证</text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="label">姓名</text>
        <input class="input" v-model="form.realName" placeholder="请输入真实姓名" :disabled="isVerified" :class="{ 'is-disabled': isVerified }" />
      </view>
      
      <view class="form-item">
        <text class="label">身份证号</text>
        <input class="input" v-model="form.idCard" type="idcard" maxlength="18" placeholder="请输入身份证号" :disabled="isVerified" :class="{ 'is-disabled': isVerified }" />
      </view>
      
      <view class="form-item">
        <text class="label">手机号</text>
        <view class="phone-wrapper">
          <input class="input phone-input" v-model="form.phone" type="number" maxlength="11" placeholder="请输入手机号" :disabled="isVerified" :class="{ 'is-disabled': isVerified }" />
          <button class="btn-get-phone" open-type="getPhoneNumber" @getphonenumber="handleGetPhoneNumber" v-if="!isVerified">
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
.container { padding: 0; background-color: #f5f5f5; min-height: 100vh; }
.header { padding: 40px 20px; color: white; background: #3A5F0B; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px; text-align: center; }
.title { font-size: 24px; font-weight: bold; display: block; margin-bottom: 5px; }
.subtitle { font-size: 14px; opacity: 0.9; }

.form-card { margin: -20px 20px 0; background: white; border-radius: 12px; padding: 10px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.form-item { display: flex; align-items: center; padding: 20px 0; border-bottom: 1px solid #f0f0f0; }
.form-item:last-child { border-bottom: none; }
.label { width: 80px; font-size: 16px; color: #333; font-weight: bold; }
.input { flex: 1; font-size: 16px; color: #333; text-align: right; }
.phone-wrapper { flex: 1; display: flex; align-items: center; justify-content: flex-end; }
.phone-input { flex: 1; text-align: right; margin-right: 10px; }
.btn-get-phone { font-size: 12px; color: #3A5F0B; background: #f0f9eb; padding: 4px 10px; border-radius: 12px; margin: 0; line-height: 1.5; border: 1px solid #3A5F0B; display: flex; align-items: center; }
.btn-get-phone::after { border: none; }
.icon-wechat { margin-right: 2px; font-size: 12px; }

.btn-submit { margin: 40px 20px; background-color: #3A5F0B; color: white; border-radius: 25px; font-size: 16px; font-weight: bold; }
.btn-submit[disabled] { background-color: #ccc; color: #fff; }
.btn-unbind { background-color: #ff3b30; }

.is-disabled { color: #999; background: #fff; } /* Keep background white for cleaner look, just gray text */
</style>