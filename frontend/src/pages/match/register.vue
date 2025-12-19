<template>
  <view class="container">
    <view class="header">
      <text class="title">赛事报名</text>
    </view>

    <view class="form-group">
      <text class="label">真实姓名</text>
      <input class="input" v-model="form.realName" placeholder="请输入真实姓名" />
    </view>

    <view class="form-group">
      <text class="label">身份证号</text>
      <input class="input" v-model="form.idCard" type="idcard" placeholder="请输入身份证号" />
    </view>

    <view class="form-group">
      <text class="label">手机号码</text>
      <input class="input" v-model="form.phone" type="number" placeholder="请输入手机号码" />
    </view>

    <view class="form-group">
      <text class="label">个人简介</text>
      <textarea class="textarea" v-model="form.bio" placeholder="选填：球龄、水平等级等" />
    </view>

    <button class="btn-submit" @click="submit" :loading="loading">提交报名</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { submitApplication } from '../../api';

const loading = ref(false);
const tournamentId = ref<number | null>(null);
const form = ref({
  realName: '',
  idCard: '',
  phone: '',
  bio: ''
});

onLoad((options: any) => {
  if (options.id) {
    tournamentId.value = Number(options.id);
  }
});

const submit = async () => {
  if (!form.value.realName || !form.value.idCard || !form.value.phone) {
    uni.showToast({ title: '请填写必填项', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    const userInfo = uni.getStorageSync('userInfo');
    if (!userInfo || !userInfo.id) {
        uni.showToast({ title: '请先登录', icon: 'none' });
        // In real app, trigger login flow
        return;
    }

    await submitApplication({
      playerId: userInfo.id,
      tournamentId: tournamentId.value,
      ...form.value
    });
    
    uni.showToast({ title: '报名提交成功' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err) {
    uni.showToast({ title: '提交失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};
</script>

<style>
.container { padding: 20px; }
.header { margin-bottom: 20px; text-align: center; }
.title { font-size: 20px; font-weight: bold; }
.form-group { margin-bottom: 15px; }
.label { display: block; margin-bottom: 8px; font-weight: bold; font-size: 14px; }
.input { width: 100%; height: 44px; padding: 0 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background: #fff; }
.textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background: #fff; }
.btn-submit { background: #2e7d32; color: white; padding: 12px; border-radius: 4px; text-align: center; margin-top: 30px; font-size: 16px; }
</style>
