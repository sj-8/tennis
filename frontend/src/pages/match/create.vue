<template>
  <view class="container">
    <view class="form-group">
      <text class="label">赛事名称</text>
      <input class="input" v-model="form.name" placeholder="例如：周日公开赛" />
    </view>
    
    <view class="form-group">
      <text class="label">地点</text>
      <input class="input" v-model="form.location" placeholder="例如：1号场" />
    </view>
    
    <view class="form-group">
      <text class="label">时间</text>
      <input class="input" v-model="form.startTime" placeholder="YYYY-MM-DD HH:mm" />
    </view>

    <view class="form-group">
      <text class="label">规则</text>
      <textarea class="textarea" v-model="form.rules" placeholder="规则描述..." />
    </view>

    <button class="btn-submit" @click="submit">创建赛事</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createMatch } from '../../api';

const form = ref({
  name: '',
  location: '',
  startTime: '',
  rules: '',
  description: ''
});

const submit = async () => {
  try {
    await createMatch(form.value);
    uni.showToast({ title: '赛事已创建' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (err) {
    uni.showToast({ title: '错误', icon: 'none' });
  }
};
</script>

<style>
.container { padding: 20px; }
.form-group { margin-bottom: 15px; }
.label { display: block; margin-bottom: 5px; font-weight: bold; }
.input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
.btn-submit { background: #2e7d32; color: white; padding: 12px; border-radius: 4px; text-align: center; margin-top: 20px; }
</style>
